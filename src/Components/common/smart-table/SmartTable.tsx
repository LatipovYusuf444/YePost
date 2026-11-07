import { cloneElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type CSSProperties, type PointerEvent, type ReactElement } from "react";
import { ArrowLeft, ArrowRight, Columns3, GripVertical, Pin, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/Components/ui/popover";
import { useAuthStore } from "@/store/authStore";
import { sessiyaEgasi } from "@/lib/sessiyaIzolyatsiyasi";
import { analyzeTable, elements, projectTable, stripControls, tag, type TableNode } from "./model";
import { defaults, moveColumn, normalizePreferences, preferenceKey, readPreferenceValue, visibleColumns, writePreferences, type Preferences, type TableColumn } from "./preferences";
import "./smart-table.css";

const labels = {
  uz: { columns: "Ustunlar", comfortable: "Qulay", standard: "Normal", compact: "Ixcham", density: "Qator zichligi", reset: "Standart holatga qaytarish", actions: "Amallar", left: "Chapga", right: "O‘ngga", none: "Mahkamlanmagan", pin: "Mahkamlash", pinLeft: "Chapga mahkamlash", pinRight: "O‘ngga mahkamlash", width: "Kenglik", auto: "Avto", settings: "Ustun sozlamalari", close: "Yopish", resize: "Ustun kengligini o‘zgartirish", move: "Ustunni ko‘chirish", special: "Maxsus jadval: mavjud ustun boshqaruvlari saqlangan.", updated: "Jadval ko‘rinishi yangilandi", help: "Qo‘shimcha sozlamalar uchun ustun yonidagi belgini bosing." },
  ru: { columns: "Столбцы", comfortable: "Удобно", standard: "Обычно", compact: "Компактно", density: "Плотность строк", reset: "Восстановить вид по умолчанию", actions: "Действия", left: "Влево", right: "Вправо", none: "Не закреплён", pin: "Закрепление", pinLeft: "Закрепить слева", pinRight: "Закрепить справа", width: "Ширина", auto: "Авто", settings: "Настройки столбца", close: "Закрыть", resize: "Изменить ширину столбца", move: "Переместить столбец", special: "Особая таблица: сохранены существующие настройки столбцов.", updated: "Вид таблицы обновлён", help: "Нажмите значок рядом со столбцом для его настройки." },
};

type Props = { tableId: string; children: ReactElement<ComponentProps<"table">>; presentationOnly?: boolean; replaceColumnControls?: boolean };

export default function SmartTable({ tableId, children, presentationOnly = false, replaceColumnControls = false }: Props) {
  const { i18n } = useTranslation();
  const text = labels[i18n.language.startsWith("ru") ? "ru" : "uz"];
  const owner = useAuthStore(state => state.accessToken && state.username ? sessiyaEgasi(state.accessToken, state.username) : null);
  const model = useMemo(() => analyzeTable(children as TableNode, text.actions), [children, text.actions]);
  const { columns } = model;
  const compatible = model.compatible && !presentationOnly;
  const [stored, setStored] = useState<{ scope: string; key: string | null; prefs: unknown } | null>(null);
  const scope = `${owner ?? "anonymous"}\n${tableId}`;
  const prefs = normalizePreferences(stored?.scope === scope ? stored.prefs : null, columns);
  const visible = visibleColumns(columns, prefs);
  const tableRef = useRef<HTMLTableElement>(null);
  const cleanupResize = useRef<(() => void) | null>(null);
  const dragId = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [drop, setDrop] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);
  const settingsId = useId();
  const setSettingsVisibility = (open: boolean) => {
    setSettingsOpen(open);
    if (!open) setExpandedColumn(null);
  };
  const visibleSignature = JSON.stringify(visible.map(column => column.id));
  const widthSignature = JSON.stringify(prefs.widths);

  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table || !compatible) return;
    const headers = [...table.querySelectorAll<HTMLTableCellElement>("thead [data-smart-id]")];
    const measure = () => {
      for (const header of headers) {
        if (header.hidden) continue;
        const index = columns.findIndex(column => column.id === header.dataset.smartId);
        const width = header.getBoundingClientRect().width;
        if (index < 0 || width <= 0) continue;
        const property = `--smart-layout-width-${index}`;
        const value = `${width}px`;
        if (table.style.getPropertyValue(property) !== value) table.style.setProperty(property, value);
      }
    };
    measure();
    // Intrinsic content can be wider than the requested width. Sticky offsets must
    // use rendered widths, without persisting them or rerendering business rows.
    const observer = typeof window.ResizeObserver === "function" ? new window.ResizeObserver(measure) : null;
    observer?.observe(table);
    headers.forEach(header => observer?.observe(header));
    return () => observer?.disconnect();
  }, [compatible, columns, visibleSignature, widthSignature]);

  useEffect(() => {
    let active = true;
    void preferenceKey(owner, tableId).then(key => {
      // Keep the raw UI snapshot until render-time validation. Permission-dependent headers may arrive later.
      if (active) setStored(previous => previous?.scope === scope ? { ...previous, key } : { scope, key, prefs: key ? readPreferenceValue(key) : null });
    });
    return () => { active = false; cleanupResize.current?.(); };
  }, [owner, tableId, scope]);

  const update = (next: Preferences) => {
    const clean = normalizePreferences(next, columns);
    const key = stored?.scope === scope ? stored.key : null;
    setStored({ scope, key, prefs: clean });
    writePreferences(key, clean);
    setAnnouncement(text.updated);
  };

  function measuredWidths() {
    const widths = { ...prefs.widths };
    tableRef.current?.querySelectorAll<HTMLTableCellElement>("thead [data-smart-id]").forEach(cell => {
      if (cell.hidden) return;
      const id = cell.dataset.smartId!;
      widths[id] = cell.getBoundingClientRect().width;
    });
    return widths;
  }

  function resize(event: PointerEvent<HTMLElement>, column: TableColumn) {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    cleanupResize.current?.();
    const table = tableRef.current;
    if (!table) return;
    const widths = measuredWidths();
    const start = widths[column.id] ?? 160;
    const startX = event.clientX;
    const original = prefs;
    update({ ...prefs, widths });
    table.dataset.resizing = "true";
    let width = start, frame = 0;
    const index = columns.findIndex(c => c.id === column.id);
    const move = (e: globalThis.PointerEvent) => {
      width = Math.min(column.max, Math.max(column.min, start + e.clientX - startX));
      if (frame) return;
      frame = requestAnimationFrame(() => {
        table.style.setProperty(`--smart-width-${index}`, `${width}px`);
        frame = 0;
      });
    };
    const cleanup = () => {
      cancelAnimationFrame(frame);
      delete table.dataset.resizing;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", escape);
      cleanupResize.current = null;
    };
    const finish = () => { cleanup(); update({ ...prefs, widths: { ...widths, [column.id]: width } }); };
    const cancel = () => {
      cleanup();
      table.style.setProperty(`--smart-width-${index}`, `${original.widths[column.id] ?? start}px`);
      update(original);
    };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") cancel(); };
    cleanupResize.current = cleanup;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", escape);
  }

  function reorder(from: string, to: string) {
    const next = moveColumn(prefs, from, to);
    if (next !== prefs) update({ ...next, widths: measuredWidths() });
  }
  const frozen = compatible && Object.keys(prefs.widths).length > 0;
  const variable = (id: string) => `var(--smart-width-${columns.findIndex(c => c.id === id)})`;
  const layoutVariable = (id: string) => {
    const index = columns.findIndex(column => column.id === id);
    return `var(--smart-layout-width-${index}, var(--smart-width-${index}, 0px))`;
  };
  const offset = (column: TableColumn) => {
    const position = visible.findIndex(c => c.id === column.id);
    const preceding = prefs.pins[column.id] === "left" ? visible.slice(0, position) : visible.slice(position + 1);
    const pinned = preceding.filter(c => prefs.pins[c.id] === prefs.pins[column.id]);
    return pinned.length ? `calc(${pinned.map(c => layoutVariable(c.id)).join(" + ")})` : "0px";
  };

  let table = children;
  if (compatible) {
    table = projectTable(children as TableNode, columns, visible, (cell, column, header) => {
      const pin = prefs.pins[column.id];
      const cellStyle: CSSProperties = { ...cell.props.style };
      // Clear legacy stickiness when unpinned; actual offsets are based on the same colgroup widths.
      if (!pin && cell.props.className?.includes("sticky")) Object.assign(cellStyle, { position: "static", left: "auto", right: "auto", zIndex: "auto" });
      if (pin) Object.assign(cellStyle, { position: "sticky", left: "auto", right: "auto", [pin]: offset(column), zIndex: header ? 4 : 2 });
      const props = { style: cellStyle, "data-smart-id": column.id, "data-pinned": pin, "data-drop": header && drop === column.id ? "true" : undefined, "data-dragging-cell": header && dragging === column.id ? "true" : undefined,
        className: `${cell.props.className ?? ""} ${header ? "smart-table-heading" : ""}` };
      if (!header) return cloneElement(cell, props);
      const original = replaceColumnControls ? stripControls(cell.props.children) : cell.props.children;
      return cloneElement(cell, props,
        <span key="content" className="smart-heading-content">{original}</span>,
        <button key="drag" type="button" className="smart-column-grip" draggable aria-label={`${text.move}: ${column.label}`} title={`${text.move}: ${column.label}`}
          onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}
          onDragStart={e => { e.stopPropagation(); dragId.current = column.id; setDragging(column.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", column.id); const header = e.currentTarget.closest("th"); if (header) e.dataTransfer.setDragImage(header, 20, 20); }}
          onDragEnd={() => { dragId.current = null; setDragging(null); setDrop(null); }}><GripVertical size={13} aria-hidden /></button>,
        <span key="resize" role="separator" tabIndex={0} aria-orientation="vertical" aria-label={`${text.resize}: ${column.label}`} aria-valuemin={column.min} aria-valuemax={column.max} aria-valuenow={Math.round(prefs.widths[column.id] ?? 160)}
          className="smart-column-resize" onPointerDown={e => resize(e, column)} onClick={e => e.stopPropagation()}
          onKeyDown={e => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return; e.preventDefault(); e.stopPropagation(); const widths = measuredWidths(); const current = widths[column.id] ?? 160; update({ ...prefs, widths: { ...widths, [column.id]: e.key === "Home" ? column.min : e.key === "End" ? column.max : current + (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 40 : 10) } }); }} />,
        pin ? <Pin key="pin" size={11} className="smart-pin-icon" aria-label={pin === "left" ? text.pinLeft : text.pinRight} /> : null,
      );
    }) as ReactElement<ComponentProps<"table">>;
  }
  const style: CSSProperties & Record<string, string | number | undefined> = { ...children.props.style };
  if (frozen) {
    for (const c of columns) style[`--smart-width-${columns.indexOf(c)}`] = `${prefs.widths[c.id] ?? 160}px`;
  }
  // Requested col widths remain useful, but cannot squeeze unbroken values into
  // multiple lines. Let the existing container scroll when intrinsic widths grow.
  Object.assign(style, { tableLayout: "auto", width: "max-content", minWidth: "100%" });
  // Keep the same keyed section hierarchy when resizing starts, preserving input focus and local state.
  const sections = elements(table.props.children);
  const originalGroup = sections.find(section => tag(section) === "colgroup");
  const colgroup = frozen ? <colgroup key={originalGroup?.key ?? "smart-colgroup"}>{visible.map(c => <col key={c.id} style={{ width: variable(c.id) }} />)}</colgroup> : originalGroup ?? <colgroup key="smart-colgroup" />;
  table = cloneElement(table, {}, [colgroup, ...sections.filter(section => tag(section) !== "colgroup")]);
  const visibilityClass = (children.props.className ?? "").split(/\s+/)
    .filter(token => /^(?:(?:sm|md|lg|xl|2xl):)?(?:hidden|table)$/.test(token))
    .map(token => token.replace(/table$/, "block")).join(" ");

  return <div className={`smart-table-frame ${visibilityClass}`} hidden={children.props.hidden} data-density={prefs.density} data-smart-table={tableId} data-compatible={compatible} data-dragging={dragging ?? undefined}>
    <div className="smart-table-toolbar">
      <Popover open={settingsOpen} onOpenChange={setSettingsVisibility}>
        <PopoverTrigger asChild><button type="button" className="smart-settings-trigger"><Columns3 size={15} aria-hidden />{text.columns}</button></PopoverTrigger>
        <PopoverContent align="end" side="bottom" sideOffset={8} collisionPadding={12} avoidCollisions sticky="always" className="smart-table-settings" aria-labelledby={`${settingsId}-title`}>
          <div className="smart-settings-header">
            <div className="smart-settings-title"><span className="smart-settings-icon"><Columns3 size={15} aria-hidden /></span><strong id={`${settingsId}-title`}>{text.columns}</strong><button type="button" className="smart-settings-close" aria-label={text.close} onClick={() => setSettingsVisibility(false)}><X size={15} aria-hidden /></button></div>
            <p className="smart-settings-help">{compatible ? text.help : text.special}</p>
            <div role="group" aria-label={text.density} className="smart-density-control">{(["comfortable", "standard", "compact"] as const).map(density => <button type="button" key={density} aria-pressed={prefs.density === density} onClick={() => update({ ...prefs, density })}>{text[density]}</button>)}</div>
          </div>
          {compatible && <div className="smart-column-list">{prefs.order.map(id => {
            const column = columns.find(c => c.id === id)!;
            const shown = !prefs.hidden.includes(id);
            const lastPrimary = !column.required && columns.filter(c => !c.required && !prefs.hidden.includes(c.id)).length <= 1;
            const peers = visible.filter(c => prefs.pins[c.id] === prefs.pins[id]);
            const index = peers.findIndex(c => c.id === id);
            const expanded = expandedColumn === id;
            const detailsId = `${settingsId}-column-${columns.indexOf(column)}`;
            return <div key={id} className="smart-column-option" data-expanded={expanded}>
              <div className="smart-column-row">
                <label><input type="checkbox" checked={shown} disabled={column.required || (shown && lastPrimary)} onChange={() => update({ ...prefs, widths: measuredWidths(), hidden: shown ? [...prefs.hidden, id] : prefs.hidden.filter(item => item !== id) })} /><span title={column.label}>{column.label}</span></label>
                {prefs.pins[id] && <Pin size={12} className="smart-column-pin" aria-label={prefs.pins[id] === "left" ? text.pinLeft : text.pinRight} />}
                <button type="button" className="smart-column-toggle" aria-label={`${text.settings}: ${column.label}`} title={text.settings} aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpandedColumn(expanded ? null : id)}><SlidersHorizontal size={14} aria-hidden /></button>
              </div>
              <div id={detailsId} className="smart-column-details" hidden={!expanded}>
                <div className="smart-column-actions">
                  <button type="button" aria-label={`${text.left}: ${column.label}`} disabled={!shown || index <= 0} onClick={() => reorder(id, peers[index - 1].id)}><ArrowLeft size={14} aria-hidden /></button>
                  <button type="button" aria-label={`${text.right}: ${column.label}`} disabled={!shown || index < 0 || index === peers.length - 1} onClick={() => reorder(id, peers[index + 1].id)}><ArrowRight size={14} aria-hidden /></button>
                  <select aria-label={`${column.label}: ${text.pin}`} value={prefs.pins[id] ?? ""} onChange={e => { const pins = { ...prefs.pins }; if (e.target.value) pins[id] = e.target.value as "left" | "right"; else delete pins[id]; update({ ...prefs, widths: measuredWidths(), pins }); }}><option value="">{text.none}</option><option value="left">{text.pinLeft}</option><option value="right">{text.pinRight}</option></select>
                </div>
                <label className="smart-width-option"><span>{text.width}</span><input aria-label={`${text.width}: ${column.label}`} type="range" min={column.min} max={column.max} value={prefs.widths[id] ?? 160} onChange={e => update({ ...prefs, widths: { ...measuredWidths(), [id]: Number(e.target.value) } })} /><span className="smart-width-value">{prefs.widths[id] === undefined ? text.auto : `${Math.round(prefs.widths[id])}px`}</span></label>
              </div>
            </div>;
          })}</div>}
          <div className="smart-settings-footer"><button type="button" className="smart-reset" onClick={() => update(defaults(columns))}><RotateCcw size={14} aria-hidden />{text.reset}</button></div>
        </PopoverContent>
      </Popover>
    </div>
    {cloneElement(table, { ref: tableRef, style, className: `${table.props.className ?? ""} smart-data-table`,
      onDragOver: e => { const cell = (e.target as HTMLElement).closest<HTMLElement>("thead [data-smart-id]"); const id = cell?.dataset.smartId; if (compatible && dragId.current && id && prefs.pins[dragId.current] === prefs.pins[id]) { e.preventDefault(); setDrop(id); e.dataTransfer.dropEffect = "move"; } else if (dragId.current) setDrop(null); },
      onDragLeave: e => { if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget)) setDrop(null); },
      onDrop: e => { const id = (e.target as HTMLElement).closest<HTMLElement>("thead [data-smart-id]")?.dataset.smartId; if (dragId.current && id) { e.preventDefault(); reorder(dragId.current, id); } dragId.current = null; setDrop(null); setDragging(null); },
    })}
    <span className="smart-sr-only" role="status" aria-live="polite">{announcement}</span>
  </div>;
}
