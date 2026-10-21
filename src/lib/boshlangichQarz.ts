export type BoshlangichQarzMalumoti = {
  amount: number;
  currency?: "UZS" | "USD";
  date?: string;
  note?: string;
};

type QarzFormasi = { amount: string; currency: string; date: string; note: string };
type QarzTekshiruvi = { payload: BoshlangichQarzMalumoti; error?: never } | { error: "amount" | "currency" | "date"; payload?: never };

// Eski qarz summasi o'z valyutasida yuboriladi; kursga aylantirilmaydi.
export function boshlangichQarzMalumoti(forma: QarzFormasi, bugun: string): QarzTekshiruvi {
  const matn = forma.amount.replace(/\s/g, "").replace(",", ".");
  const amount = Number(matn);
  if (!/^\d+(?:\.\d+)?$/.test(matn) || !Number.isFinite(amount) || amount <= 0) return { error: "amount" };
  if (forma.currency !== "UZS" && forma.currency !== "USD") return { error: "currency" };
  if (forma.date) {
    const sana = new Date(`${forma.date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(forma.date) || Number.isNaN(sana.getTime()) || sana.toISOString().slice(0, 10) !== forma.date || forma.date > bugun) {
      return { error: "date" };
    }
  }
  const note = forma.note.trim();
  return { payload: { amount, currency: forma.currency, ...(forma.date ? { date: forma.date } : {}), ...(note ? { note } : {}) } };
}

// Qarz va to'lovlar saqlanadi, lekin boshlang'ich qoldiq savdo aylanmasi emas.
export function savdoHujjatimi(hujjat: { isOpeningDebt?: boolean }): boolean {
  return hujjat.isOpeningDebt !== true;
}

export type QarzImportXatosi = { row?: number; column?: string; message: string; value?: string };
export type QarzImportNatijasi = {
  dryRun?: boolean;
  totalRows: number;
  validRows?: number;
  errors: QarzImportXatosi[];
  tekshiruvTasdiqlangan: boolean;
  radEtildi: boolean;
};

function obyekt(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

// Importdagi 400 javob ham qator xatolarini saqlaydi. Noma'lum javob hech qachon xatosiz deb olinmaydi.
export function qarzImportJavobi(raw: unknown): QarzImportNatijasi {
  const tashqi = obyekt(raw);
  const data = tashqi.data && !Array.isArray(tashqi.data) ? obyekt(tashqi.data) : tashqi;
  const details = obyekt(data.details ?? tashqi.details);
  const errors = data.errors ?? details.errors;
  const totalRows = Number(data.totalRows ?? data.total ?? 0);
  const validRows = data.validRows === undefined ? undefined : Number(data.validRows);
  const radEtildi = tashqi.success === false || data.success === false || data.valid === false || Number(data.errorCount ?? data.invalidRows ?? 0) > 0;
  return {
    dryRun: typeof data.dryRun === "boolean" ? data.dryRun : undefined,
    totalRows: Number.isFinite(totalRows) ? totalRows : 0,
    validRows,
    tekshiruvTasdiqlangan: Array.isArray(errors) && !radEtildi,
    radEtildi,
    errors: Array.isArray(errors) ? errors.map((entry): QarzImportXatosi => {
      const item = obyekt(entry);
      const row = Number(item.row ?? item.rowNumber);
      const message = item.message ?? item.error ?? (Array.isArray(item.constraints) ? item.constraints.map((entry) => obyekt(entry).message ?? entry) : entry);
      return {
        ...(Number.isFinite(row) && row > 0 ? { row } : {}),
        ...(item.column || item.field ? { column: String(item.column ?? item.field) } : {}),
        message: Array.isArray(message) ? message.map(String).join("; ") : String(message),
        ...(item.value !== undefined && item.value !== null ? { value: String(item.value) } : {}),
      };
    }) : [],
  };
}

export function qarzImportiniSaqlashMumkin(natija: QarzImportNatijasi | null): boolean {
  return Boolean(natija && natija.tekshiruvTasdiqlangan && natija.dryRun !== false && natija.totalRows > 0 &&
    natija.errors.length === 0 && (natija.validRows === undefined || natija.validRows === natija.totalRows));
}

export function mijozQarzXulosasi(hujjatlar: Array<{ summa: number; tolangan: number; qarz: number; currency?: string; isOpeningDebt?: boolean }>) {
  const aylanma = { UZS: 0, USD: 0 };
  const tolangan = { UZS: 0, USD: 0 };
  const qarz = { UZS: 0, USD: 0 };
  for (const item of hujjatlar) {
    const valyuta = item.currency === "USD" ? "USD" : "UZS";
    if (savdoHujjatimi(item)) aylanma[valyuta] += item.summa;
    tolangan[valyuta] += item.tolangan;
    qarz[valyuta] += item.qarz;
  }
  return { aylanma, tolangan, qarz };
}
