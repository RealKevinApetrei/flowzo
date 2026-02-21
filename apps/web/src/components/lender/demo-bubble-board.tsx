"use client";

import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import type { BubbleColorMode } from "@/lib/hooks/use-lender-settings";
import { resolveBubblePalette } from "@/lib/hooks/use-lender-settings";
import { formatCurrency } from "@flowzo/shared";

interface DemoBubbleBoardProps {
  autoMatch: boolean;
  bubbleColorMode: BubbleColorMode;
  unifiedColorHex: string;
}

interface DemoTrade {
  id: string;
  borrower_name: string;
  amount_pence: number;
  fee_pence: number;
  shift_days: number;
  risk_grade: "A" | "B" | "C";
}

interface PhysicsNode {
  id: string;
  borrower_name: string;
  amount_pence: number;
  fee_pence: number;
  shift_days: number;
  risk_grade: "A" | "B" | "C";
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bursting?: boolean;
}

// Removed hardcoded RISK_PALETTE — now uses resolveBubblePalette

const DEMO_TRADES: DemoTrade[] = [
  { id: "d-1", borrower_name: "Emma W.", amount_pence: 15000, fee_pence: 450, shift_days: 7, risk_grade: "A" },
  { id: "d-2", borrower_name: "James T.", amount_pence: 8000, fee_pence: 320, shift_days: 14, risk_grade: "B" },
  { id: "d-3", borrower_name: "Sarah K.", amount_pence: 25000, fee_pence: 1250, shift_days: 5, risk_grade: "A" },
  { id: "d-4", borrower_name: "Ollie P.", amount_pence: 12000, fee_pence: 840, shift_days: 21, risk_grade: "C" },
  { id: "d-5", borrower_name: "Mia C.", amount_pence: 5500, fee_pence: 165, shift_days: 3, risk_grade: "A" },
  { id: "d-6", borrower_name: "Noah R.", amount_pence: 18500, fee_pence: 925, shift_days: 10, risk_grade: "B" },
  { id: "d-7", borrower_name: "Liam B.", amount_pence: 32000, fee_pence: 2240, shift_days: 28, risk_grade: "C" },
  { id: "d-8", borrower_name: "Ava M.", amount_pence: 9500, fee_pence: 285, shift_days: 7, risk_grade: "A" },
  { id: "d-9", borrower_name: "Jack H.", amount_pence: 42000, fee_pence: 1680, shift_days: 14, risk_grade: "B" },
  { id: "d-10", borrower_name: "Zara S.", amount_pence: 6000, fee_pence: 420, shift_days: 30, risk_grade: "C" },
  { id: "d-11", borrower_name: "Ben D.", amount_pence: 20000, fee_pence: 600, shift_days: 5, risk_grade: "A" },
  { id: "d-12", borrower_name: "Isla F.", amount_pence: 11000, fee_pence: 550, shift_days: 12, risk_grade: "B" },
];

const formatShort = (pence: number) => formatCurrency(pence).replace(/\.00$/, "");

export function DemoBubbleBoard({ autoMatch, bubbleColorMode, unifiedColorHex }: DemoBubbleBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number>(0);
  const nodesRef = useRef<PhysicsNode[]>([]);

  const setupSvg = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const container = svg.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const d3Svg = d3.select(svg);
    const isMobile = width < 500;
    const baseSpeed = isMobile ? 0.6 : 0.9;

    // SVG defs — recreate on color mode change
    d3Svg.select("defs").remove();
    const defs = d3Svg.append("defs");

    // Simple drop shadow filter
    const shadow = defs.append("filter").attr("id", "demo-shadow").attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
    shadow.append("feDropShadow").attr("dx", "0").attr("dy", "2").attr("stdDeviation", "3").attr("flood-color", "rgba(0,0,0,0.15)");

    if (bubbleColorMode === "unified") {
      const p = resolveBubblePalette("A", "unified", unifiedColorHex);
      const grad = defs.append("radialGradient").attr("id", "demo-grad-unified").attr("cx", "45%").attr("cy", "40%").attr("r", "55%");
      grad.append("stop").attr("offset", "0%").attr("stop-color", p.center);
      grad.append("stop").attr("offset", "100%").attr("stop-color", p.edge);
    } else {
      (["A", "B", "C"] as const).forEach((grade) => {
        const p = resolveBubblePalette(grade, "by-grade", unifiedColorHex);
        const grad = defs.append("radialGradient").attr("id", `demo-grad-${grade}`).attr("cx", "45%").attr("cy", "40%").attr("r", "55%");
        grad.append("stop").attr("offset", "0%").attr("stop-color", p.center);
        grad.append("stop").attr("offset", "100%").attr("stop-color", p.edge);
      });
    }

    // Radii
    const amounts = DEMO_TRADES.map((t) => t.amount_pence);
    const minAmt = Math.min(...amounts);
    const maxAmt = Math.max(...amounts);
    const range = maxAmt - minAmt || 1;
    const rMin = isMobile ? 18 : 24;
    const rMax = isMobile ? 32 : 42;

    // Physics nodes with random velocity directions
    const nodes: PhysicsNode[] = DEMO_TRADES.map((t) => {
      const normalized = (t.amount_pence - minAmt) / range;
      const radius = rMin + normalized * (rMax - rMin);
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
    d3Svg.selectAll(".demo-bubble").remove();

    const enter = d3Svg
      .selectAll<SVGGElement, PhysicsNode>(".demo-bubble")
      .data(nodes, (d) => d.id)
      .enter()
      .append("g")
      .attr("class", "demo-bubble");

    const gradId = (d: PhysicsNode) => bubbleColorMode === "unified" ? "url(#demo-grad-unified)" : `url(#demo-grad-${d.risk_grade})`;

    // Circle — soft gradient, drop shadow
    enter
      .append("circle")
      .attr("class", "demo-main")
      .attr("r", 0)
      .attr("fill", gradId)
      .attr("filter", "url(#demo-shadow)")
      .transition()
      .duration(800)
      .ease(d3.easeElasticOut.amplitude(1).period(0.5))
      .attr("r", (d) => d.radius);

    // Risk grade label (always visible)
    enter
      .append("text")
      .attr("class", "demo-grade")
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
      .delay(400)
      .duration(400)
      .style("opacity", "1");

    // Borrower name (hidden on very small bubbles)
    enter
      .append("text")
      .attr("class", "demo-name")
      .attr("text-anchor", "middle")
      .attr("dy", "0.05em")
      .attr("fill", "white")
      .attr("font-weight", "600")
      .attr("font-size", (d) => `${Math.max(8, d.radius / 4)}px`)
      .attr("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.4)")
      .style("opacity", 0)
      .text((d) => (d.radius >= 28 ? d.borrower_name : ""))
      .transition()
      .delay(500)
      .duration(400)
      .style("opacity", "1");

    // Amount
    enter
      .append("text")
      .attr("class", "demo-amount")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => (d.radius >= 28 ? "1.1em" : "0.55em"))
      .attr("fill", "rgba(255,255,255,0.9)")
      .attr("font-weight", "700")
      .attr("font-size", (d) => `${Math.max(9, d.radius / 3)}px`)
      .attr("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.3)")
      .style("opacity", 0)
      .text((d) => formatShort(d.amount_pence))
      .transition()
      .delay(600)
      .duration(400)
      .style("opacity", "1");

    const allBubbles = d3Svg.selectAll<SVGGElement, PhysicsNode>(".demo-bubble");

    // ---------- Billiard-ball physics via RAF ----------
    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.67, 3);
      lastTime = now;
      const ns = nodesRef.current;

      // Move
      for (const n of ns) {
        if (n.bursting) continue;
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
        if (ns[i].bursting) continue;
        for (let j = i + 1; j < ns.length; j++) {
          if (ns[j].bursting) continue;
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

              // Separate overlap
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

      // Update SVG transforms (skip bursting)
      allBubbles
        .filter((d) => !d.bursting)
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [bubbleColorMode, unifiedColorHex]);

  useEffect(() => {
    const cleanup = setupSvg();
    return cleanup;
  }, [setupSvg]);

  // Auto-burst with "Funded!" floating text
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const d3Svg = d3.select(svg);

    const baseInterval = autoMatch ? 1800 : 3500;

    const interval = setInterval(() => {
      const bubbles = d3Svg.selectAll<SVGGElement, PhysicsNode>(".demo-bubble");
      const active = bubbles.filter((d) => !d.bursting);
      const size = active.size();
      if (size === 0) return;

      const idx = Math.floor(Math.random() * size);
      const target = d3.select<SVGGElement, PhysicsNode>(active.nodes()[idx]!);
      const data = target.datum();
      const labelColor = resolveBubblePalette(data.risk_grade, bubbleColorMode, unifiedColorHex).center;

      // Mark as bursting so physics skips it
      data.bursting = true;

      // Slight scale-up → shrink to zero
      target
        .transition()
        .duration(200)
        .attr("transform", `translate(${data.x},${data.y}) scale(1.15)`)
        .transition()
        .duration(250)
        .ease(d3.easeCubicIn)
        .attr("transform", `translate(${data.x},${data.y}) scale(0)`)
        .style("opacity", 0)
        .on("end", function () {
          // Give new random direction on respawn
          const angle = Math.random() * 2 * Math.PI;
          const speed = 0.5 + Math.random() * 0.9;
          data.vx = Math.cos(angle) * speed;
          data.vy = Math.sin(angle) * speed;

          setTimeout(() => {
            data.bursting = false;
            d3.select(this)
              .style("opacity", 1)
              .attr("transform", `translate(${data.x},${data.y}) scale(0)`)
              .transition()
              .duration(600)
              .ease(d3.easeElasticOut.amplitude(1).period(0.4))
              .attr("transform", `translate(${data.x},${data.y}) scale(1)`);
          }, 350);
        });

      // Floating "Funded!" label
      d3Svg
        .append("text")
        .attr("x", data.x)
        .attr("y", data.y)
        .attr("text-anchor", "middle")
        .attr("fill", labelColor)
        .attr("font-weight", "700")
        .attr("font-size", "13px")
        .style("pointer-events", "none")
        .text("Funded!")
        .transition()
        .duration(900)
        .ease(d3.easeCubicOut)
        .attr("y", data.y - 50)
        .style("opacity", 0)
        .remove();
    }, baseInterval + Math.random() * 800);

    return () => clearInterval(interval);
  }, [autoMatch]);

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
