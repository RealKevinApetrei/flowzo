"use client";

import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";

interface DemoBubbleBoardProps {
  autoMatch: boolean;
}

interface DemoNode extends d3.SimulationNodeDatum {
  id: string;
  radius: number;
  gradient: string;
}

const GRADIENTS = [
  { id: "coral-pink", stops: ["#FF5A5F", "#FF9A9E"] },
  { id: "navy-purple", stops: ["#1B1B3A", "#6B5CE7"] },
  { id: "teal-green", stops: ["#10B981", "#34D399"] },
  { id: "amber-gold", stops: ["#F59E0B", "#FBBF24"] },
];

function generateNodes(count: number, width: number, height: number): DemoNode[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `demo-${i}`,
    radius: 25 + Math.random() * 45,
    gradient: GRADIENTS[i % GRADIENTS.length].id,
    x: width / 2 + (Math.random() - 0.5) * width * 0.6,
    y: height / 2 + (Math.random() - 0.5) * height * 0.6,
  }));
}

export function DemoBubbleBoard({ autoMatch }: DemoBubbleBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<DemoNode, undefined> | null>(null);
  const nodesRef = useRef<DemoNode[]>([]);

  const setupSvg = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const container = svg.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const d3Svg = d3.select(svg);

    // Define gradients
    let defs = d3Svg.select<SVGDefsElement>("defs");
    if (defs.empty()) {
      defs = d3Svg.append("defs");
      GRADIENTS.forEach((g) => {
        const grad = defs
          .append("radialGradient")
          .attr("id", g.id)
          .attr("cx", "30%")
          .attr("cy", "30%");
        grad.append("stop").attr("offset", "0%").attr("stop-color", g.stops[1]);
        grad
          .append("stop")
          .attr("offset", "100%")
          .attr("stop-color", g.stops[0]);
      });
    }

    const nodes = generateNodes(12, width, height);
    nodesRef.current = nodes;

    // Data join
    const bubbles = d3Svg
      .selectAll<SVGGElement, DemoNode>(".demo-bubble")
      .data(nodes, (d) => d.id);

    bubbles.exit().remove();

    const enter = bubbles
      .enter()
      .append("g")
      .attr("class", "demo-bubble")
      .style("opacity", 0.7);

    enter
      .append("circle")
      .attr("r", 0)
      .attr("fill", (d) => `url(#${d.gradient})`)
      .attr("fill-opacity", 0.6)
      .transition()
      .duration(800)
      .ease(d3.easeElasticOut.amplitude(1).period(0.5))
      .attr("r", (d) => d.radius);

    const merged = enter.merge(bubbles);

    // Force simulation — gentler than real
    if (simulationRef.current) simulationRef.current.stop();

    const sim = d3
      .forceSimulation<DemoNode>(nodes)
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.03))
      .force("charge", d3.forceManyBody<DemoNode>().strength(-8))
      .force(
        "collide",
        d3
          .forceCollide<DemoNode>()
          .radius((d) => d.radius + 6)
          .strength(0.6)
          .iterations(2),
      )
      .force("x", d3.forceX(width / 2).strength(0.02))
      .force("y", d3.forceY(height / 2).strength(0.02))
      .alphaDecay(0.005)
      .velocityDecay(0.4)
      .on("tick", () => {
        merged.attr("transform", (d) => {
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
    }, 5000);

    return () => {
      clearInterval(jiggle);
      sim.stop();
    };
  }, []);

  useEffect(() => {
    const cleanup = setupSvg();
    return cleanup;
  }, [setupSvg]);

  // Auto-burst when autoMatch is on
  useEffect(() => {
    if (!autoMatch) return;

    const svg = svgRef.current;
    if (!svg) return;
    const d3Svg = d3.select(svg);

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
        .duration(400)
        .ease(d3.easeCubicIn)
        .attr("transform", `translate(${data.x},${data.y}) scale(1.5)`)
        .style("opacity", 0)
        .on("end", function () {
          // Respawn after delay
          setTimeout(() => {
            d3.select(this)
              .style("opacity", 0.7)
              .attr("transform", `translate(${data.x},${data.y}) scale(0)`)
              .transition()
              .duration(600)
              .ease(d3.easeElasticOut.amplitude(1).period(0.4))
              .attr("transform", `translate(${data.x},${data.y}) scale(1)`);
          }, 800);
        });
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, [autoMatch]);

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
