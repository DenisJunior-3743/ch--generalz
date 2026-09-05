export default function ChartTooltip({ x, y, rows }) {
  return (
    <div
      className="pointer-events-none absolute z-[5] -translate-x-1/2 translate-y-[calc(-100%-10px)] whitespace-nowrap rounded-sm bg-navy-dark px-2.5 py-1.5 text-xs leading-[1.4] text-white shadow-md"
      style={{ left: x, top: y }}
    >
      {rows.map((row) => (
        <div className="flex items-center gap-1.5" key={row.label}>
          {row.color && (
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ background: row.color }}
            />
          )}
          <span className="text-[13px] font-bold">{row.value}</span>
          <span className="ml-1.5 text-white/70">{row.label}</span>
        </div>
      ))}
    </div>
  );
}
