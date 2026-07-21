import type { TimelineItem } from "@/types/crm";
import type { Mijoz, MijozKompaniyasi, YetkazibBeruvchi } from "@/types/partner";
import type { Sotuv } from "@/types/savdo";
import type { KirimHujjati } from "@/types/ombor";
import type {
  TarixYozuvi,
  Xaridor,
  XaridorKompaniyasi as UiKompaniya,
  XaridorSavdosi,
  XaridorTolovi,
  YetkazibBeruvchi as UiYetkazibBeruvchi,
  Kirim,
} from "./types";

const raqam = (value: unknown) => Number(value ?? 0) || 0;
type NomliLookup = { id: string; name?: string; fullName?: string; username?: string };
type HujjatLookup = { omborlar?: NomliLookup[]; masullar?: NomliLookup[] };
const lookupNomi = (items: NomliLookup[] | undefined, id: string | undefined) => {
  const item = items?.find((value) => value.id === id);
  return item?.fullName || item?.name || item?.username || "";
};

export function mijozniUiGa(item: Mijoz): Xaridor {
  const custom = item.partner?.customFields ?? item.customFields ?? {};
  const socials = item.socials ?? {};
  const extraPhones = Array.isArray(custom.extraPhones)
    ? custom.extraPhones.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  return {
    id: item.id,
    partnerId: item.partner?.id,
    ism: item.firstName ?? "",
    familiya: item.lastName ?? "",
    telefonlar: item.phone ? [item.phone, ...extraPhones] : extraPhones,
    ijtimoiy: {
      telegram: socials.telegram ?? item.telegramId ?? "",
      whatsapp: socials.whatsapp ?? (typeof custom.whatsapp === "string" ? custom.whatsapp : ""),
      instagram: socials.instagram ?? (typeof custom.instagram === "string" ? custom.instagram : ""),
    },
    manzil: item.address ?? "",
    kompaniyaId: item.companyId ?? "",
    lavozim: typeof custom.position === "string" ? custom.position : "",
    balans: raqam(item.balance),
    yaratganMasul: item.partner?.createdBy?.fullName || "Tizim",
    yaratilganSana: item.partner?.createdAt ?? item.createdAt ?? "",
    ozgartirilganSana: item.partner?.updatedAt ?? item.updatedAt ?? item.createdAt ?? "",
    customFields: custom,
  };
}

export function kompaniyaniUiGa(item: MijozKompaniyasi): UiKompaniya {
  return {
    id: item.id,
    partnerId: item.partner?.id,
    nomi: item.name,
    stir: item.inn ?? "",
    telefon: item.phone ?? "",
    aloqaShaxsi: item.contactPerson ?? "",
    aloqaTelefoni: "",
    lavozim: item.position ?? "",
    ijtimoiy: {
      telegram: item.socials?.telegram ?? "",
      whatsapp: item.socials?.whatsapp ?? "",
      instagram: item.socials?.instagram ?? "",
      website: item.socials?.website ?? "",
    },
    yaratganMasul: item.partner?.createdBy?.fullName || "Tizim",
    yaratilganSana: item.partner?.createdAt ?? item.createdAt ?? "",
    ozgartirilganSana: item.partner?.updatedAt ?? item.updatedAt ?? item.createdAt ?? "",
    ozgartirganMasul: item.partner?.updatedBy?.fullName || item.partner?.createdBy?.fullName || "Tizim",
    customFields: item.partner?.customFields ?? {},
  };
}

export function yetkazibBeruvchiniUiGa(item: YetkazibBeruvchi): UiYetkazibBeruvchi {
  return {
    id: item.id,
    partnerId: item.partner?.id,
    nomi: item.name,
    stir: item.inn ?? "",
    telefon: item.phone ?? "",
    aloqaShaxsi: item.contactPerson ?? "",
    aloqaTelefoni: "",
    lavozim: item.position ?? "",
    ijtimoiy: {
      telegram: item.socials?.telegram ?? "",
      whatsapp: item.socials?.whatsapp ?? "",
      instagram: item.socials?.instagram ?? "",
      website: item.socials?.website ?? "",
    },
    yaratganMasul: item.partner?.createdBy?.fullName || "Tizim",
    yaratilganSana: item.partner?.createdAt ?? item.createdAt ?? "",
    ozgartirilganSana: item.partner?.updatedAt ?? item.updatedAt ?? item.createdAt ?? "",
    ozgartirganMasul: item.partner?.updatedBy?.fullName || item.partner?.createdBy?.fullName || "Tizim",
    customFields: item.partner?.customFields ?? {},
  };
}

export function sotuvniUiGa(item: Sotuv, lookup: HujjatLookup = {}): XaridorSavdosi {
  const jami = raqam(item.totalAmount ?? item.total);
  const tolangan = raqam(item.paidAmount);
  const status = String(item.status ?? "").toUpperCase();
  return {
    id: item.id,
    xaridorId: item.customerId ?? item.customer?.id ?? "",
    nomi: item.note?.split("\n")[0] || item.docNumber || item.documentNumber || "Sotuv",
    raqam: item.docNumber || item.documentNumber || item.number || item.id,
    sana: item.date || item.createdAt || "",
    summa: jami,
    tolangan,
    holat: status === "CANCELLED" ? "bekor" : status === "DRAFT" ? "qoralama" : jami > tolangan ? "qarzdor" : "tolangan",
    ombor: item.warehouse?.name || lookupNomi(lookup.omborlar, item.warehouseId) || "Noma’lum ombor",
    masul: item.responsible?.fullName || item.responsible?.name || item.responsible?.username || lookupNomi(lookup.masullar, item.responsibleId) || "Biriktirilmagan",
  };
}

export function kirimniUiGa(item: KirimHujjati, lookup: HujjatLookup = {}): Kirim {
  const status = String(item.status ?? "").toUpperCase();
  const hisoblanganSumma = (item.items ?? []).reduce(
    (sum, row) => sum + raqam(row.quantity) * raqam(row.price),
    0
  );
  return {
    id: item.id,
    yetkazibBeruvchiId: item.supplierId,
    nomi: item.note?.split("\n")[0] || item.docNumber || item.documentNumber || "Kirim hujjati",
    raqam: item.docNumber || item.documentNumber || item.number || item.id,
    sana: item.date || item.createdAt || "",
    summa: raqam(item.totalAmount ?? item.total) || hisoblanganSumma,
    masul: item.responsible?.fullName || item.responsible?.name || lookupNomi(lookup.masullar, item.responsibleId) || "Biriktirilmagan",
    ombor: item.warehouse?.name || lookupNomi(lookup.omborlar, item.warehouseId) || "Noma’lum ombor",
    holat: status === "CANCELLED" ? "bekor" : status === "CONFIRMED" ? "qabul" : "kutilmoqda",
  };
}

function payload(item: TimelineItem) {
  return item.payload && typeof item.payload === "object" ? item.payload as Record<string, unknown> : {};
}

export function timelineniTarixga(customerId: string, item: TimelineItem, index: number): TarixYozuvi {
  const data = payload(item);
  const type = String(item.type ?? "");
  const turi = type === "PAYMENT" ? "tolov" : type === "COMMENT" ? "izoh" : type.startsWith("SALE") ? "savdo" : "ozgarish";
  return {
    id: item.id ?? `${customerId}-${index}`,
    xaridorId: customerId,
    turi,
    sarlavha: item.title || type.replaceAll("_", " ") || "CRM hodisasi",
    matn: item.text || item.description || String(data.text ?? data.subject ?? data.docNumber ?? ""),
    sana: item.createdAt || item.timestamp || "",
    muallif: item.actorName || item.actor?.fullName || item.actor?.name || item.user?.fullName || "Tizim",
  };
}

export function timelineniTolovga(customerId: string, item: TimelineItem, index: number): XaridorTolovi | null {
  if (item.type !== "PAYMENT") return null;
  const data = payload(item);
  const methods = Array.isArray(data.methods) ? data.methods as Array<Record<string, unknown>> : [];
  const payment = methods[0];
  const method = String(payment?.type ?? "CASH");
  return {
    id: item.id ?? `${customerId}-payment-${index}`,
    xaridorId: customerId,
    savdoRaqami: String(data.docNumber ?? "—"),
    sana: item.createdAt || item.timestamp || "",
    summa: methods.reduce((sum, row) => sum + raqam(row.amount), 0) || raqam(data.paidAmount),
    turi: method === "CARD" ? "karta" : method === "BANK" ? "bank" : "naqd",
    izoh: "Backend to‘lovi",
  };
}
