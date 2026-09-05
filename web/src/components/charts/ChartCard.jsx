import { useState } from "react";
import "./chart-primitives.css";

export default function ChartCard({
  title,
  subtitle,
  columns,
  rows,
  children,
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="flex min-w-0 flex-col rounded-lg border border-border bg-surface px-5 pb-3.5 pt-4.5 shadow-sm">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-[15px] text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <button
          type="button"
          className="shrink-0 cursor-pointer rounded-sm border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground"
          onClick={() => setShowTable((prev) => !prev)}
        >
          {showTable ? "View chart" : "View as table"}
        </button>
      </div>

      {showTable ? (
        <table className="w-full border-collapse text-[13px]">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              {columns.map((col, colIndex) => (
                <th
                  key={col}
                  scope="col"
                  className={`border-b border-border px-2.5 py-2 text-xs font-semibold text-muted-foreground ${
                    colIndex > 0 ? "text-right tabular-nums" : "text-left"
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`border-b border-border px-2.5 py-2 text-foreground ${
                      cellIndex > 0 ? "text-right tabular-nums" : "text-left"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative">{children}</div>
      )}
    </div>
  );
}
