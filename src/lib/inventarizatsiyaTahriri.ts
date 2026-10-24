import { rolniNormallashtirish } from "./roles.ts";
import type { InventarizatsiyaHujjati, InventarizatsiyaTahrirMalumoti, OmborQoldigi } from "../types/ombor.ts";

export function inventarizatsiyaTahririMumkin(hujjat: Pick<InventarizatsiyaHujjati, "status">, role?: string | null) {
  const rol = rolniNormallashtirish(role);
  return hujjat.status === "CONFIRMED" && (rol === "ADMIN" || rol === "DIREKTOR");
}

// Eski qatorning tizim qoldig'i sanash paytiga tegishli. Bugungi qoldiq uni almashtirmaydi.
export function inventarizatsiyaTahrirTanlovlari(hujjat: InventarizatsiyaHujjati, tanlovlar: OmborQoldigi[]): OmborQoldigi[] {
  const rows = new Map(tanlovlar.map(row => [row.modificationId, row]));
  for (const item of hujjat.items ?? []) {
    const current = rows.get(item.modificationId);
    const system = item.systemQuantity ?? item.expectedQuantity;
    rows.set(item.modificationId, {
      ...current,
      modificationId: item.modificationId,
      warehouseId: hujjat.warehouseId,
      // Boshlang'ich qoldiq yo'q bo'lsa uni bugungi qoldiq deb taxmin qilmaymiz.
      availableQuantity: system == null ? 0 : Number(system),
      modification: item.modification ?? current?.modification,
    });
  }
  // Yangi qo'shiladigan mahsulotlar uchun bugungi haqiqiy tizim qoldig'i ko'rsatiladi.
  return [...rows.values()].map(row => (hujjat.items ?? []).some(item => item.modificationId === row.modificationId)
    ? row : { ...row, availableQuantity: row.quantity ?? row.balance ?? row.availableQuantity ?? 0 });
}

export function inventarizatsiyaTahrirSorovi(hujjat: InventarizatsiyaHujjati, forma: {
  ids: string[]; actuals: Record<string, string>; note: string;
}): InventarizatsiyaTahrirMalumoti {
  if (!forma.ids.length) throw new Error("selectAtLeastOne");
  const items = forma.ids.map(modificationId => {
    const raw = forma.actuals[modificationId]?.trim();
    const actualQuantity = Number(raw);
    if (!raw || !Number.isFinite(actualQuantity) || actualQuantity < 0) throw new Error("invalidQuantity");
    return { modificationId, actualQuantity };
  });
  return {
    ...(hujjat.updatedAt ? { expectedUpdatedAt: hujjat.updatedAt } : {}),
    note: forma.note.trim(),
    type: hujjat.type === "FULL" ? "FULL" : "PARTIAL",
    ...(hujjat.responsibleId ? { responsibleId: hujjat.responsibleId } : {}),
    items,
  };
}
