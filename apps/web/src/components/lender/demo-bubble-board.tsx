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

interface DemoNode extends d3.SimulationNodeDatum {
  id: string;
  borrower_name: string;
  amount_pence: number;
  fee_pence: number;
  shift_days: number;
  risk_grade: "A" | "B" | "C";
  radius: number;
}

// Premium 3D sphere palette — blue / rose / amber
const RISK_PALETTE: Record<
  string,
  { highlight: string; base: string; deep: string }
> = {
  A: { highlight: "#BFDBFE", base: "#3B82F6", deep: "#1D4ED8" },
  B: { highlight: "#FECDD3", base: "#FB7185", deep: "#E11D48" },
  C: { highlight: "#FDE68A", base: "#F59E0B", deep: "#B45309" },
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

    // Define SVG defs: sphere gradients, specular, shadow
    let defs = d3Svg.select<SVGDefsElement>("defs");
    if (defs.empty()) {
      defs = d3Svg.append("defs");

      // 3D sphere gradient per risk grade
      (["A", "B", "C"] as const).forEach((grade) => {
        const p = RISK_PALETTE[grade];
        const grad = defs
          .append("radialGradient")
          .attr("id", `demo-sphere-${grade}`)
          .attr("cx", "35%")
          .attr("cy", "30%")
          .attr("r", "65%");
        grad.append("stop").attr("offset", "0%").attr("stop-color", p.highlight).attr("stop-opacity", "0.95");
        grad.append("stop").attr("offset", "50%").attr("stop-color", p.base).attr("stop-opacity", "1");
        grad.append("stop").attr("offset", "100%").attr("stop-color", p.deep).attr("stop-opacity", "1");

        // Stroke gradient
        const sg = defs
          .append("radialGradient")
          .attr("id", `demo-stroke-${grade}`)
          .attr("cx", "35%")
          .attr("cy", "30%");
        sg.append("stop").attr("offset", "0%").attr("stop-color", p.base).attr("stop-opacity", "0.2");
        sg.append("stop").attr("offset", "100%").attr("stop-color", p.deep).attr("stop-opacity", "0.5");
      });

      // Specular highlight gradient
      const spec = defs
        .append("radialGradient")
        .attr("id", "demo-specular")
        .attr("cx", "50%")
        .attr("cy", "50%");
      spec.append("stop").attr("offset", "0%").attr("stop-color", "white").attr("stop-opacity", "0.75");
      spec.append("stop").attr("offset", "100%").attr("stop-color", "white").attr("stop-opacity", "0");

      // Drop shadow filter
      const shadow = defs
        .append("filter")
        .attr("id", "demo-shadow")
        .attr("x", "-30%")
        .attr("y", "-30%")
        .attr("width", "160%")
        .attr("height", "160%");
      shadow.append("feDropShadow")
        .attr("dx", "0")
        .attr("dy", "3")
        .attr("stdDeviation", "6")
        .attr("flood-color", "rgba(0,0,0,0.12)");
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
        radius: 32 + normalized * 42,
        x: width / 2 + (Math.random() - 0.5) * width * 0.6,
        y: height / 2 + (Math.random() - 0.5) * height * 0.5,
      };
    });

    // Clear previous
    d3Svg.selectAll(".demo-bubble").remove();

    const enter = d3Svg
      .selectAll<SVGGElement, DemoNode>(".demo-bubble")
      .data(nodes, (d) => d.id)
      .enter()
      .append("g")
      .attr("class", "demo-bubble");

    // Main sphere with 3D gradient + shadow
    enter
      .append("circle")
      .attr("class", "demo-main")
      .attr("r", 0)
      .attr("fill", (d) => `url(#demo-sphere-${d.risk_grade})`)
      .attr("stroke", (d) => `url(#demo-stroke-${d.risk_grade})`)
      .attr("stroke-width", 1.5)
      .attr("filter", "url(#demo-shadow)")
      .transition()
      .duration(800)
      .ease(d3.easeElasticOut.amplitude(1).period(0.5))
      .attr("r", (d) => d.radius);

    // Specular highlight ellipse (glass reflection)
    enter
      .append("ellipse")
      .attr("class", "demo-specular")
      .attr("cx", (d) => -d.radius * 0.2)
      .attr("cy", (d) => -d.radius * 0.25)
      .attr("rx", 0)
      .attr("ry", 0)
      .attr("fill", "url(#demo-specular)")
      .attr("pointer-events", "none")
      .transition()
      .delay(400)
      .duration(600)
      .attr("rx", (d) => d.radius * 0.38)
      .attr("ry", (d) => d.radius * 0.22);

    // Borrower name (top)
    enter
      .append("text")
      .attr("class", "demo-name")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.4em")
      .attr("fill", "white")
      .attr("font-weight", "600")
      .attr("font-size", (d) => `${Math.max(8, d.radius / 4.5)}px`)
      .attr("pointer-events", "none")
      .style("opacity", 0)
      .style("text-shadow", "0 1px 3px rgba(0,0,0,0.35)")
      .text((d) => d.borrower_name)
      .transition()
      .delay(400)
      .duration(400)
      .style("opacity", "1");

    // Amount label (bottom)
    enter
      .append("text")
      .attr("class", "demo-amount")
      .attr("text-anchor", "middle")
      .attr("dy", "1em")
      .attr("fill", "rgba(255,255,255,0.9)")
      .attr("font-weight", "700")
      .attr("font-size", (d) => `${Math.max(9, d.radius / 3.5)}px`)
      .attr("pointer-events", "none")
      .style("opacity", 0)
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.25)")
      .text((d) => formatPounds(d.amount_pence))
      .transition()
      .delay(500)
      .duration(400)
      .style("opacity", "1");

    const allBubbles = d3Svg.selectAll<SVGGElement, DemoNode>(".demo-bubble");

    // Force simulation — fast, lively floating
    if (simulationRef.current) simulationRef.current.stop();

    const sim = d3
      .forceSimulation<DemoNode>(nodes)
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.008))
      .force("charge", d3.forceManyBody<DemoNode>().strength(-25))
      .force(
        "collide",
        d3
          .forceCollide<DemoNode>()
          .radius((d) => d.radius + 6)
          .strength(0.8)
          .iterations(2),
      )
      .force("x", d3.forceX(width / 2).strength(0.006))
      .force("y", d3.forceY(height / 2).strength(0.006))
      .alphaDecay(0.002)
      .velocityDecay(0.1)
      .on("tick", () => {
        allBubbles.attr("transform", (d) => {
          const r = d.radius;
          d.x = Math.max(r, Math.min(width - r, d.x ?? width / 2));
          d.y = Math.max(r, Math.min(height - r, d.y ?? height / 2));
          return `translate(${d.x},${d.y})`;
        });
      });

    simulationRef.current = sim;

    // Frequent, strong jiggle for lively floating
    const jiggle = setInterval(() => {
      sim.alpha(0.45).restart();
      nodes.forEach((n) => {
        n.vx = (n.vx ?? 0) + (Math.random() - 0.5) * 7;
        n.vy = (n.vy ?? 0) + (Math.random() - 0.5) * 7;
      });
    }, 1500);

    return () => {
      clearInterval(jiggle);
      sim.stop();
    };
  }, []);

  useEffect(() => {
    const cleanup = setupSvg();
    return cleanup;
  }, [setupSvg]);

  // Auto-burst mimicking click: highlight ring → pop → respawn
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const d3Svg = d3.select(svg);

    const baseInterval = autoMatch ? 1800 : 3500;

    const interval = setInterval(() => {
      const bubbles = d3Svg.selectAll<SVGGElement, DemoNode>(".demo-bubble");
      const size = bubbles.size();
      if (size === 0) return;

      const idx = Math.floor(Math.random() * size);
      const target = d3.select<SVGGElement, DemoNode>(bubbles.nodes()[idx]!);
      const data = target.datum();

      // Step 1: Flash highlight ring (mimics user tap)
      const ring = target
        .append("circle")
        .attr("class", "burst-ring")
        .attr("r", data.radius + 2)
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 3)
        .attr("opacity", 0);

      ring
        .transition()
        .duration(180)
        .attr("opacity", 0.9)
        .transition()
        .duration(200)
        .attr("r", data.radius + 12)
        .attr("opacity", 0)
        .remove();

      // Step 2: Pop animation after ring
      setTimeout(() => {
        target
          .transition()
          .duration(280)
          .ease(d3.easeCubicIn)
          .attr("transform", `translate(${data.x},${data.y}) scale(1.5)`)
          .style("opacity", 0)
          .on("end", function () {
            // Respawn with elastic bounce-in
            setTimeout(() => {
              d3.select(this)
                .style("opacity", 1)
                .attr("transform", `translate(${data.x},${data.y}) scale(0)`)
                .transition()
                .duration(700)
                .ease(d3.easeElasticOut.amplitude(1).period(0.4))
                .attr("transform", `translate(${data.x},${data.y}) scale(1)`);
            }, 400);
          });
      }, 220);
    }, baseInterval + Math.random() * 800);

    return () => clearInterval(interval);
  }, [autoMatch]);

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
