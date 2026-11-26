// Mavjud mahsulotning variatsiyalari (tahrirlash oynasi): atributni aniqlash, o'zgarganini PATCH qilish uchun tana, tekshiruv.
// Variatsiya yaratilganda nomi atribut qiymatlaridan tuziladi ("0.4" yoki "Qizil / XL"), params esa { KG: "0.4" } —
// shu bog'lanishdan qaysi params kaliti atribut ekani aniqlanadi ("brand" kabi xarakteristikalar nomda bo'lmaydi).
// UI'siz va `@/` importlarisiz — testlarda ishlaydi.

export type VariatsiyaManbai = { id: string; name?: string | null; params?: Record<string, unknown> | null };

const NOM_AJRATGICH = " / ";
const ASOSIY_VARIANT = "Asosiy variant";

function oddiyQiymat(qiymat: unknown): qiymat is string | number {
  return (typeof qiymat === "string" && qiymat.trim() !== "") || (typeof qiymat === "number" && Number.isFinite(qiymat));
}

function nomQismlari(nom: string | null | undefined) {
  return (nom ?? "").split(NOM_AJRATGICH).map((qism) => qism.trim()).filter(Boolean);
}

/**
 * Variatsiya atributlari (params kalitlari) — birinchi variatsiyadagi tartibda. Kalit atribut hisoblanadi, agar u hamma variatsiyada
 * oddiy qiymat bo'lsa va (qiymati variatsiyalar orasida farq qilsa yoki har bir variatsiya nomida shu qiymat bo'lsa).
 */
export function variatsiyaAtributlari(variatsiyalar: readonly VariatsiyaManbai[]): string[] {
  if (variatsiyalar.length === 0) return [];
  const birinchi = variatsiyalar[0].params ?? {};
  return Object.keys(birinchi).filter((kalit) => {
    const qiymatlar = variatsiyalar.map((v) => v.params?.[kalit]);
    if (!qiymatlar.every(oddiyQiymat)) return false;
    const matnlar = qiymatlar.map((q) => String(q).trim());
    const farqli = new Set(matnlar).size > 1;
    const nomda = variatsiyalar.every((v, i) => nomQismlari(v.name).includes(matnlar[i]));
    return farqli || nomda;
  });
}

/**
 * Mahsulot variatsiyali hisoblanadimi: bir nechta variatsiya bo'lsa yoki yagona variatsiya "Asosiy variant" emas va atributi bor bo'lsa.
 * Variatsiyali mahsulotda "Asosiy variant narxlari" bloki va uni saqlash yo'li ishlatilmaydi (mavjud variatsiya buzilmasligi uchun).
 */
export function variatsiyalimi(variatsiyalar: readonly VariatsiyaManbai[]): boolean {
  if (variatsiyalar.length > 1) return true;
  if (variatsiyalar.length === 0) return false;
  const yagona = variatsiyalar[0];
  return (yagona.name ?? "").trim() !== ASOSIY_VARIANT && variatsiyaAtributlari(variatsiyalar).length > 0;
}

/** Tahrirlash maydonlari: atribut bo'lsa — har atribut qiymati; atributsiz bo'lsa — nom (`""` kaliti ostida). */
export function variatsiyaQiymatlari(v: VariatsiyaManbai, atributlar: readonly string[]): Record<string, string> {
  if (atributlar.length === 0) return { "": (v.name ?? "").trim() };
  return Object.fromEntries(atributlar.map((a) => [a, oddiyQiymat(v.params?.[a]) ? String(v.params?.[a]).trim() : ""]));
}

/** Qiymatlardan variatsiya nomi ("0.4", "Qizil / XL"). */
export function variatsiyaNomi(qiymatlar: Record<string, string>, atributlar: readonly string[]): string {
  if (atributlar.length === 0) return (qiymatlar[""] ?? "").trim();
  return atributlar.map((a) => (qiymatlar[a] ?? "").trim()).join(NOM_AJRATGICH);
}

/**
 * O'zgargan variatsiya uchun PATCH /catalog/modifications/:id tanasi (o'zgarmagan bo'lsa — null). Boshqa params kalitlari
 * (xarakteristikalar) saqlanadi. Nom atribut qiymatlaridan tuzilgan bo'lsa yangi qiymatlardan qayta tuziladi, aks holda (qo'lda
 * berilgan nom) o'zgarmaydi.
 */
export function variatsiyaPatchi(
  v: VariatsiyaManbai,
  atributlar: readonly string[],
  yangi: Record<string, string>
): { name: string; params?: Record<string, unknown> } | null {
  const eski = variatsiyaQiymatlari(v, atributlar);
  const ozgargan = Object.keys(eski).some((kalit) => (yangi[kalit] ?? "").trim() !== eski[kalit]);
  if (!ozgargan) return null;
  if (atributlar.length === 0) return { name: (yangi[""] ?? "").trim() };
  const eskiNom = variatsiyaNomi(eski, atributlar);
  const nomQiymatlardan = (v.name ?? "").trim() === eskiNom;
  const params: Record<string, unknown> = { ...(v.params ?? {}) };
  for (const a of atributlar) params[a] = (yangi[a] ?? "").trim();
  return { name: nomQiymatlardan ? variatsiyaNomi(yangi, atributlar) : (v.name ?? "").trim(), params };
}

/** Yangi variatsiya params: atribut qiymatlari + mavjud variatsiyalardagi umumiy xarakteristikalar (brand va h.k.). */
export function yangiVariatsiyaParams(
  mavjudlar: readonly VariatsiyaManbai[],
  atributlar: readonly string[],
  qiymatlar: Record<string, string>
): Record<string, unknown> | undefined {
  const params: Record<string, unknown> = {};
  const namuna = mavjudlar[0]?.params ?? {};
  for (const [kalit, qiymat] of Object.entries(namuna)) {
    if (atributlar.includes(kalit) || !oddiyQiymat(qiymat)) continue;
    if (mavjudlar.every((v) => v.params?.[kalit] === qiymat)) params[kalit] = qiymat;
  }
  for (const a of atributlar) params[a] = (qiymatlar[a] ?? "").trim();
  return Object.keys(params).length > 0 ? params : undefined;
}

export type VariatsiyaXatosi = "bosh" | "takror";

/** Tekshiruv: bo'sh qiymat va takrorlangan variatsiya (mavjudlar + yangilar bo'yicha). Kalit — qator kaliti. */
export function variatsiyalarniTekshirish(
  qatorlar: ReadonlyArray<{ kalit: string; qiymatlar: Record<string, string> }>,
  atributlar: readonly string[]
): Record<string, VariatsiyaXatosi> {
  const xatolar: Record<string, VariatsiyaXatosi> = {};
  const korilgan = new Map<string, string>();
  for (const qator of qatorlar) {
    const maydonlar = atributlar.length === 0 ? [""] : atributlar;
    if (maydonlar.some((m) => !(qator.qiymatlar[m] ?? "").trim())) {
      xatolar[qator.kalit] = "bosh";
      continue;
    }
    const nom = variatsiyaNomi(qator.qiymatlar, atributlar).toLocaleLowerCase();
    if (korilgan.has(nom)) xatolar[qator.kalit] = "takror";
    else korilgan.set(nom, qator.kalit);
  }
  return xatolar;
}
