import type { TFunction } from "i18next";
import { getApiErrorMessage } from "@/api/sozlamalarApi";

// Backend ba'zi xatolarni tarjima kaliti ko'rinishida qaytaradi (masalan `errors.inventory.draft_only_editable`).
const BILINGAN_KALITLAR: Record<string, string> = {
  "errors.inventory.draft_only_editable": "draftOnlyEditable",
  "errors.inventory.draft_only_deletable": "draftOnlyDeletable",
  "errors.partners.supplier_not_found": "supplierNotFound",
};

export function zavodBonusiXatosi(error: unknown, t: TFunction) {
  const matn = getApiErrorMessage(error);
  const kalit = Object.keys(BILINGAN_KALITLAR).find((qism) => matn.includes(qism));
  return kalit ? t(`zavodBonusi.errors.${BILINGAN_KALITLAR[kalit]}`) : matn;
}
