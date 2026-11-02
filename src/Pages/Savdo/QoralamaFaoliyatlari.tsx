import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LoaderCircle } from "lucide-react";
import { crmApi, royxatniAjratish } from "@/api/crmApi";
import { mijozKompaniyalariApi, mijozlarApi } from "@/api/partnersApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";

type Faoliyat = { id: string; turKaliti: string; sarlavha: string; matn: string; sana: string };

const AKTIVLIK_TURLARI: Record<string, string> = { TASK: "activityTabs.task", MEETING: "activityTabs.meeting" };

function sanaMatni(sana: string) {
  const vaqt = new Date(sana);
  return Number.isNaN(vaqt.getTime())
    ? ""
    : vaqt.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Tahrirlash rejimi: mijozning saqlangan faoliyati (ish, vazifa, izoh, xabar). Yangi faoliyat yuqoridagi forma bilan qo'shiladi. */
export default function QoralamaFaoliyatlari({ customerId, clientCompanyId }: { customerId: string; clientCompanyId: string }) {
  const { t } = useTranslation("savdo_yangi");
  const [faoliyatlar, setFaoliyatlar] = useState<Faoliyat[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");

  useEffect(() => {
    let active = true;
    async function yuklash() {
      setXato("");
      setFaoliyatlar([]);
      if (!customerId && !clientCompanyId) return;
      setYuklanmoqda(true);
      try {
        const egasi = customerId ? await mijozlarApi.olish(customerId) : await mijozKompaniyalariApi.olish(clientCompanyId);
        const partnerId = egasi.partner?.id;
        if (!partnerId) return;
        const [ishlar, izohlar, xabarlar] = await Promise.all([
          crmApi.activities({ partnerId }),
          crmApi.partnerComments(partnerId, { limit: 50 }),
          crmApi.partnerChatTarixi(partnerId, { limit: 50 }),
        ]);
        if (!active) return;
        const hozir = new Date().toISOString();
        setFaoliyatlar([
          ...ishlar.map((ish) => ({
            id: ish.id,
            turKaliti: AKTIVLIK_TURLARI[String(ish.type)] ?? "activityTabs.work",
            sarlavha: ish.subject ?? "",
            matn: ish.description ?? ish.result ?? "",
            sana: ish.dueAt ?? ish.createdAt ?? hozir,
          })),
          ...royxatniAjratish(izohlar).map((izoh) => ({ id: izoh.id, turKaliti: "activityTabs.comment", sarlavha: "", matn: izoh.text ?? "", sana: izoh.createdAt ?? hozir })),
          ...royxatniAjratish(xabarlar).map((xabar, indeks) => ({ id: xabar.id ?? `xabar-${indeks}`, turKaliti: "activityTabs.message", sarlavha: "", matn: xabar.text ?? "", sana: xabar.createdAt ?? hozir })),
        ].sort((a, b) => b.sana.localeCompare(a.sana)));
      } catch (error) {
        if (active) setXato(getApiErrorMessage(error));
      } finally {
        if (active) setYuklanmoqda(false);
      }
    }
    void yuklash();
    return () => { active = false; };
  }, [customerId, clientCompanyId]);

  if (yuklanmoqda) {
    return (
      <p role="status" className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400">
        <LoaderCircle size={14} className="animate-spin" />
        {t("activity.savedLoading")}
      </p>
    );
  }
  if (xato) return <p className="mt-4 text-xs font-semibold text-amber-700">{xato}</p>;
  if (faoliyatlar.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">{t("activity.savedTitle")}</p>
      <ul className="max-h-64 space-y-2 overflow-y-auto">
        {faoliyatlar.map((faoliyat) => (
          <li key={faoliyat.id} className="rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-bold text-[#2563EB]">{t(faoliyat.turKaliti)}</span>
              <span className="text-[11px] font-semibold text-slate-400">{sanaMatni(faoliyat.sana)}</span>
            </div>
            {faoliyat.sarlavha && <p className="mt-1.5 font-bold text-slate-800">{faoliyat.sarlavha}</p>}
            {faoliyat.matn && <p className="mt-1 whitespace-pre-wrap break-words text-slate-600">{faoliyat.matn}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
