import type { Sotuv, SotuvMahsuloti, SotuvNarxTuri, SotuvYaratishMalumoti } from "../types/savdo.ts";
import { toshkentKuni } from "./hujjatSanasi.ts";
import { dollargaOgirish, qatorniBoshlash, raqamMatni, sonniOqish, sotuvValyutasigaKeltirish } from "./qoralamaTahriri.ts";
import type { ChegirmaTuri, NarxValyutasi } from "./savdoNarxlari.ts";
import { mijozgaMosSotuvNomi, sotuvSarlavhaMijozi } from "./sotuvNomi.ts";
import { valyutaYokiAsosiy } from "./asosiyValyuta.ts";

const kalitlar = {
  nom: ["Sotuv nomi", "Qoralama nomi", "Название продажи", "Название черновика"],
  bosqich: ["Bosqich", "Этап"],
  boshlanish: ["Boshlanish sanasi", "Дата начала"],
  tugash: ["Tugash sanasi", "Дата окончания"],
  izoh: ["Izoh", "Комментарий"],
  currency: ["Valyuta", "Валюта"],
} as const;
type IzohKaliti = keyof typeof kalitlar;

function izohniOqish(note = "") {
  const values: Record<IzohKaliti, string> = { nom: "", bosqich: "", boshlanish: "", tugash: "", izoh: "", currency: "" };
  const labels: Partial<Record<IzohKaliti, string>> = {};
  const qolgan: string[] = [];
  let izohBoshlandi = false;
  for (const line of note.split("\n")) {
    if (izohBoshlandi) { values.izoh += `\n${line}`; continue; }
    const match = /^([^:]+):[\t ]*(.*)$/.exec(line);
    const key = match && (Object.keys(kalitlar) as IzohKaliti[]).find((key) => (kalitlar[key] as readonly string[]).includes(match[1].trim()));
    if (key && match) {
      values[key] = match[2].trim();
      labels[key] = match[1].trim();
      if (key === "izoh") izohBoshlandi = true;
    } else if (line.trim()) qolgan.push(line);
  }
  return { values, labels, qolgan };
}

export function qoralamaFormasi(sotuv: Sotuv) {
  const { values } = izohniOqish(sotuv.note);
  return {
    nom: mijozgaMosSotuvNomi(values.nom, sotuvSarlavhaMijozi(sotuv)), bosqich: values.bosqich, boshlanish: values.boshlanish, tugash: values.tugash, izoh: values.izoh,
    warehouseId: sotuv.warehouseId ?? sotuv.warehouse?.id ?? "",
    customerId: sotuv.customerId ?? sotuv.customer?.id ?? "",
    clientCompanyId: sotuv.clientCompanyId ?? sotuv.clientCompany?.id ?? "",
    currency: valyutaYokiAsosiy(sotuv.currency || null),
    date: toshkentKuni(sotuv.date ?? sotuv.createdAt),
    walkInCustomerName: sotuv.walkInCustomerName ?? "",
    walkInCustomerPhone: sotuv.walkInCustomerPhone ?? "",
  };
}
export type QoralamaForma = ReturnType<typeof qoralamaFormasi>;

type XodimManbasi = { id: string; firstName?: string; lastName?: string; fullName?: string | null; name?: string; username?: string; role?: string | null };

/**
 * Sotuvni yaratgan xodim: ismi va roli. Sotuvda faqat `cashierId` keladi, ism /accounts/users ro'yxatidan olinadi (bu ro'yxat yopiq rolda — joriy
 * foydalanuvchi profilidan). Nom topilmasa bo'sh: UUID ekranga chiqmaydi.
 */
export function sotuvMasulTafsiloti(sotuv: Pick<Sotuv, "responsible" | "responsibleId" | "cashierId">, xodimlar: readonly XodimManbasi[], profil?: XodimManbasi | null) {
  const id = sotuv.responsibleId ?? sotuv.cashierId ?? sotuv.responsible?.id;
  const xodim = xodimlar.find((item) => item.id === id) ?? sotuv.responsible ?? (profil?.id === id ? profil : undefined);
  const nom = [xodim?.firstName, xodim?.lastName].filter(Boolean).join(" ") || xodim?.fullName?.trim() || xodim?.name?.trim() || xodim?.username?.trim() || "";
  return { nom, rol: nom ? xodim?.role ?? "" : "" };
}

export function sotuvMasuli(sotuv: Pick<Sotuv, "responsible" | "responsibleId" | "cashierId">, xodimlar: readonly XodimManbasi[], profil?: XodimManbasi | null) {
  const { nom, rol } = sotuvMasulTafsiloti(sotuv, xodimlar, profil);
  return nom ? [nom, rol].filter(Boolean).join(", ") : "—";
}

// ── Yaratish oynasi tahrirlash rejimida ochilganda: saqlangan qatorlar va PATCH tanasi ──────────────

/** Yaratish/tahrirlash oynasining bitta mahsulot qatori. */
export type QoralamaQatori = {
  modificationId: string;
  qoldiqKaliti: string;
  quantity: string;
  price: string;
  discount: string;
  // Narx turi (tan narx / chakana / ulgurji): `price` shu turdagi katalog narxi.
  priceType: SotuvNarxTuri;
  // Chegirma summada (`discount`) yoki foizda (`discountFoiz`) kiritiladi; backendga summa ketadi, foizda kiritilsa foiz ham (hisobot uchun).
  discountTuri: ChegirmaTuri;
  discountFoiz: string;
  // Sotuv birligi (pochka, qop): "" — asosiy birlik. `quantity`, `price` va chegirma shu birlikda.
  birlikId: string;
  // Sotuvchi "Sotuv narxi"ga katalog narxidan baland narx yozsa — farq (bir dona uchun ustama); backendga qo'lda narx bo'lib ketadi.
  ustama: string;
  /** Saqlangan qator: mahsulot hozirgi qoldiq ro'yxatida bo'lmasa ham nomi ko'rinadi. */
  saqlanganNom?: string;
  /** Kurs yo'qligi sababli sotuv valyutasiga o'tmagan qatorning saqlangan valyutasi: saqlash bloklanadi. */
  kutilayotganValyuta?: NarxValyutasi;
  /** Saqlangan valyutasi sotuvnikidan farq qilgan va tuzatilgan qator: saqlanmagan o'zgarish hisoblanadi. */
  tuzatilgan?: boolean;
  /** Chegirma "Umumiy chegirma" foizidan qo'yilgan (qo'lda o'zgartirilmagan): umumiy chegirma tozalanganda olib tashlanadi. */
  umumiyChegirmadan?: boolean;
};

const qoldiqKalitiniYigish = (modificationId: string, warehouseId: string) => (warehouseId ? `${modificationId}::${warehouseId}` : modificationId);

function saqlanganNomi(item: SotuvMahsuloti) {
  const mod = item.modification;
  const variant = mod?.name && mod.name !== "Asosiy variant" ? mod.name : "";
  return [mod?.product?.name, variant].filter(Boolean).join(" - ") || mod?.name || "";
}

/**
 * Saqlangan qoralama qatorlari → forma qatorlari. Narx va chegirma doim sotuv valyutasida (`sotuvValyutasigaKeltirish`).
 * Saqlangan narx katalogdan baland bo'lsa farq ustama sifatida ko'rsatiladi; past bo'lsa narx o'z holicha qoladi (qiymat o'zgarmaydi).
 */
export function qoralamaQatorlari(sotuv: Sotuv, p: {
  warehouseId: string;
  sotuvVal: NarxValyutasi;
  kurs: number;
  standartTur: SotuvNarxTuri;
  katalogNarxi?: (item: SotuvMahsuloti, tur: SotuvNarxTuri) => number;
}): QoralamaQatori[] {
  return (sotuv.items ?? []).map((item, indeks) => {
    const aslVal: NarxValyutasi = valyutaYokiAsosiy(item.currency ?? sotuv.currency);
    const nom = saqlanganNomi(item);
    const q = sotuvValyutasigaKeltirish(qatorniBoshlash(item, indeks, { nom, qatorValyutasi: aslVal }), p.sotuvVal, p.kurs, p.sotuvVal);
    const tur = item.priceType ?? p.standartTur;
    const narx = sonniOqish(q.narx) ?? 0;
    const katalog = p.katalogNarxi?.(item, tur) ?? 0;
    const ustamaBor = q.valyuta === p.sotuvVal && katalog > 0 && narx - katalog > 1e-6;
    return {
      modificationId: item.modificationId,
      qoldiqKaliti: qoldiqKalitiniYigish(item.modificationId, p.warehouseId),
      quantity: q.miqdor,
      price: ustamaBor ? raqamMatni(katalog) : q.narx,
      ustama: ustamaBor ? raqamMatni(narx - katalog) : "",
      discount: q.chegirmaFoiz ? "" : q.chegirma,
      discountTuri: q.chegirmaFoiz ? "foiz" : "sum",
      discountFoiz: q.chegirmaFoiz ? String(q.chegirmaFoiz) : "",
      priceType: tur,
      birlikId: q.birlikId ?? "",
      saqlanganNom: nom,
      ...(q.valyuta !== p.sotuvVal ? { kutilayotganValyuta: q.valyuta } : {}),
      ...(aslVal !== p.sotuvVal && q.valyuta === p.sotuvVal ? { tuzatilgan: true } : {}),
    };
  });
}

/** Sotuv valyutasi almashganda: saqlangan narx katalogdan qayta olinmaydi, aynan shu narx kurs bilan o'giriladi (musbat summa 0 ga tushmaydi). */
export function qoralamaQatoriniOgirish(q: QoralamaQatori, nishon: NarxValyutasi, kurs: number): QoralamaQatori {
  if (!(kurs > 0)) return q;
  const ogir = (matn: string) => {
    const son = sonniOqish(matn);
    if (son === null) return matn;
    return raqamMatni(nishon === "USD" ? dollargaOgirish(son, kurs) : Math.round(son * kurs));
  };
  return { ...q, price: ogir(q.price), discount: q.discountTuri === "sum" ? ogir(q.discount) : q.discount, ustama: ogir(q.ustama) };
}

/** PATCH /sales/:id qatori: `currency` doim sotuv valyutasi (u bo'lmasa server qatorni so'm deb saqlaydi). */
export function qoralamaQatorTanasi(p: {
  modificationId: string;
  miqdor: number;
  narx: number;
  chegirma: number;
  birlikId: string;
  sotuvVal: NarxValyutasi;
  tur: SotuvNarxTuri;
  turRuxsati: (tur: SotuvNarxTuri) => boolean;
  foiz: number | null;
}) {
  return {
    modificationId: p.modificationId,
    quantity: p.miqdor,
    price: p.narx,
    discount: p.chegirma,
    currency: p.sotuvVal,
    ...(p.birlikId ? { unitId: p.birlikId } : {}),
    ...(p.turRuxsati(p.tur) ? { priceType: p.tur } : {}),
    ...(p.foiz && p.chegirma > 0 ? { discountPercent: Math.min(p.foiz, 100) } : {}),
  };
}

function qatorImzosi(q: QoralamaQatori) {
  return [q.modificationId, q.quantity, q.price, q.discount, q.discountTuri, q.discountFoiz, q.priceType, q.birlikId, q.ustama].join("|");
}

export type QoralamaHolati = { maydonlar: Record<string, string>; qatorlar: QoralamaQatori[] };

/** Saqlanmagan o'zgarishlar soni: o'zgargan maydonlar va qatorlar (bo'sh qatorlar hisobga olinmaydi); tuzatilgan valyutali qator ham saqlanishi kerak. */
export function qoralamaOzgarishlari(asl: QoralamaHolati, joriy: QoralamaHolati) {
  const maydonlar = Object.keys(joriy.maydonlar).filter((kalit) => joriy.maydonlar[kalit] !== asl.maydonlar[kalit]).length;
  const aslQatorlar = asl.qatorlar.filter((q) => q.modificationId).map(qatorImzosi);
  const joriyQatorlar = joriy.qatorlar.filter((q) => q.modificationId);
  const qatorlar = Array.from({ length: Math.max(aslQatorlar.length, joriyQatorlar.length) }).filter((_, i) => {
    const qator = joriyQatorlar[i];
    return !qator || aslQatorlar[i] !== qatorImzosi(qator) || qator.tuzatilgan;
  }).length;
  return maydonlar + qatorlar;
}

/**
 * Stepper'ning faol qadami: oyna tepada bo'lsa `null` (to'ldirilganlik bo'yicha qadam qoladi), aks holda tepasi `chegara`dan o'tgan oxirgi karta.
 * Ro'yxat oxiriga yetilganda oxirgi karta.
 */
export function suzishQadami(tepalar: readonly number[], chegara: number, holat: { tepada: boolean; oxirida: boolean }) {
  if (holat.tepada) return null;
  if (holat.oxirida) return tepalar.length - 1;
  return tepalar.reduce((qadam, tepa, indeks) => (tepa <= chegara ? indeks : qadam), 0);
}

export function qoralamaPatch(sotuv: Sotuv, forma: QoralamaForma): Partial<SotuvYaratishMalumoti> {
  const asl = qoralamaFormasi(sotuv);
  const patch: Partial<SotuvYaratishMalumoti> = {};
  for (const key of ["warehouseId", "customerId", "clientCompanyId", "currency", "date", "walkInCustomerName", "walkInCustomerPhone"] as const) {
    if (forma[key] !== asl[key]) patch[key] = forma[key];
  }
  if (!asl.customerId && !asl.clientCompanyId && (forma.customerId || forma.clientCompanyId)) patch.saleType = "CLIENT";
  const metadataOzgarish = (["nom", "bosqich", "boshlanish", "tugash", "izoh"] as const).some((key) => forma[key].trim() !== asl[key].trim());
  const eskiAvtomatikNom = izohniOqish(sotuv.note).values.nom.trim() !== forma.nom.trim();
  if (metadataOzgarish || eskiAvtomatikNom || forma.currency !== asl.currency) {
    const { values, labels, qolgan } = izohniOqish(sotuv.note);
    const keys: IzohKaliti[] = ["nom", "bosqich", "currency", "boshlanish", "tugash"];
    const metadata = keys.map((key) => {
      const value = key === "currency" && forma.currency === asl.currency ? values.currency : forma[key];
      return value.trim() ? `${labels[key] ?? kalitlar[key][0]}: ${value.trim()}` : "";
    }).filter(Boolean);
    patch.note = [...metadata, ...qolgan, ...(forma.izoh.trim() ? [`${labels.izoh ?? "Izoh"}: ${forma.izoh.trim()}`] : [])].join("\n");
  }
  return patch;
}
