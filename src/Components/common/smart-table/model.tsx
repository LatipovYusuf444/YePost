import { Children, Fragment, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import type { TableColumn } from "./preferences";

export type NodeProps = {
  children?: ReactNode; className?: string; style?: React.CSSProperties; colSpan?: number; rowSpan?: number;
  hidden?: boolean;
  "data-column-id"?: string; "data-table-control"?: boolean; "aria-label"?: string; title?: string;
  "data-default-hidden"?: boolean;
  // Majburiy ustun (masalan Mahsulot, Soni): "Ustunlar" panelida o'chirib bo'lmaydi.
  "data-required"?: boolean;
};
export type TableNode = ReactElement<NodeProps>;

export function tag(node: TableNode): string | undefined {
  return typeof node.type === "string" ? node.type : (node.type as { smartTableTag?: string }).smartTableTag;
}

/** Flatten fragments/conditional arrays, preserving explicit cell and row keys. Never invoke custom renderers. */
export function elements(children: ReactNode): TableNode[] {
  return Children.toArray(children).flatMap(child => isValidElement<NodeProps>(child)
    ? child.type === Fragment ? elements(child.props.children) : [child] : []);
}

export function plainText(children: ReactNode): string {
  return Children.toArray(children).map(child => typeof child === "string" || typeof child === "number" ? String(child) : isValidElement<NodeProps>(child) ? plainText(child.props.children) : "").join(" ").trim();
}

export function analyzeTable(table: TableNode, actionLabel = "Amallar") {
  const sections = elements(table.props.children);
  const headers = sections.filter(s => tag(s) === "thead").flatMap(s => elements(s.props.children));
  const cells = headers.length === 1 ? elements(headers[0].props.children) : [];
  let compatible = cells.length > 0 && cells.every(c => tag(c) === "th" && (c.props.colSpan ?? 1) === 1 && (c.props.rowSpan ?? 1) === 1);
  const columns: TableColumn[] = cells.map((cell, index) => {
    const label = plainText(cell.props.children) || cell.props["aria-label"] || actionLabel;
    const required = Boolean(cell.props["data-required"]) || !plainText(cell.props.children) || /^(amal(?:lar)?|действи[ея]|actions?)$/i.test(label);
    const className = cell.props.className ?? "";
    return { id: cell.props["data-column-id"] ?? (cell.key ? String(cell.key) : `column-${index}`), label, required,
      min: required ? 48 : 80, max: required ? 240 : 800,
      ...(cell.props["data-default-hidden"] ? { defaultHidden: true } : {}),
      defaultPin: className.includes("sticky") ? className.includes("right-0") ? "right" : className.includes("left-0") ? "left" : undefined : undefined };
  });
  if (new Set(columns.map(c => c.id)).size !== columns.length) compatible = false;
  for (const section of sections.filter(s => ["tbody", "tfoot"].includes(tag(s) ?? ""))) {
    for (const row of elements(section.props.children)) {
      const rowCells = elements(row.props.children);
      const fullSpan = rowCells.length === 1 && rowCells[0].props.colSpan !== undefined && rowCells[0].props.colSpan >= columns.length;
      if (tag(row) !== "tr" || (!fullSpan && (rowCells.length !== columns.length || rowCells.some(c => !["td", "th"].includes(tag(c) ?? "") || (c.props.colSpan ?? 1) !== 1 || (c.props.rowSpan ?? 1) !== 1)))) compatible = false;
    }
  }
  return { columns, compatible, headers: cells };
}

export function stripControls(children: ReactNode): ReactNode {
  return Children.map(children, child => {
    if (!isValidElement<NodeProps>(child)) return child;
    if (child.props["data-table-control"]) return null;
    return child.props.children ? cloneElement(child, {}, stripControls(child.props.children)) : child;
  });
}

/** Reorder React elements, never DOM nodes or backend data. Full-width state rows keep their content. */
export function projectTable(table: TableNode, columns: TableColumn[], visible: TableColumn[], decorate: (cell: TableNode, column: TableColumn, header: boolean) => TableNode): TableNode {
  // Keep hidden editable cells mounted: toggling visibility must not discard unsaved input state.
  const order = [...visible, ...columns.filter(column => !visible.some(c => c.id === column.id))];
  return cloneElement(table, {}, elements(table.props.children).map(section => {
    const sectionTag = tag(section);
    if (sectionTag === "colgroup") {
      const cols = elements(section.props.children);
      return cloneElement(section, {}, visible.map(c => cols[columns.findIndex(original => original.id === c.id)]).filter(Boolean));
    }
    if (!["thead", "tbody", "tfoot"].includes(sectionTag ?? "")) return section;
    return cloneElement(section, {}, elements(section.props.children).map(row => {
      const cells = elements(row.props.children);
      if (cells.length === 1 && cells[0].props.colSpan !== undefined && cells[0].props.colSpan >= columns.length) return cloneElement(row, {}, cloneElement(cells[0], { colSpan: visible.length }));
      return cloneElement(row, {}, order.map(column => {
        const index = columns.findIndex(c => c.id === column.id);
        const cell = cells[index];
        // Assign identity from the ORIGINAL position before moving, so editable children stay mounted.
        const hidden = !visible.some(c => c.id === column.id);
        return decorate(cloneElement(cell, { key: column.id, hidden, style: hidden ? { ...cell.props.style, display: "none" } : cell.props.style }), column, sectionTag === "thead");
      }));
    }));
  }));
}
