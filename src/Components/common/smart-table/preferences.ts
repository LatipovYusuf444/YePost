export type Density = "comfortable" | "standard" | "compact";
export type Pin = "left" | "right";
export type TableColumn = { id: string; label: string; required: boolean; min: number; max: number; defaultPin?: Pin; defaultHidden?: boolean };
export type Preferences = {
  version: 1;
  order: string[];
  hidden: string[];
  widths: Record<string, number>;
  pins: Record<string, Pin>;
  density: Density;
};

export function defaults(columns: TableColumn[]): Preferences {
  return { version: 1, order: columns.map(c => c.id), hidden: columns.filter(c => c.defaultHidden && !c.required).map(c => c.id), widths: {}, pins: Object.fromEntries(columns.filter(c => c.defaultPin).map(c => [c.id, c.defaultPin!])), density: "standard" };
}

/** Only known presentation fields and current column IDs may enter storage. */
export function normalizePreferences(value: unknown, columns: TableColumn[]): Preferences {
  const result = defaults(columns);
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1) return result;
  const input = value as Partial<Preferences>;
  const ids = new Set(result.order);
  const strings = (v: unknown) => Array.isArray(v) ? [...new Set(v.filter((id): id is string => typeof id === "string" && ids.has(id)))] : [];
  result.order = [...strings(input.order), ...result.order.filter(id => !strings(input.order).includes(id))];
  result.hidden = [...new Set([...strings(input.hidden), ...columns.filter(c => c.defaultHidden && !strings(input.order).includes(c.id)).map(c => c.id)])].filter(id => !columns.find(c => c.id === id)?.required);
  const primary = columns.filter(c => !c.required);
  if (primary.length && primary.every(c => result.hidden.includes(c.id))) result.hidden = result.hidden.filter(id => id !== primary[0].id);
  for (const column of columns) {
    const width = input.widths?.[column.id];
    if (typeof width === "number" && Number.isFinite(width)) result.widths[column.id] = Math.min(column.max, Math.max(column.min, width));
    const pin = input.pins?.[column.id];
    if (pin === "left" || pin === "right") result.pins[column.id] = pin;
    else if (input.pins && typeof input.pins === "object") delete result.pins[column.id];
  }
  if (["comfortable", "standard", "compact"].includes(input.density ?? "")) result.density = input.density!;
  return result;
}

export function visibleColumns(columns: TableColumn[], prefs: Preferences) {
  const visible = prefs.order.map(id => columns.find(c => c.id === id)).filter((c): c is TableColumn => Boolean(c) && !prefs.hidden.includes(c!.id));
  return [...visible.filter(c => prefs.pins[c.id] === "left"), ...visible.filter(c => !prefs.pins[c.id]), ...visible.filter(c => prefs.pins[c.id] === "right")];
}

export function moveColumn(prefs: Preferences, from: string, to: string): Preferences {
  if (from === to || !prefs.order.includes(from) || !prefs.order.includes(to) || prefs.pins[from] !== prefs.pins[to]) return prefs;
  const order = prefs.order.filter(id => id !== from);
  order.splice(prefs.order.indexOf(to), 0, from);
  return { ...prefs, order };
}

export function readPreferenceValue(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? "null"); }
  catch { return null; }
}

export function readPreferences(key: string, columns: TableColumn[]): Preferences {
  return normalizePreferences(readPreferenceValue(key), columns);
}

export function writePreferences(key: string | null, prefs: Preferences) {
  try { if (key) localStorage.setItem(key, JSON.stringify(prefs)); } catch { /* Private mode / quota: keep in-memory preferences. */ }
}

/** No tokens, account names, record IDs or row data are stored. */
export async function preferenceKey(owner: string | null, tableId: string): Promise<string | null> {
  if (!owner || !globalThis.crypto?.subtle) return null;
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(owner));
    const scope = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    return `yepost-table:v1:${scope}:${tableId}`;
  } catch { return null; }
}
