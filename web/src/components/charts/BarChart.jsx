import { useRef, useState } from "react";
import ChartTooltip from "./ChartTooltip";
import { niceMax, formatNumber } from "./chartUtils";

const VIEW_W = 600;
const MARGIN = { top: 24, right: 12, bottom: 34, left: 36 };
const GRID_STEPS = [0, 0.25, 0.5, 0.75, 1];

export default function BarChart({
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
  const slot = plotW / data.length;
  const barWidth = Math.min(28, slot * 0.55);
  const baselineY = MARGIN.top + plotH;

  function handleHover(event, index) {
    const containerRect = containerRef.current.getBoundingClientRect();
    const barRect = event.currentTarget.getBoundingClientRect();
    setHover({
      index,
      x: barRect.left + barRect.width / 2 - containerRect.left,
      y: barRect.top - containerRect.top,
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

        {data.map((d, i) => {
          const barHeight = Math.max((d.value / maxValue) * plotH, 1);
          const x = MARGIN.left + i * slot + (slot - barWidth) / 2;
          const y = baselineY - barHeight;
          const fill = d.color || color;
          const isHovered = hover?.index === i;

          return (
            <g key={d.label}>
              <rect
                className="chart-mark"
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                ry={4}
                fill={fill}
                opacity={isHovered ? 1 : 0.94}
                tabIndex={0}
                role="img"
                aria-label={`${d.label}: ${valueFormatter(d.value)}`}
                onMouseEnter={(e) => handleHover(e, i)}
                onMouseMove={(e) => handleHover(e, i)}
                onMouseLeave={() => setHover(null)}
                onFocus={(e) => handleHover(e, i)}
                onBlur={() => setHover(null)}
              />
              {barHeight > 4 && (
                <rect
                  x={x}
                  y={baselineY - 4}
                  width={barWidth}
                  height={4}
                  fill={fill}
                  pointerEvents="none"
                />
              )}
              <text
                className="chart-value-label"
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
              >
                {valueFormatter(d.value)}
              </text>
              <text
                className="chart-axis-label"
                x={x + barWidth / 2}
                y={height - 10}
                textAnchor="middle"
              >
                {d.label}
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
              label: data[hover.index].label,
              value: valueFormatter(data[hover.index].value),
            },
          ]}
        />
      )}
    </div>
  );
}
