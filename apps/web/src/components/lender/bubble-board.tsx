"use client";

import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";

interface BubbleTrade {
  id: string;
  amount_pence: number;
  fee_pence: number;
  shift_days: number;
  risk_grade: string;
  status: string;
}

interface BubbleBoardProps {
  trades: BubbleTrade[];
  onBubbleClick: (tradeId: string) => void;
}

const RISK_COLORS: Record<string, string> = {
  A: "#10B981",
  B: "#F59E0B",
  C: "#EF4444",
};

const formatPounds = (pence: number) => "\u00A3" + (pence / 100).toFixed(2);

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  amount_pence: number;
  fee_pence: number;
  shift_days: number;
  risk_grade: string;
  status: string;
  radius: number;
}

export function BubbleBoard({ trades, onBubbleClick }: BubbleBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, undefined> | null>(null);
  const prevTradeIdsRef = useRef<Set<string>>(new Set());

  const getRadius = useCallback((amountPence: number, allAmounts: number[]) => {
    if (allAmounts.length === 0) return 40;
    const min = Math.min(...allAmounts);
    const max = Math.max(...allAmounts);
    const range = max - min || 1;
    const normalized = (amountPence - min) / range;
    return 30 + normalized * 50; // 30px to 80px
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const container = svg.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const amounts = trades.map((t) => t.amount_pence);
    const prevIds = prevTradeIdsRef.current;
    const currentIds = new Set(trades.map((t) => t.id));

    // Detect removed trades (popped)
    const removedIds = new Set<string>();
    prevIds.forEach((id) => {
      if (!currentIds.has(id)) removedIds.add(id);
    });

    // Detect newly added trades
    const addedIds = new Set<string>();
    currentIds.forEach((id) => {
      if (!prevIds.has(id)) addedIds.add(id);
    });

    prevTradeIdsRef.current = currentIds;

    const nodes: SimNode[] = trades.map((t) => ({
      ...t,
      radius: getRadius(t.amount_pence, amounts),
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100,
    }));

    const d3Svg = d3.select(svg);

    // Pop animation for removed bubbles
    if (removedIds.size > 0) {
      d3Svg
        .selectAll<SVGGElement, SimNode>(".bubble")
        .filter((d) => removedIds.has(d.id))
        .transition()
        .duration(400)
        .ease(d3.easeCubicIn)
        .attr("transform", (d) => `translate(${d.x},${d.y}) scale(1.5)`)
        .style("opacity", 0)
        .remove();
    }

    // Tooltip
    let tooltip = d3.select(container).select<HTMLDivElement>(".bubble-tooltip");
    if (tooltip.empty()) {
      tooltip = d3
        .select(container)
        .append("div")
        .attr("class", "bubble-tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background", "#1B1B3A")
        .style("color", "white")
        .style("padding", "8px 12px")
        .style("border-radius", "12px")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("opacity", "0")
        .style("transition", "opacity 150ms ease")
        .style("z-index", "10")
        .style("white-space", "nowrap");
    }

    // Data join
    const bubbles = d3Svg
      .selectAll<SVGGElement, SimNode>(".bubble")
      .data(nodes, (d) => d.id);

    // Remove old bubbles
    bubbles.exit().remove();

    // Enter new bubbles
    const enter = bubbles
      .enter()
      .append("g")
      .attr("class", "bubble")
      .style("cursor", "pointer")
      .on("click", (_event, d) => onBubbleClick(d.id))
      .on("mouseenter", (event, d) => {
        const [mx, my] = d3.pointer(event, container);
        tooltip
          .html(
            `${formatPounds(d.amount_pence)} &middot; ${d.shift_days}d &middot; Grade ${d.risk_grade}`,
          )
          .style("left", `${mx + 12}px`)
          .style("top", `${my - 10}px`)
          .style("opacity", "1");
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", "0");
      });

    // Circle
    enter
      .append("circle")
      .attr("r", 0)
      .attr("fill", (d) => RISK_COLORS[d.risk_grade] ?? RISK_COLORS.B)
      .attr("fill-opacity", 0.85)
      .attr("stroke", (d) => RISK_COLORS[d.risk_grade] ?? RISK_COLORS.B)
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", 3)
      .transition()
      .duration(addedIds.size > 0 ? 600 : 0)
      .ease(d3.easeElasticOut.amplitude(1).period(0.4))
      .attr("r", (d) => d.radius);

    // Label
    enter
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "white")
      .attr("font-weight", "700")
      .attr("font-size", (d) => `${Math.max(10, d.radius / 3.5)}px`)
      .attr("pointer-events", "none")
      .style("opacity", 0)
      .text((d) => formatPounds(d.fee_pence))
      .transition()
      .delay(300)
      .duration(300)
      .style("opacity", "1");

    // Merge
    const merged = enter.merge(bubbles);

    // Update existing circles
    merged
      .select("circle")
      .transition()
      .duration(300)
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => RISK_COLORS[d.risk_grade] ?? RISK_COLORS.B)
      .attr("stroke", (d) => RISK_COLORS[d.risk_grade] ?? RISK_COLORS.B);

    merged
      .select("text")
      .text((d) => formatPounds(d.fee_pence))
      .attr("font-size", (d) => `${Math.max(10, d.radius / 3.5)}px`);

    // Force simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force(
        "charge",
        d3.forceManyBody<SimNode>().strength(-15),
      )
      .force(
        "collide",
        d3
          .forceCollide<SimNode>()
          .radius((d) => d.radius + 4)
          .strength(0.8)
          .iterations(3),
      )
      .force(
        "x",
        d3.forceX(width / 2).strength(0.03),
      )
      .force(
        "y",
        d3.forceY(height / 2).strength(0.03),
      )
      .alphaDecay(0.01)
      .velocityDecay(0.3)
      .on("tick", () => {
        merged.attr("transform", (d) => {
          // Keep bubbles within bounds
          const r = d.radius;
          d.x = Math.max(r, Math.min(width - r, d.x ?? width / 2));
          d.y = Math.max(r, Math.min(height - r, d.y ?? height / 2));
          return `translate(${d.x},${d.y})`;
        });
      });

    simulationRef.current = simulation;

    // Gentle jiggle every few seconds to keep bubbles lively
    const jiggleInterval = setInterval(() => {
      simulation.alpha(0.15).restart();
      nodes.forEach((node) => {
        node.vx = (node.vx ?? 0) + (Math.random() - 0.5) * 2;
        node.vy = (node.vy ?? 0) + (Math.random() - 0.5) * 2;
      });
    }, 4000);

    return () => {
      clearInterval(jiggleInterval);
      simulation.stop();
      tooltip.remove();
    };
  }, [trades, onBubbleClick, getRadius]);

  return (
    <div className="relative w-full min-h-[400px] h-[400px] bg-warm-grey rounded-2xl overflow-hidden">
      {trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-text-secondary">
          <span className="text-4xl mb-3" role="img" aria-label="No bubbles">
            🫧
          </span>
          <p className="text-sm font-medium">No active trade requests</p>
          <p className="text-xs text-muted mt-1">
            Bubbles will appear when borrowers request shifts
          </p>
        </div>
      ) : (
        <svg ref={svgRef} className="w-full h-full" />
      )}
    </div>
  );
}
