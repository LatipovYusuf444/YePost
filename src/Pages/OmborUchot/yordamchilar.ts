import { boshlangichHujjatlar, boshlangichKirimlar } from "./mockData";
import type {
  ChiqimHujjat,
  Hujjat,
  HujjatHolati,
  InventarizatsiyaHujjat,
  KirimHujjat,
  Mahsulot,
  OmborItem,
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

export function chiqimJami(hujjat: Pick<ChiqimHujjat, "satrlar">) {
  return hujjat.satrlar.reduce((jami, satr) => jami + satr.soni * satr.tanNarx, 0);
}

export function inventarizatsiyaJami(hujjat: Pick<InventarizatsiyaHujjat, "satrlar">) {
  return hujjat.satrlar.reduce((jami, satr) => jami + satr.soni * satr.tanNarx, 0);
}

export function qoldiqlarniHisoblash() {
  const qoldiq = new Map<string, number>();

  function ozgartirish(omborId: string, mahsulotId: string, miqdor: number) {
    const kalit = `${omborId}::${mahsulotId}`;
    qoldiq.set(kalit, (qoldiq.get(kalit) ?? 0) + miqdor);
  }

  for (const hujjat of boshlangichKirimlar) {
    for (const satr of hujjat.satrlar) ozgartirish(satr.omborId, satr.mahsulotId, satr.soni);
  }
  for (const hujjat of boshlangichHujjatlar.chiqim) {
    for (const satr of hujjat.satrlar) ozgartirish(hujjat.omborId, satr.mahsulotId, -satr.miqdor);
  }
  for (const hujjat of boshlangichHujjatlar.kochirma) {
    for (const satr of hujjat.satrlar) {
      ozgartirish(hujjat.omborId, satr.mahsulotId, -satr.miqdor);
      if (hujjat.omborIdTo) ozgartirish(hujjat.omborIdTo, satr.mahsulotId, satr.miqdor);
    }
  }

  return qoldiq;
}
