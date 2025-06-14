// ~/components/markdown-table.tsx

import { Marked, marked, type Tokens } from "marked";

// Create a dedicated marked instance with a custom renderer for tables.
const renderer = new marked.Renderer();

// In marked v5+, the 'table' renderer receives the full token and is responsible
// for rendering the entire table structure. We no longer need to override
// tablerow, tablecell, or heading.
renderer.table = (token: Tokens.Table) => {
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

  // Build the table header HTML
  const headerHtml = `
    <thead class="${theadClasses}">
      <tr class="${trClasses}">
        ${token.header
          .map((cell, i) => {
            const align = token.align[i]
              ? `text-${token.align[i]}`
              : "text-left";
            return `<th class="${thClasses} ${align}">${cell.text}</th>`;
          })
          .join("")}
      </tr>
    </thead>
  `;

  // Build the table body HTML
  const bodyHtml = `
    <tbody class="${tbodyClasses}">
      ${token.rows
        .map(
          (row) => `
        <tr class="${trClasses}">
          ${row
            .map((cell, i) => {
              const align = token.align[i]
                ? `text-${token.align[i]}`
                : "text-left";
              return `<td class="${tdClasses} ${align}">${cell.text}</td>`;
            })
            .join("")}
        </tr>
      `,
        )
        .join("")}
    </tbody>
  `;

  return `<table class="${tableClasses}">${headerHtml}${bodyHtml}</table>`;
};

const tableMarked = new Marked({ renderer });

type MarkdownTableProps = {
  markdown: string;
};

export function MarkdownTable({ markdown }: MarkdownTableProps) {
  // Parse the raw markdown string into HTML using our custom renderer
  const tableHtml = tableMarked.parse(markdown) as string;

  return (
    <div className="my-4 overflow-clip">
      <div className="relative w-full overflow-hidden rounded-lg border border-accent/80">
        <div className="scrollbar-transparent relative z-[1] max-h-[60vh] overflow-auto pb-0">
          {/* Render the generated HTML inside our styled wrappers */}
          <div dangerouslySetInnerHTML={{ __html: tableHtml }} />
        </div>
      </div>
    </div>
  );
}
