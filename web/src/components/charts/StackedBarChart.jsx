import { useRef, useState } from "react";
import ChartTooltip from "./ChartTooltip";

const VIEW_W = 600;
const BAR_HEIGHT = 40;
const GAP = 3;

export default function StackedBarChart({ data, ariaLabel, unit = "%" }) {
  const containerRef = useRef(null);
  const [hover, setHover] = useState(null);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  let cursor = 0;
  const segments = data.map((d) => {
    const width = (d.value / total) * VIEW_W;
    const segment = { ...d, x: cursor, width, share: (d.value / total) * 100 };
    cursor += width;
    return segment;
  });

  function handleHover(event, segment) {
    const containerRect = containerRef.current.getBoundingClientRect();
    const segRect = event.currentTarget.getBoundingClientRect();
    setHover({
      segment,
      x: segRect.left + segRect.width / 2 - containerRect.left,
      y: segRect.top - containerRect.top,
    });
  }

  return (
    <div className="relative" ref={containerRef}>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${VIEW_W} ${BAR_HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <clipPath id="stacked-bar-clip">
            <rect x={0} y={0} width={VIEW_W} height={BAR_HEIGHT} rx={10} ry={10} />
          </clipPath>
        </defs>
        <g clipPath="url(#stacked-bar-clip)">
          {segments.map((seg, i) => (
            <rect
              key={seg.label}
              className="chart-mark"
              x={seg.x}
              y={0}
              width={Math.max(
                seg.width - (i === segments.length - 1 ? 0 : GAP),
                0,
              )}
              height={BAR_HEIGHT}
              fill={seg.color}
              opacity={hover && hover.segment.label !== seg.label ? 0.85 : 1}
              tabIndex={0}
              role="img"
              aria-label={`${seg.label}: ${seg.share.toFixed(0)}${unit}`}
              onMouseEnter={(e) => handleHover(e, seg)}
              onMouseMove={(e) => handleHover(e, seg)}
              onMouseLeave={() => setHover(null)}
              onFocus={(e) => handleHover(e, seg)}
              onBlur={() => setHover(null)}
            />
          ))}
        </g>
      </svg>

      <div className="mt-3 flex flex-wrap gap-3.5">
        {segments.map((seg) => (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" key={seg.label}>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ background: seg.color }}
            />
            <span className="font-semibold text-foreground">
              {seg.share.toFixed(0)}
              {unit}
            </span>
            {seg.label}
          </div>
        ))}
      </div>

      {hover && (
        <ChartTooltip
          x={hover.x}
          y={hover.y}
          rows={[
            {
              label: hover.segment.label,
              value: `${hover.segment.share.toFixed(0)}${unit}`,
            },
          ]}
        />
      )}
    </div>
  );
}
