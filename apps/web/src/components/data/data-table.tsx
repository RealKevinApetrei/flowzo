interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  emptyMessage = "No data available.",
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <p className="text-sm text-text-secondary">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted text-xs border-b border-warm-grey">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`py-2 pr-3 last:pr-0 ${col.align === "right" ? "text-right" : ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className="border-b border-warm-grey/50 last:border-0"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-2 pr-3 last:pr-0 ${col.align === "right" ? "text-right" : ""}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GradeBadge({ grade }: { grade: string }) {
  const style =
    grade === "A"
      ? "bg-success/15 text-success"
      : grade === "B"
        ? "bg-warning/15 text-warning"
        : "bg-danger/15 text-danger";

  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${style}`}
    >
      {grade}
    </span>
  );
}
