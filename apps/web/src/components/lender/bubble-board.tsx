"use client";

import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import type { FilterState } from "./filter-bar";
import type { HudPosition } from "@/lib/hooks/use-lender-settings";

export interface BubbleTrade {
  id: string;
  amount_pence: number;
  fee_pence: number;
  shift_days: number;
  risk_grade: string;
  status: string;
  borrower_name?: string;
}

interface BubbleBoardProps {
  trades: BubbleTrade[];
  onQuickTap: (trade: BubbleTrade, position: { x: number; y: number }) => void;
  onLongPress: (tradeId: string) => void;
  filters: FilterState;
  hudPosition: HudPosition;
}

// Premium 3D sphere palette — blue / rose / amber (matches demo board)
const RISK_PALETTE: Record<
  string,
  { highlight: string; base: string; deep: string }
> = {
  A: { highlight: "#BFDBFE", base: "#3B82F6", deep: "#1D4ED8" },
  B: { highlight: "#FECDD3", base: "#FB7185", deep: "#E11D48" },
  C: { highlight: "#FDE68A", base: "#F59E0B", deep: "#B45309" },
};

const CHARGE_DURATION = 500;

const formatPounds = (pence: number) => "\u00A3" + (pence / 100).toFixed(0);

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  amount_pence: number;
  fee_pence: number;
  shift_days: number;
  risk_grade: string;
  status: string;
  borrower_name?: string;
  radius: number;
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
  hudPosition,
}: BubbleBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, undefined> | null>(null);
  const prevTradeIdsRef = useRef<Set<string>>(new Set());
  const chargingRef = useRef<string | null>(null);
  const chargeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getRadius = useCallback((amountPence: number, allAmounts: number[]) => {
    if (allAmounts.length === 0) return 50;
    const min = Math.min(...allAmounts);
    const max = Math.max(...allAmounts);
    const range = max - min || 1;
    const normalized = (amountPence - min) / range;
    return 35 + normalized * 55;
  }, []);

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

    // Define sphere gradients, specular highlight, shadow filter
    let defs = d3Svg.select<SVGDefsElement>("defs");
    if (defs.empty()) {
      defs = d3Svg.append("defs");

      (["A", "B", "C"] as const).forEach((grade) => {
        const p = RISK_PALETTE[grade];
        // 3D sphere gradient
        const grad = defs
          .append("radialGradient")
          .attr("id", `sphere-${grade}`)
          .attr("cx", "35%")
          .attr("cy", "30%")
          .attr("r", "65%");
        grad.append("stop").attr("offset", "0%").attr("stop-color", p.highlight).attr("stop-opacity", "0.95");
        grad.append("stop").attr("offset", "50%").attr("stop-color", p.base).attr("stop-opacity", "1");
        grad.append("stop").attr("offset", "100%").attr("stop-color", p.deep).attr("stop-opacity", "1");

        // Stroke gradient
        const sg = defs
          .append("radialGradient")
          .attr("id", `stroke-${grade}`)
          .attr("cx", "35%")
          .attr("cy", "30%");
        sg.append("stop").attr("offset", "0%").attr("stop-color", p.base).attr("stop-opacity", "0.2");
        sg.append("stop").attr("offset", "100%").attr("stop-color", p.deep).attr("stop-opacity", "0.5");
      });

      // Specular highlight
      const spec = defs
        .append("radialGradient")
        .attr("id", "specular")
        .attr("cx", "50%")
        .attr("cy", "50%");
      spec.append("stop").attr("offset", "0%").attr("stop-color", "white").attr("stop-opacity", "0.75");
      spec.append("stop").attr("offset", "100%").attr("stop-color", "white").attr("stop-opacity", "0");

      // Drop shadow
      const shadow = defs
        .append("filter")
        .attr("id", "bubble-shadow")
        .attr("x", "-30%")
        .attr("y", "-30%")
        .attr("width", "160%")
        .attr("height", "160%");
      shadow.append("feDropShadow")
        .attr("dx", "0")
        .attr("dy", "3")
        .attr("stdDeviation", "5")
        .attr("flood-color", "rgba(0,0,0,0.1)");
    }

    const filtered = applyFilters(trades, filters);
    const amounts = filtered.map((t) => t.amount_pence);
    const prevIds = prevTradeIdsRef.current;
    const currentIds = new Set(filtered.map((t) => t.id));

    const removedIds = new Set<string>();
    prevIds.forEach((id) => {
      if (!currentIds.has(id)) removedIds.add(id);
    });

    const addedIds = new Set<string>();
    currentIds.forEach((id) => {
      if (!prevIds.has(id)) addedIds.add(id);
    });

    prevTradeIdsRef.current = currentIds;

    const nodes: SimNode[] = filtered.map((t) => ({
      ...t,
      radius: getRadius(t.amount_pence, amounts),
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100,
    }));

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

    // Data join
    const bubbles = d3Svg
      .selectAll<SVGGElement, SimNode>(".bubble")
      .data(nodes, (d) => d.id);

    bubbles.exit().transition().duration(300).style("opacity", 0).remove();

    const enter = bubbles
      .enter()
      .append("g")
      .attr("class", "bubble")
      .style("cursor", "pointer");

    // Pointer events for tap / long-press
    enter.each(function () {
      const group = d3.select(this);
      group
        .on("pointerdown", function (event: PointerEvent) {
          event.preventDefault();
          const d = d3.select<SVGGElement, SimNode>(this).datum();
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
          const d = d3.select<SVGGElement, SimNode>(this).datum();
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

    // Main sphere with 3D gradient + shadow
    enter
      .append("circle")
      .attr("class", "main-circle")
      .attr("r", 0)
      .attr("fill", (d) => `url(#sphere-${d.risk_grade})`)
      .attr("stroke", (d) => `url(#stroke-${d.risk_grade})`)
      .attr("stroke-width", 1.5)
      .attr("filter", "url(#bubble-shadow)")
      .transition()
      .duration(addedIds.size > 0 ? 600 : 0)
      .ease(d3.easeElasticOut.amplitude(1).period(0.4))
      .attr("r", (d) => d.radius);

    // Specular highlight ellipse
    enter
      .append("ellipse")
      .attr("class", "specular-hl")
      .attr("cx", (d) => -d.radius * 0.2)
      .attr("cy", (d) => -d.radius * 0.25)
      .attr("rx", (d) => d.radius * 0.38)
      .attr("ry", (d) => d.radius * 0.22)
      .attr("fill", "url(#specular)")
      .attr("pointer-events", "none");

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

    // Borrower name label (top line) — only if available
    enter
      .append("text")
      .attr("class", "bubble-name")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => (d.borrower_name ? "-0.4em" : "0"))
      .attr("fill", "white")
      .attr("font-weight", "600")
      .attr("font-size", (d) => `${Math.max(8, d.radius / 4.5)}px`)
      .attr("pointer-events", "none")
      .style("text-shadow", "0 1px 3px rgba(0,0,0,0.35)")
      .style("opacity", 0)
      .text((d) => d.borrower_name ?? "")
      .transition()
      .delay(300)
      .duration(300)
      .style("opacity", (d) => (d.borrower_name ? "1" : "0"));

    // Amount label
    enter
      .append("text")
      .attr("class", "bubble-amount")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => (d.borrower_name ? "1em" : "0.1em"))
      .attr("fill", "rgba(255,255,255,0.9)")
      .attr("font-weight", "700")
      .attr("font-size", (d) => `${Math.max(10, d.radius / 3.2)}px`)
      .attr("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.25)")
      .style("opacity", 0)
      .text((d) => formatPounds(d.amount_pence))
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
      .attr("fill", (d) => `url(#sphere-${d.risk_grade})`)
      .attr("stroke", (d) => `url(#stroke-${d.risk_grade})`);

    merged.select(".specular-hl")
      .attr("cx", (d) => -d.radius * 0.2)
      .attr("cy", (d) => -d.radius * 0.25)
      .attr("rx", (d) => d.radius * 0.38)
      .attr("ry", (d) => d.radius * 0.22);

    merged.select(".highlight-ring").attr("r", (d) => d.radius + 2);

    merged
      .select(".bubble-name")
      .text((d) => d.borrower_name ?? "")
      .attr("font-size", (d) => `${Math.max(8, d.radius / 4.5)}px`);

    merged
      .select(".bubble-amount")
      .text((d) => formatPounds(d.amount_pence))
      .attr("font-size", (d) => `${Math.max(10, d.radius / 3.2)}px`);

    // Force simulation — active movement
    if (simulationRef.current) simulationRef.current.stop();

    const centerX = hudPosition === "side" ? width / 2 - 40 : width / 2;
    const centerY = hudPosition === "top" ? height / 2 + 30 : height / 2;

    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force("center", d3.forceCenter(centerX, centerY).strength(0.02))
      .force("charge", d3.forceManyBody<SimNode>().strength(-20))
      .force(
        "collide",
        d3
          .forceCollide<SimNode>()
          .radius((d) => d.radius + 6)
          .strength(0.8)
          .iterations(3),
      )
      .force("x", d3.forceX(centerX).strength(0.01))
      .force("y", d3.forceY(centerY).strength(0.01))
      .alphaDecay(0.003)
      .velocityDecay(0.12)
      .on("tick", () => {
        merged.attr("transform", (d) => {
          const r = d.radius;
          d.x = Math.max(r, Math.min(width - r, d.x ?? width / 2));
          d.y = Math.max(r, Math.min(height - r, d.y ?? height / 2));
          return `translate(${d.x},${d.y})`;
        });
      });

    simulationRef.current = simulation;

    // Frequent jiggle for active floating
    const jiggleInterval = setInterval(() => {
      simulation.alpha(0.4).restart();
      nodes.forEach((node) => {
        node.vx = (node.vx ?? 0) + (Math.random() - 0.5) * 6;
        node.vy = (node.vy ?? 0) + (Math.random() - 0.5) * 6;
      });
    }, 1800);

    return () => {
      clearInterval(jiggleInterval);
      simulation.stop();
    };
  }, [trades, filters, hudPosition, getRadius]);

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
