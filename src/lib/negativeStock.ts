export type NegativeStockWarning = {
  code: "NEGATIVE_STOCK";
  modificationId: string;
  productName: string;
  stockBefore: string | number;
  stockAfter: string | number;
};

export type ClosedNegative = {
  modificationId: string;
  productName: string;
  previousStock: string | number;
  stockAfter: string | number;
};

// Imperative cart actions read the same server permission as the reactive UI.
let negativeStockPermission = false;
export function setNegativeStockPermission(settings: { allowNegativeStock: boolean; canSellNegative: boolean }) {
  negativeStockPermission = settings.allowNegativeStock === true && settings.canSellNegative === true;
}
export function canSellNegativeStock() { return negativeStockPermission; }

export function stockQuantity(value: unknown) {
  if (value == null || String(value).trim() === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  const magnitude = Math.abs(number).toLocaleString("uz-UZ", { maximumFractionDigits: 6 });
  return number < 0 ? `−${magnitude}` : magnitude;
}

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};

// Both plain DTOs and { data: DTO, warnings/closedNegative } envelopes are supported.
export function negativeStockMessages(raw: unknown, url: string, method?: string, language = "uz") {
  if (method?.toLowerCase() !== "post") return [];
  const path = url.split("?")[0];
  const negativeAction = /\/(?:sales\/[^/]+\/confirm|inventory\/(?:write-offs\/[^/]+\/confirm|transfers\/[^/]+\/send))$/.test(path);
  const receiptAction = /\/inventory\/(?:purchases\/[^/]+\/confirm|transfers\/[^/]+\/receive|stock-takes\/[^/]+\/confirm)$/.test(path);
  const outer = record(raw);
  const inner = record(outer.data);
  const warnings = [...(Array.isArray(outer.warnings) ? outer.warnings : []), ...(Array.isArray(inner.warnings) ? inner.warnings : [])];
  const closed = [...(Array.isArray(outer.closedNegative) ? outer.closedNegative : []), ...(Array.isArray(inner.closedNegative) ? inner.closedNegative : [])];
  const messages: Array<{ kind: "warning" | "success"; text: string }> = [];
  if (negativeAction && Array.isArray(warnings)) for (const item of warnings) {
    const warning = record(item);
    if (warning.code !== "NEGATIVE_STOCK" || typeof warning.productName !== "string") continue;
    messages.push({ kind: "warning", text: language === "ru"
      ? `${warning.productName}: остаток был ${stockQuantity(warning.stockBefore)}, теперь ${stockQuantity(warning.stockAfter)}`
      : `${warning.productName}: qoldiq ${stockQuantity(warning.stockBefore)} edi, endi ${stockQuantity(warning.stockAfter)}` });
  }
  if (receiptAction && Array.isArray(closed)) for (const item of closed) {
    const entry = record(item);
    if (typeof entry.productName !== "string") continue;
    const transition = `${stockQuantity(entry.previousStock)} → ${stockQuantity(entry.stockAfter)}`;
    messages.push({ kind: "success", text: language === "ru"
      ? `${entry.productName}: минус закрыт (${transition})`
      : `${entry.productName}: minus yopildi (${transition})` });
  }
  return messages.filter((message, index) => messages.findIndex((other) => other.kind === message.kind && other.text === message.text) === index);
}

export function limitedStockQuantity(requested: number, available: number, canSellNegative = false) {
  const quantity = Math.max(requested, 0);
  return canSellNegative ? quantity : Math.min(quantity, Math.max(available, 0));
}

export function movementStockTotals(rows: Array<{ key: string; movement: number; openingBalance?: number | string; closingBalance?: number | string }>, previous: Map<string, number> = new Map()) {
  const balances = new Map<string, number>();
  const finite = (value: unknown) => value == null || value === "" || !Number.isFinite(Number(value)) ? undefined : Number(value);
  for (const row of rows) {
    if (balances.has(row.key)) continue;
    const closing = finite(row.closingBalance);
    balances.set(row.key, finite(row.openingBalance) ?? (closing === undefined ? previous.get(row.key) ?? 0 : closing - row.movement));
  }
  const total = () => [...balances.values()].reduce((sum, quantity) => sum + quantity, 0);
  const opening = total();
  const lines = rows.map((row) => {
    const before = total();
    balances.set(row.key, finite(row.closingBalance) ?? (balances.get(row.key) ?? 0) + row.movement);
    return { opening: before, closing: total() };
  });
  return { opening, lines, closing: total() };
}
