"use client";

import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";

interface DemoBubbleBoardProps {
  autoMatch: boolean;
}

interface DemoTrade {
  id: string;
  amount_pence: number;
  fee_pence: number;
  shift_days: number;
  risk_grade: "A" | "B" | "C";
}

interface DemoNode extends d3.SimulationNodeDatum {
  id: string;
  amount_pence: number;
  fee_pence: number;
  shift_days: number;
  risk_grade: "A" | "B" | "C";
  radius: number;
}

// Monzo-branded gradient palette
const RISK_GRADIENTS: Record<string, { inner: string; outer: string; glow: string }> = {
  A: { inner: "#99F6E4", outer: "#14B8A6", glow: "rgba(20,184,166,0.3)" },
  B: { inner: "#FFB4B8", outer: "#FF5A5F", glow: "rgba(255,90,95,0.3)" },
  C: { inner: "#C4B5FD", outer: "#8B5CF6", glow: "rgba(139,92,246,0.3)" },
};

// Realistic demo trades
const DEMO_TRADES: DemoTrade[] = [
  { id: "d-1", amount_pence: 15000, fee_pence: 450, shift_days: 7, risk_grade: "A" },
  { id: "d-2", amount_pence: 8000, fee_pence: 320, shift_days: 14, risk_grade: "B" },
  { id: "d-3", amount_pence: 25000, fee_pence: 1250, shift_days: 5, risk_grade: "A" },
  { id: "d-4", amount_pence: 12000, fee_pence: 840, shift_days: 21, risk_grade: "C" },
  { id: "d-5", amount_pence: 5500, fee_pence: 165, shift_days: 3, risk_grade: "A" },
  { id: "d-6", amount_pence: 18500, fee_pence: 925, shift_days: 10, risk_grade: "B" },
  { id: "d-7", amount_pence: 32000, fee_pence: 2240, shift_days: 28, risk_grade: "C" },
  { id: "d-8", amount_pence: 9500, fee_pence: 285, shift_days: 7, risk_grade: "A" },
  { id: "d-9", amount_pence: 42000, fee_pence: 1680, shift_days: 14, risk_grade: "B" },
  { id: "d-10", amount_pence: 6000, fee_pence: 420, shift_days: 30, risk_grade: "C" },
  { id: "d-11", amount_pence: 20000, fee_pence: 600, shift_days: 5, risk_grade: "A" },
  { id: "d-12", amount_pence: 11000, fee_pence: 550, shift_days: 12, risk_grade: "B" },
];

const formatPounds = (pence: number) => "\u00A3" + (pence / 100).toFixed(0);

export function DemoBubbleBoard({ autoMatch }: DemoBubbleBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<DemoNode, undefined> | null>(null);

  const setupSvg = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const container = svg.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const d3Svg = d3.select(svg);

    // Define radial gradients per risk grade + glow filter
    let defs = d3Svg.select<SVGDefsElement>("defs");
    if (defs.empty()) {
      defs = d3Svg.append("defs");
      (["A", "B", "C"] as const).forEach((grade) => {
        const g = RISK_GRADIENTS[grade];
        const grad = defs
          .append("radialGradient")
          .attr("id", `demo-grad-${grade}`)
          .attr("cx", "35%")
          .attr("cy", "35%");
        grad.append("stop").attr("offset", "0%").attr("stop-color", g.inner).attr("stop-opacity", "1");
        grad.append("stop").attr("offset", "100%").attr("stop-color", g.outer).attr("stop-opacity", "0.9");

        // Glow filter
        const filter = defs.append("filter").attr("id", `glow-${grade}`).attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
        filter.append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", "6").attr("result", "blur");
        filter.append("feFlood").attr("flood-color", g.glow).attr("result", "color");
        filter.append("feComposite").attr("in", "color").attr("in2", "blur").attr("operator", "in").attr("result", "glow");
        const merge = filter.append("feMerge");
        merge.append("feMergeNode").attr("in", "glow");
        merge.append("feMergeNode").attr("in", "SourceGraphic");
      });
    }

    // Calculate radii
    const amounts = DEMO_TRADES.map((t) => t.amount_pence);
    const minAmt = Math.min(...amounts);
    const maxAmt = Math.max(...amounts);
    const range = maxAmt - minAmt || 1;

    const nodes: DemoNode[] = DEMO_TRADES.map((t) => {
      const normalized = (t.amount_pence - minAmt) / range;
      return {
        ...t,
        radius: 30 + normalized * 45,
        x: width / 2 + (Math.random() - 0.5) * width * 0.5,
        y: height / 2 + (Math.random() - 0.5) * height * 0.4,
      };
    });

    // Data join
    d3Svg.selectAll(".demo-bubble").remove();

    const enter = d3Svg
      .selectAll<SVGGElement, DemoNode>(".demo-bubble")
      .data(nodes, (d) => d.id)
      .enter()
      .append("g")
      .attr("class", "demo-bubble");

    // Main circle with gradient + glow
    enter
      .append("circle")
      .attr("class", "demo-main")
      .attr("r", 0)
      .attr("fill", (d) => `url(#demo-grad-${d.risk_grade})`)
      .attr("filter", (d) => `url(#glow-${d.risk_grade})`)
      .transition()
      .duration(800)
      .ease(d3.easeElasticOut.amplitude(1).period(0.5))
      .attr("r", (d) => d.radius);

    // Amount label
    enter
      .append("text")
      .attr("class", "demo-amount")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.15em")
      .attr("fill", "white")
      .attr("font-weight", "700")
      .attr("font-size", (d) => `${Math.max(10, d.radius / 3.2)}px`)
      .attr("pointer-events", "none")
      .style("opacity", 0)
      .text((d) => formatPounds(d.amount_pence))
      .transition()
      .delay(400)
      .duration(400)
      .style("opacity", "1");

    // Shift days sub-label
    enter
      .append("text")
      .attr("class", "demo-days")
      .attr("text-anchor", "middle")
      .attr("dy", "1.1em")
      .attr("fill", "rgba(255,255,255,0.75)")
      .attr("font-weight", "500")
      .attr("font-size", (d) => `${Math.max(8, d.radius / 5)}px`)
      .attr("pointer-events", "none")
      .style("opacity", 0)
      .text((d) => `${d.shift_days}d`)
      .transition()
      .delay(500)
      .duration(400)
      .style("opacity", "1");

    const allBubbles = d3Svg.selectAll<SVGGElement, DemoNode>(".demo-bubble");

    // Force simulation — gentle
    if (simulationRef.current) simulationRef.current.stop();

    const sim = d3
      .forceSimulation<DemoNode>(nodes)
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.03))
      .force("charge", d3.forceManyBody<DemoNode>().strength(-10))
      .force(
        "collide",
        d3
          .forceCollide<DemoNode>()
          .radius((d) => d.radius + 8)
          .strength(0.7)
          .iterations(2),
      )
      .force("x", d3.forceX(width / 2).strength(0.02))
      .force("y", d3.forceY(height / 2).strength(0.02))
      .alphaDecay(0.005)
      .velocityDecay(0.35)
      .on("tick", () => {
        allBubbles.attr("transform", (d) => {
          const r = d.radius;
          d.x = Math.max(r, Math.min(width - r, d.x ?? width / 2));
          d.y = Math.max(r, Math.min(height - r, d.y ?? height / 2));
          return `translate(${d.x},${d.y})`;
        });
      });

    simulationRef.current = sim;

    // Gentle jiggle
    const jiggle = setInterval(() => {
      sim.alpha(0.08).restart();
      nodes.forEach((n) => {
        n.vx = (n.vx ?? 0) + (Math.random() - 0.5) * 1.5;
        n.vy = (n.vy ?? 0) + (Math.random() - 0.5) * 1.5;
      });
    }, 4500);

    return () => {
      clearInterval(jiggle);
      sim.stop();
    };
  }, []);

  useEffect(() => {
    const cleanup = setupSvg();
    return cleanup;
  }, [setupSvg]);

  // Auto-burst — always active in demo mode
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const d3Svg = d3.select(svg);

    // Faster burst when autoMatch is on
    const baseInterval = autoMatch ? 2500 : 5000;

    const interval = setInterval(() => {
      const bubbles = d3Svg.selectAll<SVGGElement, DemoNode>(".demo-bubble");
      const size = bubbles.size();
      if (size === 0) return;

      const idx = Math.floor(Math.random() * size);
      const target = d3.select<SVGGElement, DemoNode>(bubbles.nodes()[idx]!);
      const data = target.datum();

      // Pop animation
      target
        .transition()
        .duration(350)
        .ease(d3.easeCubicIn)
        .attr("transform", `translate(${data.x},${data.y}) scale(1.4)`)
        .style("opacity", 0)
        .on("end", function () {
          // Respawn after delay
          setTimeout(() => {
            d3.select(this)
              .style("opacity", 1)
              .attr("transform", `translate(${data.x},${data.y}) scale(0)`)
              .transition()
              .duration(600)
              .ease(d3.easeElasticOut.amplitude(1).period(0.4))
              .attr("transform", `translate(${data.x},${data.y}) scale(1)`);
          }, 700);
        });
    }, baseInterval + Math.random() * 1500);

    return () => clearInterval(interval);
  }, [autoMatch]);

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
