import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Check, LoaderCircle, Search, UserPlus, X } from "lucide-react";
import { crmApi } from "@/api/crmApi";
import { mijozlarApi } from "@/api/partnersApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { muvaffaqiyatXabari } from "@/lib/toast";
import type { ChatThread } from "@/types/crm";
import type { Mijoz } from "@/types/partner";

const KORSATISH_LIMITI = 60;

function mijozNomi(mijoz: Mijoz) {
  return [mijoz.lastName, mijoz.firstName, mijoz.middleName].filter(Boolean).join(" ").trim() || mijoz.phone || mijoz.id;
}

// Biriktirilmagan suhbatni mijozga bog'lash: PATCH /crm/chat/threads/:id/assign { partnerId }.
export default function MijozBiriktirish({
  suhbatId,
  suhbatNomi,
  onYopish,
  onBiriktirildi,
}: {
  suhbatId: string;
  suhbatNomi: string;
  onYopish: () => void;
  onBiriktirildi: (suhbat: Partial<ChatThread>) => void;
}) {
  const { t } = useTranslation("savdo_agenti");
  const [mijozlar, setMijozlar] = useState<Mijoz[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [qidiruv, setQidiruv] = useState(suhbatNomi.startsWith("@") || suhbatNomi.startsWith("#") ? "" : suhbatNomi);
  const [tanlanganId, setTanlanganId] = useState<string | null>(null);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  useEffect(() => {
    let faol = true;
    mijozlarApi
      .royxat()
      .then((royxat) => {
        if (faol) setMijozlar(royxat);
      })
      .catch((error) => {
        if (faol) setXato(getApiErrorMessage(error));
      })
      .finally(() => {
        if (faol) setYuklanmoqda(false);
      });
    return () => {
      faol = false;
    };
  }, []);

  useEffect(() => {
    function tugma(event: KeyboardEvent) {
      if (event.key === "Escape" && !saqlanmoqda) onYopish();
    }
    document.addEventListener("keydown", tugma);
    return () => document.removeEventListener("keydown", tugma);
  }, [onYopish, saqlanmoqda]);

  const topilganlar = useMemo(() => {
    const soz = qidiruv.trim().toLowerCase();
    // So'zlar tartibi muhim emas: Telegram'dagi "Ali Valiyev" kartadagi "Valiyev Ali" ni ham topadi.
    const sozlar = soz.split(/\s+/).filter(Boolean);
    const raqam = soz.replace(/\D/g, "");
    const mos = soz
      ? mijozlar.filter((mijoz) => {
          const nom = mijozNomi(mijoz).toLowerCase();
          return sozlar.every((qism) => nom.includes(qism)) || (raqam.length >= 3 && (mijoz.phone ?? "").replace(/\D/g, "").includes(raqam));
        })
      : mijozlar;
    return mos.slice(0, KORSATISH_LIMITI);
  }, [mijozlar, qidiruv]);

  async function biriktirish() {
    if (!tanlanganId || saqlanmoqda) return;
    setSaqlanmoqda(true);
    setXato(null);
    try {
      const javob = await crmApi.chatThreadPartnerBiriktirish(suhbatId, tanlanganId);
      muvaffaqiyatXabari(t("suhbat.assignDone"));
      onBiriktirildi(javob && typeof javob === "object" ? { ...javob, partnerId: javob.partnerId ?? tanlanganId } : { partnerId: tanlanganId });
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setSaqlanmoqda(false);
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mijoz-biriktirish-sarlavha"
      onClick={(event) => {
        if (!saqlanmoqda && event.target === event.currentTarget) onYopish();
      }}
      className="fixed inset-0 z-[99995] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[min(640px,calc(100dvh-32px))] w-full max-w-md flex-col overflow-hidden rounded-[26px] bg-white shadow-[0_28px_80px_rgba(15,23,42,.28)]">
        <div className="flex items-start gap-3 border-b border-slate-100 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <UserPlus size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="mijoz-biriktirish-sarlavha" className="text-base font-black text-slate-900">
              {t("suhbat.assignTitle")}
            </h3>
            <p className="mt-0.5 truncate text-sm font-bold text-blue-700">{suhbatNomi}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{t("suhbat.assignText")}</p>
          </div>
          <button
            type="button"
            onClick={onYopish}
            disabled={saqlanmoqda}
            aria-label={t("suhbat.cancel")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 pb-2">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={qidiruv}
              onChange={(event) => setQidiruv(event.target.value)}
              placeholder={t("suhbat.assignSearch")}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>
        </div>

        <div className="min-h-[160px] flex-1 overflow-y-auto px-2 pb-2">
          {yuklanmoqda ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-slate-400">
              <LoaderCircle size={18} className="animate-spin text-blue-600" />
              {t("suhbat.assignLoading")}
            </p>
          ) : topilganlar.length === 0 ? (
            <p className="py-10 text-center text-sm font-semibold text-slate-400">{t("suhbat.assignEmpty")}</p>
          ) : (
            <ul className="space-y-1">
              {topilganlar.map((mijoz) => {
                const tanlangan = mijoz.id === tanlanganId;
                return (
                  <li key={mijoz.id}>
                    <button
                      type="button"
                      onClick={() => setTanlanganId(mijoz.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                        tanlangan ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-800">{mijozNomi(mijoz)}</span>
                        {mijoz.phone && <span className="block truncate text-xs font-medium text-slate-400">{mijoz.phone}</span>}
                      </span>
                      {tanlangan && <Check size={16} className="shrink-0 text-blue-600" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {xato && <p role="alert" className="mx-4 mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-700">{xato}</p>}

        <div className="flex gap-3 border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={onYopish}
            disabled={saqlanmoqda}
            className="h-11 flex-1 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
          >
            {t("suhbat.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void biriktirish()}
            disabled={!tanlanganId || saqlanmoqda}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-black text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50"
          >
            {saqlanmoqda && <LoaderCircle size={16} className="animate-spin" />}
            {saqlanmoqda ? t("suhbat.assigning") : t("suhbat.assignConfirm")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
