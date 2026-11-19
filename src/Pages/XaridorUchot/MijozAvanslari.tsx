import SmartTable from "@/Components/common/smart-table/SmartTable";
import { useEffect, useState } from "react";
import { HandCoins, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { mijozAvanslariniOlish, mijozAvansiniBekorQilish } from "@/api/boshlangichQarzApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { kunMatni } from "@/lib/hujjatSanasi";
import type { MijozAvansi } from "@/lib/mijozAvansi";
import { foydalanuvchiAdminmi } from "@/lib/roles";
import { muvaffaqiyatXabari } from "@/lib/toast";
import { oziValyutadaMatn } from "@/lib/valyuta";
import { useAuthProfileStore } from "@/store/authProfileStore";

/**
 * Mijozning boshlang'ich avanslari (dasturdan oldin biz mijozga qarzdor edik; AVB-): summa mijoz hisobiga tushgan, qarzlarini yopadi.
 * Bo'lim faqat avans bor bo'lsa chiqadi. Bekor qilish — ADMIN/DIREKTOR (tiklash yo'q); hisobdagi pul kassada sarflangan bo'lsa backend rad etadi.
 */
export default function MijozAvanslari({ xaridorId, yangilanish }: { xaridorId: string; yangilanish: number }) {
  const { t } = useTranslation("xaridor_uchot");
  const profil = useAuthProfileStore((holat) => holat.profil);
  const boshqaradi = foydalanuvchiAdminmi(profil);
  const [avanslar, setAvanslar] = useState<MijozAvansi[]>([]);
  const [xato, setXato] = useState("");
  const [bekorQilinadigan, setBekorQilinadigan] = useState<MijozAvansi | null>(null);
  const [qayta, setQayta] = useState(0);

  useEffect(() => {
    // Ro'yxat faqat ADMIN/DIREKTOR uchun (backend boshqalarga 403): boshqa rolda so'rov yuborilmaydi, bo'lim ko'rinmaydi.
    if (!boshqaradi) return;
    let faol = true;
    mijozAvanslariniOlish(xaridorId)
      .then((royxat) => { if (faol) setAvanslar(royxat); })
      // Ro'yxat olinmasa (masalan, KASSIR uchun 403) bo'lim ko'rsatilmaydi: qarzlar tabining asosiy qismi ishlayveradi.
      .catch(() => { if (faol) setAvanslar([]); });
    return () => { faol = false; };
  }, [xaridorId, yangilanish, qayta, boshqaradi]);

  async function bekorQilish() {
    if (!bekorQilinadigan) return false;
    try {
      await mijozAvansiniBekorQilish(xaridorId, bekorQilinadigan.id);
      muvaffaqiyatXabari(t("openingCredits.cancelled", { raqam: bekorQilinadigan.docNumber }));
      setXato("");
      setQayta((son) => son + 1);
      // Hisob balansi va qarzlar o'zgardi: qarzlar tabi va boshqa ro'yxatlar yangilanadi.
      window.dispatchEvent(new Event("savdo:yangilandi"));
      return true;
    } catch (error) {
      setXato(getApiErrorMessage(error));
      return false;
    }
  }

  if (avanslar.length === 0) return null;
  return (
    <section data-testid="mijoz-avanslari" className="rounded-[22px] border border-emerald-100 bg-emerald-50/40 p-4">
      <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-emerald-800">
        <HandCoins size={16} aria-hidden />{t("openingCredits.title")}
      </h3>
      <p className="mt-1 text-xs font-semibold leading-5 text-emerald-700/80">{t("openingCredits.hint")}</p>
      {xato && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600">{xato}</p>}
      <div className="mt-3 overflow-x-auto rounded-2xl border border-emerald-100 bg-white">
        <SmartTable tableId="XaridorUchot/MijozAvanslari/table-1" replaceColumnControls><table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th data-column-id="hujjat" className="px-4 py-3">{t("openingCredits.columns.document")}</th>
              <th data-column-id="sana" className="px-4 py-3">{t("openingCredits.columns.date")}</th>
              <th data-column-id="summa" className="px-4 py-3 text-right">{t("openingCredits.columns.amount")}</th>
              <th data-column-id="izoh" className="px-4 py-3">{t("openingCredits.columns.note")}</th>
              <th data-column-id="holat" className="px-4 py-3">{t("openingCredits.columns.status")}</th>
              <th data-column-id="amal" className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {avanslar.map((avans) => {
              const bekor = avans.status === "CANCELLED";
              return (
                <tr key={avans.id} className={bekor ? "bg-slate-50/60 text-slate-400" : "text-slate-800"}>
                  <td className="px-4 py-3 font-bold">{avans.docNumber || "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{avans.date ? kunMatni(avans.date) : "—"}</td>
                  <td className={`px-4 py-3 text-right font-black tabular-nums ${bekor ? "line-through" : "text-emerald-700"}`}>{oziValyutadaMatn(avans.amount, avans.currency)}</td>
                  <td className="max-w-[240px] break-words px-4 py-3">{avans.note || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${bekor ? "bg-red-50 text-red-600 ring-red-100" : "bg-emerald-50 text-emerald-700 ring-emerald-100"}`}>
                      {t(`openingCredits.status.${avans.status}`, { defaultValue: avans.status })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!bekor && boshqaradi && (
                      <button type="button" onClick={() => setBekorQilinadigan(avans)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-600 ring-1 ring-red-100 transition hover:bg-red-100">
                        <XCircle size={14} />{t("openingCredits.cancelAction")}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></SmartTable>
      </div>
      {bekorQilinadigan && (
        <TasdiqlashOynasi
          ikonka={<XCircle size={24} />}
          ohang="qizil"
          sarlavha={t("openingCredits.cancelConfirm.title")}
          nom={`${bekorQilinadigan.docNumber || "—"} · ${oziValyutadaMatn(bekorQilinadigan.amount, bekorQilinadigan.currency)}`}
          tavsif={t("openingCredits.cancelConfirm.description")}
          ortgaMatni={t("openingCredits.cancelConfirm.back")}
          tasdiqMatni={t("openingCredits.cancelConfirm.yes")}
          jarayonMatni={t("openingCredits.cancelConfirm.working")}
          onTasdiq={bekorQilish}
          onYopish={() => setBekorQilinadigan(null)}
        />
      )}
    </section>
  );
}
