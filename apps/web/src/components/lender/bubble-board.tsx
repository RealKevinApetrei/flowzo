"use client";

import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import type { FilterState } from "./filter-bar";
import type { BubbleColorMode } from "@/lib/hooks/use-lender-settings";
import { resolveBubblePalette } from "@/lib/hooks/use-lender-settings";
import type { BubbleTrade } from "@/lib/hooks/use-bubble-board";
import { formatCurrency, calculateImpliedAPR } from "@flowzo/shared";

export type { BubbleTrade } from "@/lib/hooks/use-bubble-board";

/** Compact format for SVG bubble text — strips trailing .00 */
const formatShort = (pence: number) => formatCurrency(pence).replace(/\.00$/, "");

interface BubbleBoardProps {
  trades: BubbleTrade[];
  onQuickTap?: (trade: BubbleTrade, position: { x: number; y: number }) => void;
  onLongPress: (tradeId: string) => void;
  filters: FilterState;
  hudPosition?: string;
  bubbleColorMode: BubbleColorMode;
  unifiedColorHex: string;
}

const CHARGE_DURATION = 1500;

interface PhysicsNode {
  id: string;
  amount_pence: number;
  fee_pence: number;
  shift_days: number;
  risk_grade: string;
  status: string;
  borrower_name?: string;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function applyFilters(trades: BubbleTrade[], filters: FilterState): BubbleTrade[] {
  return trades.filter((t) => {
    if (filters.riskGrades.size > 0 && !filters.riskGrades.has(t.risk_grade as "A" | "B" | "C")) {
      return false;
    }
    if (t.amount_pence < filters.amountRange[0] || t.amount_pence > filters.amountRange[1]) {
      return false;
    }
    if (t.shift_days < filters.termRange[0] || t.shift_days > filters.termRange[1]) {
      return false;
    }
    return true;
  });
}

export function BubbleBoard({
  trades,
  onQuickTap,
  onLongPress,
  filters,
  bubbleColorMode,
  unifiedColorHex,
}: BubbleBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number>(0);
  const nodesRef = useRef<PhysicsNode[]>([]);
  const chargingRef = useRef<string | null>(null);
  const chargeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onQuickTapRef = useRef(onQuickTap);
  useEffect(() => {
    onQuickTapRef.current = onQuickTap;
  }, [onQuickTap]);

  const getRadius = useCallback(
    (amountPence: number, allAmounts: number[], isMobile: boolean) => {
      if (allAmounts.length === 0) return isMobile ? 24 : 35;
      const min = Math.min(...allAmounts);
      const max = Math.max(...allAmounts);
      const range = max - min || 1;
      const normalized = (amountPence - min) / range;
      const rMin = isMobile ? 18 : 26;
      const rMax = isMobile ? 32 : 45;
      return rMin + normalized * (rMax - rMin);
    },
    [],
  );

  const onLongPressRef = useRef(onLongPress);
  useEffect(() => {
    onLongPressRef.current = onLongPress;
  }, [onLongPress]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const container = svg.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const d3Svg = d3.select(svg);
    const isMobile = width < 500;
    const baseSpeed = isMobile ? 0.5 : 0.8;

    // SVG defs — recreate on color mode change
    d3Svg.select("defs").remove();
    const defs = d3Svg.append("defs");

    // Simple drop shadow filter for subtle depth
    const shadow = defs.append("filter").attr("id", "bubble-shadow").attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
    shadow.append("feDropShadow").attr("dx", "0").attr("dy", "2").attr("stdDeviation", "3").attr("flood-color", "rgba(0,0,0,0.15)");

    if (bubbleColorMode === "unified") {
      const p = resolveBubblePalette("A", "unified", unifiedColorHex);
      const grad = defs.append("radialGradient").attr("id", "grad-unified").attr("cx", "45%").attr("cy", "40%").attr("r", "55%");
      grad.append("stop").attr("offset", "0%").attr("stop-color", p.center);
      grad.append("stop").attr("offset", "100%").attr("stop-color", p.edge);
    } else {
      (["A", "B", "C"] as const).forEach((grade) => {
        const p = resolveBubblePalette(grade, "by-grade", unifiedColorHex);
        const grad = defs.append("radialGradient").attr("id", `grad-${grade}`).attr("cx", "45%").attr("cy", "40%").attr("r", "55%");
        grad.append("stop").attr("offset", "0%").attr("stop-color", p.center);
        grad.append("stop").attr("offset", "100%").attr("stop-color", p.edge);
      });
    }

    const filtered = applyFilters(trades, filters);
    const amounts = filtered.map((t) => t.amount_pence);

    // Preserve positions for existing nodes
    const existingMap = new Map(nodesRef.current.map((n) => [n.id, n]));

    const nodes: PhysicsNode[] = filtered.map((t) => {
      const radius = getRadius(t.amount_pence, amounts, isMobile);
      const existing = existingMap.get(t.id);
      if (existing) {
        return { ...t, radius, x: existing.x, y: existing.y, vx: existing.vx, vy: existing.vy };
      }
      // New node — random position and velocity
      const angle = Math.random() * 2 * Math.PI;
      const speed = baseSpeed * (0.5 + Math.random() * 1.0);
      return {
        ...t,
        radius,
        x: radius + Math.random() * (width - 2 * radius),
        y: radius + Math.random() * (height - 2 * radius),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      };
    });
    nodesRef.current = nodes;

    // Data join
    const bubbles = d3Svg
      .selectAll<SVGGElement, PhysicsNode>(".bubble")
      .data(nodes, (d) => d.id);

    bubbles.exit().transition().duration(300).style("opacity", 0).remove();

    const enter = bubbles
      .enter()
      .append("g")
      .attr("class", "bubble")
      .style("cursor", "pointer");

    // Pointer events
    enter.each(function () {
      const group = d3.select(this);
      group
        .on("pointerdown", function (event: PointerEvent) {
          event.preventDefault();
          const d = d3.select<SVGGElement, PhysicsNode>(this).datum();
          chargingRef.current = d.id;

          // Animate clip-circle from 0 to full radius
          group
            .select(".clip-circle")
            .interrupt()
            .attr("r", 0)
            .transition()
            .duration(CHARGE_DURATION)
            .ease(d3.easeLinear)
            .attr("r", d.radius);

          chargeTimerRef.current = setTimeout(() => {
            chargingRef.current = null;

            const palette = resolveBubblePalette(
              d.risk_grade as "A" | "B" | "C",
              bubbleColorMode,
              unifiedColorHex,
            );

            // Fireworks: 10 particles flying outward
            const cx = d.x;
            const cy = d.y;
            for (let i = 0; i < 10; i++) {
              const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.4;
              const dist = d.radius * 2.5;
              d3Svg
                .append("circle")
                .attr("cx", cx)
                .attr("cy", cy)
                .attr("r", 3)
                .attr("fill", palette.center)
                .attr("opacity", 0.9)
                .attr("pointer-events", "none")
                .transition()
                .duration(500)
                .ease(d3.easeCubicOut)
                .attr("cx", cx + Math.cos(angle) * dist)
                .attr("cy", cy + Math.sin(angle) * dist)
                .attr("opacity", 0)
                .remove();
            }

            // Shrink bubble to zero
            group
              .transition()
              .duration(300)
              .attr("transform", `translate(${d.x},${d.y}) scale(0)`)
              .style("opacity", 0)
              .remove();

            // Remove from physics
            nodesRef.current = nodesRef.current.filter((n) => n.id !== d.id);

            // Floating "Funded!" text
            d3Svg
              .append("text")
              .attr("x", cx)
              .attr("y", cy)
              .attr("text-anchor", "middle")
              .attr("fill", palette.center)
              .attr("font-weight", "700")
              .attr("font-size", "13px")
              .style("pointer-events", "none")
              .text("Funded!")
              .transition()
              .duration(900)
              .ease(d3.easeCubicOut)
              .attr("y", cy - 50)
              .style("opacity", 0)
              .remove();

            onLongPressRef.current(d.id);
          }, CHARGE_DURATION);
        })
        .on("pointerup pointercancel pointerleave", function (event: PointerEvent) {
          const wasCharging = chargingRef.current !== null;
          if (chargeTimerRef.current) {
            clearTimeout(chargeTimerRef.current);
            chargeTimerRef.current = null;
          }
          chargingRef.current = null;
          // Snap clip-circle back to 0
          group.select(".clip-circle").interrupt().attr("r", 0);

          // Quick tap: if was charging (pointerdown fired) and released quickly
          if (wasCharging && event.type === "pointerup" && onQuickTapRef.current) {
            const d = d3.select<SVGGElement, PhysicsNode>(this).datum();
            const trade = trades.find((t) => t.id === d.id);
            if (trade) {
              const svgRect = svg.getBoundingClientRect();
              onQuickTapRef.current(trade, {
                x: svgRect.left + d.x,
                y: svgRect.top + d.y,
              });
            }
          }
        });
    });

    const gradId = (d: PhysicsNode) => bubbleColorMode === "unified" ? "url(#grad-unified)" : `url(#grad-${d.risk_grade})`;

    // ClipPath for white radial fill per bubble
    enter.each(function (d) {
      const group = d3.select(this);
      const clip = group
        .append("clipPath")
        .attr("id", `clip-fill-${d.id}`);
      clip
        .append("circle")
        .attr("class", "clip-circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 0);
    });

    // Circle — soft gradient, drop shadow
    enter
      .append("circle")
      .attr("class", "main-circle")
      .attr("r", 0)
      .attr("fill", gradId)
      .attr("filter", "url(#bubble-shadow)")
      .transition()
      .duration(600)
      .ease(d3.easeElasticOut.amplitude(1).period(0.4))
      .attr("r", (d) => d.radius);

    // White fill overlay (clipped by expanding circle)
    enter
      .append("circle")
      .attr("class", "fill-overlay")
      .attr("r", (d) => d.radius)
      .attr("fill", "white")
      .attr("opacity", 0.35)
      .attr("clip-path", (d) => `url(#clip-fill-${d.id})`)
      .attr("pointer-events", "none");

    // Amount (line 1 — always visible)
    enter
      .append("text")
      .attr("class", "bubble-amount")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.2em")
      .attr("fill", "rgba(255,255,255,0.9)")
      .attr("font-weight", "700")
      .attr("font-size", (d) => `${Math.max(9, d.radius / 3)}px`)
      .attr("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.3)")
      .style("opacity", 0)
      .text((d) => formatShort(d.amount_pence))
      .transition()
      .delay(350)
      .duration(300)
      .style("opacity", "1");

    // Duration (line 2 — medium+ bubbles only)
    enter
      .append("text")
      .attr("class", "bubble-duration")
      .attr("text-anchor", "middle")
      .attr("dy", "0.9em")
      .attr("fill", "rgba(255,255,255,0.6)")
      .attr("font-weight", "600")
      .attr("font-size", (d) => `${Math.max(7, d.radius / 4)}px`)
      .attr("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.3)")
      .style("opacity", 0)
      .text((d) => (d.radius >= 24 ? `${d.shift_days}d` : ""))
      .transition()
      .delay(400)
      .duration(300)
      .style("opacity", "1");

    // Implied APR (line 3 — medium+ bubbles only)
    enter
      .append("text")
      .attr("class", "bubble-apr")
      .attr("text-anchor", "middle")
      .attr("dy", "1.9em")
      .attr("fill", "rgba(255,255,255,0.6)")
      .attr("font-weight", "600")
      .attr("font-size", (d) => `${Math.max(7, d.radius / 4.5)}px`)
      .attr("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.3)")
      .style("opacity", 0)
      .text((d) => (d.radius >= 24 ? `${calculateImpliedAPR(d.fee_pence, d.amount_pence, d.shift_days).toFixed(1)}%` : ""))
      .transition()
      .delay(450)
      .duration(300)
      .style("opacity", "1");

    // Merge
    const merged = enter.merge(bubbles);

    merged
      .select(".main-circle")
      .transition()
      .duration(300)
      .attr("r", (d) => d.radius)
      .attr("fill", gradId)
      .attr("filter", "url(#bubble-shadow)");

    merged
      .select(".fill-overlay")
      .attr("r", (d) => d.radius);

    merged
      .select(".bubble-amount")
      .text((d) => formatShort(d.amount_pence))
      .attr("font-size", (d) => `${Math.max(9, d.radius / 3)}px`);

    merged
      .select(".bubble-duration")
      .text((d) => (d.radius >= 24 ? `${d.shift_days}d` : ""))
      .attr("font-size", (d) => `${Math.max(7, d.radius / 4)}px`);

    merged
      .select(".bubble-apr")
      .text((d) => (d.radius >= 24 ? `${calculateImpliedAPR(d.fee_pence, d.amount_pence, d.shift_days).toFixed(1)}%` : ""))
      .attr("font-size", (d) => `${Math.max(7, d.radius / 4.5)}px`);

    // ---------- Billiard-ball physics via RAF ----------
    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.67, 3);
      lastTime = now;
      const ns = nodesRef.current;

      // Move
      for (const n of ns) {
        n.x += n.vx * dt;
        n.y += n.vy * dt;

        // Wall bounce
        if (n.x - n.radius < 0) {
          n.x = n.radius;
          n.vx = Math.abs(n.vx);
        }
        if (n.x + n.radius > width) {
          n.x = width - n.radius;
          n.vx = -Math.abs(n.vx);
        }
        if (n.y - n.radius < 0) {
          n.y = n.radius;
          n.vy = Math.abs(n.vy);
        }
        if (n.y + n.radius > height) {
          n.y = height - n.radius;
          n.vy = -Math.abs(n.vy);
        }
      }

      // Elastic ball-ball collision
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i],
            b = ns[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = a.radius + b.radius;

          if (dist < minDist && dist > 0.01) {
            const nx = dx / dist;
            const ny = dy / dist;
            const dvx = a.vx - b.vx;
            const dvy = a.vy - b.vy;
            const dvn = dvx * nx + dvy * ny;

            if (dvn > 0) {
              const ma = a.radius * a.radius;
              const mb = b.radius * b.radius;
              const imp = (2 * dvn) / (ma + mb);

              a.vx -= imp * mb * nx;
              a.vy -= imp * mb * ny;
              b.vx += imp * ma * nx;
              b.vy += imp * ma * ny;

              const overlap = minDist - dist;
              const sep = overlap / 2 + 0.5;
              a.x -= sep * nx;
              a.y -= sep * ny;
              b.x += sep * nx;
              b.y += sep * ny;
            }
          }
        }
      }

      // Update SVG
      merged.attr("transform", (d) => `translate(${d.x},${d.y})`);

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [trades, filters, getRadius, bubbleColorMode, unifiedColorHex]);

  return (
    <div className="w-full h-full overflow-hidden">
      {trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-text-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mb-3 text-text-muted" aria-label="No bubbles"><circle cx="12" cy="10" r="6"/><circle cx="19" cy="16" r="3"/><circle cx="6" cy="18" r="2"/></svg>
          <p className="text-sm font-medium">No active trade requests</p>
          <p className="text-xs text-text-muted mt-1">
            Bubbles will appear when borrowers request shifts
          </p>
        </div>
      ) : (
        <svg ref={svgRef} className="w-full h-full" />
      )}
    </div>
  );
}
