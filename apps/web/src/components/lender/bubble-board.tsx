"use client";

import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import type { FilterState } from "./filter-bar";
import type { BubbleColorMode } from "@/lib/hooks/use-lender-settings";
import { resolveBubblePalette } from "@/lib/hooks/use-lender-settings";
import type { BubbleTrade } from "@/lib/hooks/use-bubble-board";
import { formatCurrency } from "@flowzo/shared";

export type { BubbleTrade } from "@/lib/hooks/use-bubble-board";

/** Compact format for SVG bubble text — strips trailing .00 */
const formatShort = (pence: number) => formatCurrency(pence).replace(/\.00$/, "");

interface BubbleBoardProps {
  trades: BubbleTrade[];
  onQuickTap: (trade: BubbleTrade, position: { x: number; y: number }) => void;
  onLongPress: (tradeId: string) => void;
  filters: FilterState;
  bubbleColorMode: BubbleColorMode;
  unifiedColorHex: string;
}

const CHARGE_DURATION = 500;

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

  const onQuickTapRef = useRef(onQuickTap);
  const onLongPressRef = useRef(onLongPress);
  useEffect(() => {
    onQuickTapRef.current = onQuickTap;
    onLongPressRef.current = onLongPress;
  }, [onQuickTap, onLongPress]);

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

          const circum = 2 * Math.PI * (d.radius + 4);
          group
            .select(".charge-ring")
            .attr("r", d.radius + 4)
            .attr("stroke-dasharray", `${circum}`)
            .attr("stroke-dashoffset", `${circum}`)
            .style("opacity", 1)
            .transition()
            .duration(CHARGE_DURATION)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", "0");

          group.select(".highlight-ring").style("opacity", 0.6);

          chargeTimerRef.current = setTimeout(() => {
            chargingRef.current = null;
            group.select(".charge-ring").transition().duration(200).style("opacity", 0);
            group.select(".highlight-ring").style("opacity", 0);
            onLongPressRef.current(d.id);
          }, CHARGE_DURATION);
        })
        .on("pointerup", function (event: PointerEvent) {
          const d = d3.select<SVGGElement, PhysicsNode>(this).datum();
          if (chargeTimerRef.current) {
            clearTimeout(chargeTimerRef.current);
            chargeTimerRef.current = null;
          }
          group.select(".charge-ring").interrupt().style("opacity", 0);
          group.select(".highlight-ring").style("opacity", 0);

          if (chargingRef.current === d.id) {
            chargingRef.current = null;
            const trade = filtered.find((t) => t.id === d.id);
            if (trade) {
              onQuickTapRef.current(trade, { x: event.clientX, y: event.clientY });
            }
          }
        })
        .on("pointercancel pointerleave", function () {
          if (chargeTimerRef.current) {
            clearTimeout(chargeTimerRef.current);
            chargeTimerRef.current = null;
          }
          chargingRef.current = null;
          group.select(".charge-ring").interrupt().style("opacity", 0);
          group.select(".highlight-ring").style("opacity", 0);
        });
    });

    const gradId = (d: PhysicsNode) => bubbleColorMode === "unified" ? "url(#grad-unified)" : `url(#grad-${d.risk_grade})`;

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

    // Highlight ring
    enter
      .append("circle")
      .attr("class", "highlight-ring")
      .attr("r", (d) => d.radius + 2)
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 2.5)
      .style("opacity", 0)
      .attr("pointer-events", "none");

    // Charging ring
    enter
      .append("circle")
      .attr("class", "charge-ring")
      .attr("r", (d) => d.radius + 4)
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 3)
      .attr("stroke-linecap", "round")
      .style("opacity", 0)
      .attr("pointer-events", "none")
      .attr("transform", "rotate(-90)");

    // Risk grade label (always visible)
    enter
      .append("text")
      .attr("class", "bubble-grade")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => `${-d.radius * 0.35}px`)
      .attr("fill", "rgba(255,255,255,0.6)")
      .attr("font-weight", "800")
      .attr("font-size", (d) => `${Math.max(7, d.radius / 4.5)}px`)
      .attr("pointer-events", "none")
      .attr("letter-spacing", "0.05em")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.3)")
      .style("opacity", 0)
      .text((d) => d.risk_grade)
      .transition()
      .delay(250)
      .duration(300)
      .style("opacity", "1");

    // Borrower name (only on bubbles large enough)
    enter
      .append("text")
      .attr("class", "bubble-name")
      .attr("text-anchor", "middle")
      .attr("dy", "0.05em")
      .attr("fill", "white")
      .attr("font-weight", "600")
      .attr("font-size", (d) => `${Math.max(8, d.radius / 4)}px`)
      .attr("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.4)")
      .style("opacity", 0)
      .text((d) => (d.radius >= 28 && d.borrower_name ? d.borrower_name : ""))
      .transition()
      .delay(300)
      .duration(300)
      .style("opacity", "1");

    // Amount
    enter
      .append("text")
      .attr("class", "bubble-amount")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => (d.radius >= 28 && d.borrower_name ? "1.1em" : "0.55em"))
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

    // Merge
    const merged = enter.merge(bubbles);

    merged
      .select(".main-circle")
      .transition()
      .duration(300)
      .attr("r", (d) => d.radius)
      .attr("fill", gradId)
      .attr("filter", "url(#bubble-shadow)");

    merged.select(".highlight-ring").attr("r", (d) => d.radius + 2);

    merged
      .select(".bubble-grade")
      .text((d) => d.risk_grade)
      .attr("dy", (d) => `${-d.radius * 0.35}px`)
      .attr("font-size", (d) => `${Math.max(7, d.radius / 4.5)}px`);

    merged
      .select(".bubble-name")
      .text((d) => (d.radius >= 28 && d.borrower_name ? d.borrower_name : ""))
      .attr("font-size", (d) => `${Math.max(8, d.radius / 4)}px`);

    merged
      .select(".bubble-amount")
      .text((d) => formatShort(d.amount_pence))
      .attr("font-size", (d) => `${Math.max(9, d.radius / 3)}px`);

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
          <span className="text-4xl mb-3" role="img" aria-label="No bubbles">
            🫧
          </span>
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
