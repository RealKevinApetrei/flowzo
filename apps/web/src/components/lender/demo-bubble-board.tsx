"use client";

import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";

interface DemoBubbleBoardProps {
  autoMatch: boolean;
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

// Neon gradient — lighter center, darker edge, colored glow
const RISK_PALETTE: Record<string, { center: string; edge: string; glow: string; label: string }> = {
  A: { center: "#60A5FA", edge: "#1D4ED8", glow: "rgba(96,165,250,0.35)", label: "#93C5FD" },
  B: { center: "#FDA4AF", edge: "#E11D48", glow: "rgba(253,164,175,0.35)", label: "#FECDD3" },
  C: { center: "#FCD34D", edge: "#B45309", glow: "rgba(252,211,77,0.35)", label: "#FDE68A" },
};

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

const formatPounds = (pence: number) => "\u00A3" + (pence / 100).toFixed(0);

export function DemoBubbleBoard({ autoMatch }: DemoBubbleBoardProps) {
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

    // SVG defs — gradients + shadow
    let defs = d3Svg.select<SVGDefsElement>("defs");
    if (defs.empty()) {
      defs = d3Svg.append("defs");

      (["A", "B", "C"] as const).forEach((grade) => {
        const p = RISK_PALETTE[grade];
        const grad = defs
          .append("radialGradient")
          .attr("id", `demo-grad-${grade}`)
          .attr("cx", "45%")
          .attr("cy", "40%")
          .attr("r", "55%");
        grad.append("stop").attr("offset", "0%").attr("stop-color", p.center);
        grad.append("stop").attr("offset", "100%").attr("stop-color", p.edge);
      });

      // Neon glow filters per risk grade
      (["A", "B", "C"] as const).forEach((grade) => {
        const p = RISK_PALETTE[grade];
        const glow = defs
          .append("filter")
          .attr("id", `demo-glow-${grade}`)
          .attr("x", "-40%")
          .attr("y", "-40%")
          .attr("width", "180%")
          .attr("height", "180%");
        glow.append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", "8").attr("result", "blur");
        glow.append("feFlood").attr("flood-color", p.glow).attr("result", "color");
        glow.append("feComposite").attr("in", "color").attr("in2", "blur").attr("operator", "in").attr("result", "colored");
        const merge = glow.append("feMerge");
        merge.append("feMergeNode").attr("in", "colored");
        merge.append("feMergeNode").attr("in", "SourceGraphic");
      });
    }

    // Radii
    const amounts = DEMO_TRADES.map((t) => t.amount_pence);
    const minAmt = Math.min(...amounts);
    const maxAmt = Math.max(...amounts);
    const range = maxAmt - minAmt || 1;
    const rMin = isMobile ? 22 : 30;
    const rMax = isMobile ? 40 : 52;

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

    // Circle — soft gradient, drop shadow
    enter
      .append("circle")
      .attr("class", "demo-main")
      .attr("r", 0)
      .attr("fill", (d) => `url(#demo-grad-${d.risk_grade})`)
      .attr("filter", (d) => `url(#demo-glow-${d.risk_grade})`)
      .transition()
      .duration(800)
      .ease(d3.easeElasticOut.amplitude(1).period(0.5))
      .attr("r", (d) => d.radius);

    // Borrower name (hidden on very small bubbles)
    enter
      .append("text")
      .attr("class", "demo-name")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.3em")
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
      .attr("dy", (d) => (d.radius >= 28 ? "0.95em" : "0.35em"))
      .attr("fill", "rgba(255,255,255,0.9)")
      .attr("font-weight", "700")
      .attr("font-size", (d) => `${Math.max(9, d.radius / 3)}px`)
      .attr("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.3)")
      .style("opacity", 0)
      .text((d) => formatPounds(d.amount_pence))
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
  }, []);

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
      const labelColor = RISK_PALETTE[data.risk_grade]?.label ?? "#3B82F6";

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
