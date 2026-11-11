import { useEffect, useState } from "react";
import { ArrowRight, History, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cashOperationsApi } from "@/api/cashOperationsApi";
import { kassaTarixAmali, kassaTarixOzgarishlari, kassaTarixValyutalari, type KassaTarixMaydoni } from "@/lib/kassaTahriri";
import type { AuditLog } from "@/types/reports";
import { kassaSummasi, sanaFormat } from "./yordamchilar";

// Backend `type` → kassa turining nomi (`types.*`).
const TUR_NOMLARI: Record<string, string> = {
  CUSTOMER_PAYMENT: "xaridor_tolovi",
  EMPLOYEE_RETURN: "hisobdor_qaytardi",
  SUPPLIER_RETURN: "taminotchi_qaytardi",
  OTHER_INCOME: "boshqa_kirim",
  RETAIL_SALE: "donalik_savdo",
  SUPPLIER_PAYMENT: "taminot_tolovi",
  CUSTOMER_REFUND: "xaridorga_qaytarish",
  SALARY_PAYMENT: "ish_haqi",
  OTHER_EXPENSE: "boshqa_chiqim",
};
// Bog'langan hujjat id'lari (yetkazib beruvchi, mijoz, xodim) — o'qib bo'lmaydigan uuid: faqat "o'zgardi" deb ko'rsatiladi.
const ID_MAYDONLARI = new Set<KassaTarixMaydoni>(["supplierId", "customerId", "employeeId"]);

function vaqtMatni(qiymat?: string) {
  if (!qiymat) return "";
  const sana = new Date(qiymat);
  return Number.isNaN(sana.getTime()) ? "" : sana.toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tashkent" });
}

/**
 * Kassa amaliyotining tarixi (GET /audit/logs?resourceId=): kim, qachon va nima o'zgartirgani "oldin → keyin" ko'rinishida
 * ("Summa 4 500 000 → 4 000 000 so'm; Yusuf Latipov, 11.11.2026 15:10"). Ruxsat bo'lmasa yoki yozuv yo'q bo'lsa — qisqa izoh.
 */
export default function KassaAmaliyotTarixi({ refId, valyuta }: { refId: string; valyuta?: "UZS" | "USD" }) {
  const { t } = useTranslation("kassa_uchot");
  const [holat, setHolat] = useState<{ id: string; yozuvlar: AuditLog[] | null; xato: boolean }>({ id: "", yozuvlar: null, xato: false });

  useEffect(() => {
    let faol = true;
    cashOperationsApi
      .tarix(refId)
      .then((yozuvlar) => { if (faol) setHolat({ id: refId, yozuvlar, xato: false }); })
      // Audit jurnali odatda rahbarlar uchun: ruxsat bo'lmasa (403) oyna buzilmaydi, qisqa izoh chiqadi.
      .catch(() => { if (faol) setHolat({ id: refId, yozuvlar: [], xato: true }); });
    return () => { faol = false; };
  }, [refId]);

  const yozuvlar = holat.id === refId ? holat.yozuvlar : null;
  const tartiblangan = [...(yozuvlar ?? [])].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));

  function qiymat(maydon: KassaTarixMaydoni, son: unknown, val: "UZS" | "USD" | undefined): string {
    if (son === null || son === undefined || son === "") return "—";
    if (maydon === "amount") return kassaSummasi(Number(son), val ?? valyuta);
    if (maydon === "rate") return Number(son).toLocaleString("uz-UZ");
    if (maydon === "date") return sanaFormat(String(son));
    if (maydon === "paymentMethod") return t(`tarix.methods.${String(son)}`, { defaultValue: String(son) });
    if (maydon === "status") return t(`tarix.statuses.${String(son)}`, { defaultValue: String(son) });
    if (maydon === "type") return TUR_NOMLARI[String(son)] ? t(`types.${TUR_NOMLARI[String(son)]}`) : String(son);
    return String(son);
  }

  return (
    <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm" data-testid="kassa-tarixi">
      <div className="mb-4 flex items-center gap-2 border-b border-orange-100 pb-3">
        <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[#2563EB]">
          <History size={18} />
        </span>
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">{t("tarix.title")}</h3>
      </div>
      {yozuvlar === null ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-400">
          <LoaderCircle size={16} className="animate-spin" aria-hidden /> {t("loading")}
        </p>
      ) : tartiblangan.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-center text-xs font-semibold leading-5 text-slate-400">{t(holat.xato ? "tarix.unavailable" : "tarix.empty")}</p>
      ) : (
        <ol className="space-y-3">
          {tartiblangan.map((log, indeks) => {
            const ozgarishlar = kassaTarixOzgarishlari(log);
            const amal = kassaTarixAmali(log);
            const { oldin: valOldin, keyin: valKeyin } = kassaTarixValyutalari(log);
            return (
              <li key={log.id ?? indeks} className="rounded-2xl bg-slate-50/80 p-3.5 ring-1 ring-slate-100">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-sm font-black text-slate-800">
                    {t(`tarix.actions.${amal}`)}
                  </span>
                  <span className="text-[11px] font-bold tabular-nums text-slate-400">
                    {[log.user?.fullName || log.user?.username || t("tarix.system"), vaqtMatni(log.createdAt)].filter(Boolean).join(", ")}
                  </span>
                </p>
                {ozgarishlar.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {ozgarishlar.map((o) => (
                      <li key={o.maydon} className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <span className="font-black text-slate-700">{t(`tarix.fields.${o.maydon}`)}:</span>
                        {ID_MAYDONLARI.has(o.maydon) ? (
                          <span className="text-slate-500">{t("tarix.actions.UPDATE")}</span>
                        ) : (
                          <>
                            <span className="text-slate-400 line-through decoration-slate-300">{qiymat(o.maydon, o.oldin, valOldin)}</span>
                            <ArrowRight size={12} aria-hidden className="text-slate-400" />
                            <span className="text-slate-900">{qiymat(o.maydon, o.keyin, valKeyin)}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
