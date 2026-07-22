import type {
  ChiqimHujjat,
  Hujjat,
  HujjatHolati,
  InventarizatsiyaHujjat,
  KirimHujjat,
  KochirmaHujjat,
  Mahsulot,
  OmborItem,
  RealizatsiyaHujjat,
  TarixYozuvi,
} from "./types";

export function hozirgiVaqt() {
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export function tarixgaQoshish(eski: TarixYozuvi[] | undefined, matn: string): TarixYozuvi[] {
  return [{ id: crypto.randomUUID(), matn, vaqt: hozirgiVaqt() }, ...(eski ?? [])];
}

export function pul(value: number) {
  return `${Number(value ?? 0).toLocaleString("uz-UZ")} so'm`;
}

export function sana(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function holatNomi(holati: HujjatHolati) {
  return holati === "tasdiqlangan" ? "Tasdiqlangan" : "Qoralama";
}

export function hujjatJami(hujjat: Pick<Hujjat, "satrlar">) {
  return hujjat.satrlar.reduce((jami, satr) => jami + satr.miqdor * satr.narx, 0);
}

export function mahsulotNomi(mahsulotlar: Mahsulot[], mahsulotId: string) {
  return mahsulotlar.find((mahsulot) => mahsulot.id === mahsulotId)?.nomi ?? "Noma'lum mahsulot";
}

export function omborNomi(omborlar: OmborItem[], omborId?: string) {
  if (!omborId) return "—";
  return omborlar.find((ombor) => ombor.id === omborId)?.nomi ?? "—";
}

export function kirimJami(hujjat: Pick<KirimHujjat, "satrlar">) {
  return hujjat.satrlar.reduce((jami, satr) => jami + satr.soni * satr.tanNarx, 0);
}

export function realizatsiyaJami(hujjat: Pick<RealizatsiyaHujjat, "satrlar">) {
  return hujjat.satrlar.reduce((jami, satr) => jami + satr.soni * satr.sotuvNarx, 0);
}

export function chiqimJami(hujjat: Pick<ChiqimHujjat, "satrlar">) {
  return hujjat.satrlar.reduce((jami, satr) => jami + satr.soni * satr.tanNarx, 0);
}

export function inventarizatsiyaJami(hujjat: Pick<InventarizatsiyaHujjat, "satrlar">) {
  return hujjat.satrlar.reduce((jami, satr) => jami + satr.soni * satr.tanNarx, 0);
}

export function kochirmaJami(hujjat: Pick<KochirmaHujjat, "satrlar">) {
  return hujjat.satrlar.reduce((jami, satr) => jami + satr.soni * satr.tanNarx, 0);
}
