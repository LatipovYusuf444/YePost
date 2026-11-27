import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { kunMatni } from "@/lib/hujjatSanasi";
import { inventarizatsiyaniOchish } from "@/lib/inventarizatsiyaOchish";
import { useOmborStore } from "@/store/omborStore";

/**
 * 409 errors.inventory.later_stock_take (tasdiqlash, tahrir, bekor qilish): xato matni ostida keyinroq sanalgan inventarizatsiyani
 * ochadigan tugma. Bu xato qayta yuborilmaydi — foydalanuvchi o'sha hujjatni ko'rib, keyingi sana bilan qayta sanaydi.
 */
export default function KeyingiSanoqHavolasi() {
  const { t } = useTranslation("ombor_harakat");
  const keyingi = useOmborStore((state) => state.inventarizatsiyaKeyingiSanoq);
  if (!keyingi) return null;
  const sana = kunMatni(keyingi.sana);
  return (
    <button
      type="button"
      data-keyingi-sanoq={keyingi.id}
      onClick={() => inventarizatsiyaniOchish(keyingi.id)}
      className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
    >
      <ExternalLink size={13} className="shrink-0" aria-hidden />
      <span className="truncate">
        {t("inventarizatsiya.laterStockTake.open", { raqam: keyingi.raqam || t("inventarizatsiya.laterStockTake.document") })}
        {sana ? ` · ${sana}` : ""}
      </span>
    </button>
  );
}
