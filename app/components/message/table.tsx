type TableData = {
  headers: Array<{ text: string; align?: "left" | "center" | "right" }>;
  rows: Array<Array<{ text: string }>>;
};

type MarkdownTableProps = {
  tableData: TableData;
};

export function MarkdownTable({ tableData }: MarkdownTableProps) {
  // Define the CSS classes for each element
  const tableClasses = "w-full caption-bottom text-sm my-0";
  const theadClasses = "[&_tr]:border-b rounded-t-lg";
  const tbodyClasses = "[&_tr:last-child]:border-0";
  const trClasses =
    "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted";
  const thClasses =
    "h-10 px-2 align-middle font-medium [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] sticky top-0 z-[5] bg-secondary py-2 text-sm text-foreground first:pl-4";
  const tdClasses =
    "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] min-w-8 overflow-hidden text-ellipsis whitespace-nowrap text-sm first:pl-4 [&:not(:last-child)]:max-w-[40ch]";

  const getAlignClass = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  return (
    <div className="my-4 overflow-clip">
      <div className="relative w-full overflow-hidden rounded-lg border border-accent/80">
        <div className="scrollbar-transparent relative z-[1] max-h-[60vh] overflow-auto pb-0">
          <table className={tableClasses}>
            <thead className={theadClasses}>
              <tr className={trClasses}>
                {tableData.headers.map((header, i) => (
                  <th
                    key={i}
                    className={`${thClasses} ${getAlignClass(header.align)}`}
                    dangerouslySetInnerHTML={{ __html: header.text }}
                  />
                ))}
              </tr>
            </thead>
            <tbody className={tbodyClasses}>
              {tableData.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={trClasses}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`${tdClasses} ${getAlignClass(tableData.headers[cellIndex]?.align)}`}
                      dangerouslySetInnerHTML={{ __html: cell.text }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
