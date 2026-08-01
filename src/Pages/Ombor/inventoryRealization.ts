import type {
  ChiqimHujjati,
  InventarizatsiyaHujjati,
  KirimHujjati,
  KochirishHujjati,
} from "@/types/ombor";

export type InventoryRealizationType =
  | "kirim"
  | "chiqim"
  | "kochirish"
  | "inventarizatsiya";

type InventoryRealizationDocument =
  | KirimHujjati
  | ChiqimHujjati
  | KochirishHujjati
  | InventarizatsiyaHujjati;

const yakuniyStatuslar: Record<InventoryRealizationType, ReadonlySet<string>> = {
  kirim: new Set(["CONFIRMED"]),
  chiqim: new Set(["CONFIRMED"]),
  kochirish: new Set(["RECEIVED"]),
  inventarizatsiya: new Set(["CONFIRMED"]),
};

export function isCompletedInventoryDocument(
  type: InventoryRealizationType,
  status?: string
) {
  return yakuniyStatuslar[type].has(String(status ?? "").toUpperCase());
}

export function getInventoryRealizationDate(
  document: InventoryRealizationDocument,
  type: InventoryRealizationType
) {
  const dates = document as InventoryRealizationDocument & {
    approvedAt?: string;
    completedAt?: string;
    confirmedAt?: string;
    receivedAt?: string;
    sentAt?: string;
    updatedAt?: string;
    createdAt?: string;
  };

  if (type === "kochirish") {
    return (
      dates.receivedAt ??
      dates.completedAt ??
      dates.sentAt ??
      dates.updatedAt ??
      dates.createdAt
    );
  }

  if (type === "inventarizatsiya") {
    return (
      dates.confirmedAt ??
      dates.completedAt ??
      dates.approvedAt ??
      dates.updatedAt ??
      dates.createdAt
    );
  }

  return (
    dates.confirmedAt ??
    dates.approvedAt ??
    dates.completedAt ??
    dates.updatedAt ??
    dates.createdAt
  );
}
