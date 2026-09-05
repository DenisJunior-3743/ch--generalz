import { useRef, useState } from "react";
import ChartTooltip from "./ChartTooltip";
import { niceMax, formatNumber } from "./chartUtils";

const VIEW_W = 600;
const MARGIN = { top: 24, right: 16, bottom: 34, left: 36 };
const GRID_STEPS = [0, 0.25, 0.5, 0.75, 1];

export default function LineChart({
  data,
  ariaLabel,
  height = 220,
  color = "#2e3192",
  valueFormatter = formatNumber,
}) {
  const containerRef = useRef(null);
  const [hover, setHover] = useState(null);

  const plotW = VIEW_W - MARGIN.left - MARGIN.right;
  const plotH = height - MARGIN.top - MARGIN.bottom;
  const maxValue = niceMax(Math.max(...data.map((d) => d.value)));
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;
  const baselineY = MARGIN.top + plotH;

  const points = data.map((d, i) => ({
    ...d,
    x: MARGIN.left + i * stepX,
    y: baselineY - (d.value / maxValue) * plotH,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

  function handleHover(event, index) {
    const containerRect = containerRef.current.getBoundingClientRect();
    const dotRect = event.currentTarget.getBoundingClientRect();
    setHover({
      index,
      x: dotRect.left + dotRect.width / 2 - containerRect.left,
      y: dotRect.top - containerRect.top,
    });
  }

  return (
    <div className="relative" ref={containerRef}>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${VIEW_W} ${height}`}
        role="img"
        aria-label={ariaLabel}
      >
        {GRID_STEPS.map((frac) => {
          const y = MARGIN.top + plotH * (1 - frac);
          return (
            <g key={frac}>
              <line
                className={frac === 0 ? "chart-baseline" : "chart-gridline"}
                x1={MARGIN.left}
                x2={VIEW_W - MARGIN.right}
                y1={y}
                y2={y}
              />
              <text
                className="chart-tick-label"
                x={MARGIN.left - 8}
                y={y + 3}
                textAnchor="end"
              >
                {formatNumber(maxValue * frac)}
              </text>
            </g>
          );
        })}

        {hover && (
          <line
            className="chart-crosshair"
            x1={points[hover.index].x}
            x2={points[hover.index].x}
            y1={MARGIN.top}
            y2={baselineY}
          />
        )}

        <path
          className="chart-line-area"
          d={areaPath}
          style={{ fill: color, stroke: "none" }}
        />
        <path className="chart-line-path" d={linePath} style={{ stroke: color }} />

        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          const isHovered = hover?.index === i;
          return (
            <g key={p.label}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 6 : 4}
                fill={color}
                className="chart-dot"
              />
              <circle
                className="chart-mark"
                cx={p.x}
                cy={p.y}
                r={14}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${p.label}: ${valueFormatter(p.value)}`}
                onMouseEnter={(e) => handleHover(e, i)}
                onMouseMove={(e) => handleHover(e, i)}
                onMouseLeave={() => setHover(null)}
                onFocus={(e) => handleHover(e, i)}
                onBlur={() => setHover(null)}
              />
              {isLast && (
                <text
                  className="chart-value-label"
                  x={p.x}
                  y={p.y - 14}
                  textAnchor="middle"
                >
                  {valueFormatter(p.value)}
                </text>
              )}
              <text
                className="chart-axis-label"
                x={p.x}
                y={height - 10}
                textAnchor="middle"
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && (
        <ChartTooltip
          x={hover.x}
          y={hover.y}
          rows={[
            {
              label: points[hover.index].label,
              value: valueFormatter(points[hover.index].value),
            },
          ]}
        />
      )}
    </div>
  );
}
