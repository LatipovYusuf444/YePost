import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Bot, Clock3, LoaderCircle, Lock, PackageSearch, RefreshCw, RotateCcw, Save, ShieldAlert, Wallet } from "lucide-react";
import AppSelect from "@/Components/ui/AppSelect";
import SummaMaydoni from "@/Components/common/SummaMaydoni";
import XatoliMaydon from "@/Components/common/XatoliMaydon";
import { omborlarApi, xodimlar as xodimlarniOlish } from "@/api/omborApi";
import { savdoAgentiApi } from "@/api/savdoAgentiApi";
import { savdoSozlamalariApi } from "@/api/savdoSozlamalariApi";
import { useMaydonXatolari } from "@/hooks/useMaydonXatolari";
import { foydalanuvchiAdminmi } from "@/lib/roles";
import {
  AGENT_KORSATMA_UZUNLIGI,
  AGENT_NARX_TURLARI,
  AGENT_SON_CHEGARALARI,
  agentSozlamaOzgarishlari,
  agentSozlamaXatolari,
  formagaAylantirish,
  type AgentSozlamaFormasi,
} from "@/lib/savdoAgentiSozlama";
import { muvaffaqiyatXabari } from "@/lib/toast";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { faolXodimlar } from "./lidYordamchilari";

type Tanlov = { id: string; nom: string; faol?: boolean };

// Backend xato kodi (oxirgi qismi) → forma maydoni; validatsiya xatolari esa `errors[].field` bo'yicha o'zi bog'lanadi.
const XATO_QOIDALARI = {
  isEnabled: { maydonlar: ["isEnabled"], kodlar: ["agent_not_configured"] },
  priceType: { maydonlar: ["priceType"], kodlar: ["price_type_not_allowed"] },
  warehouseId: { maydonlar: ["warehouseId"], kodlar: ["warehouse_not_found"] },
  draftOwnerId: { maydonlar: ["draftOwnerId"], kodlar: ["agent_draft_owner_invalid"] },
  workStart: { maydonlar: ["workStart"], kodlar: ["agent_work_hours_invalid"] },
};

const MAYDON = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400";

/** Savdo agenti sozlamalari (GET/PATCH /settings/sales-agent) — faqat ADMIN va DIREKTOR. PATCH faqat o'zgargan maydonlarni yuboradi. */
export default function AgentSozlamalari() {
  const { t } = useTranslation("savdo_agenti");
  const profil = useAuthProfileStore((state) => state.profil);
  const rahbar = foydalanuvchiAdminmi(profil);
  const fx = useMaydonXatolari(XATO_QOIDALARI);
  const [asl, setAsl] = useState<AgentSozlamaFormasi | null>(null);
  const [forma, setForma] = useState<AgentSozlamaFormasi | null>(null);
  const [holat, setHolat] = useState<"yuklanmoqda" | "tayyor" | "xato">("yuklanmoqda");
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [omborlar, setOmborlar] = useState<Tanlov[]>([]);
  const [xodimlar, setXodimlar] = useState<Tanlov[]>([]);
  const [ruxsatliTurlar, setRuxsatliTurlar] = useState<string[] | null>(null);

  const yuklash = useCallback(async () => {
    setHolat("yuklanmoqda");
    try {
      const sozlama = formagaAylantirish(await savdoAgentiApi.sozlamalar());
      setAsl(sozlama);
      setForma(sozlama);
      setHolat("tayyor");
    } catch {
      setHolat("xato");
    }
  }, []);

  useEffect(() => {
    if (!rahbar) return;
    void yuklash();
    // Ro'yxatlar mustaqil: biri ochilmasa ham forma ishlaydi.
    omborlarApi
      .royxat()
      .then((royxat) => setOmborlar(royxat.filter((o) => Boolean(o.id)).map((o) => ({ id: o.id, nom: o.name || o.id }))))
      .catch(() => setOmborlar([]));
    xodimlarniOlish()
      .then((royxat) => {
        const faollar = new Set(faolXodimlar(royxat).map((x) => x.id));
        setXodimlar(
          royxat.filter((x) => Boolean(x.id)).map((x) => ({ id: x.id, nom: x.fullName || x.name || x.username || x.id, faol: faollar.has(x.id) }))
        );
      })
      .catch(() => setXodimlar([]));
    savdoSozlamalariApi
      .narxTurlariniOlish()
      .then((turlar) => setRuxsatliTurlar(turlar))
      .catch(() => setRuxsatliTurlar(null));
  }, [rahbar, yuklash]);

  const ozgarishlar = useMemo(() => (asl && forma ? agentSozlamaOzgarishlari(asl, forma) : {}), [asl, forma]);
  const ozgargan = Object.keys(ozgarishlar).length > 0;

  if (!rahbar) {
    return (
      <section className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[26px] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-100 text-slate-500">
          <Lock size={28} />
        </span>
        <h2 className="text-base font-black text-slate-900">{t("sozlama.adminOnlyTitle")}</h2>
        <p className="max-w-md text-sm leading-6 text-slate-500">{t("sozlama.adminOnly")}</p>
      </section>
    );
  }

  if (holat === "yuklanmoqda" && !forma) {
    return (
      <div className="flex min-h-[320px] items-center justify-center gap-2 rounded-[26px] border border-slate-200 bg-white text-sm font-semibold text-slate-500">
        <LoaderCircle size={18} className="animate-spin text-blue-600" />
        {t("sozlama.loading")}
      </div>
    );
  }

  if (holat === "xato" || !forma || !asl) {
    return (
      <div role="alert" className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-[26px] border border-red-100 bg-red-50/60 p-6 text-center">
        <p className="text-sm font-bold text-red-700">{t("sozlama.loadError")}</p>
        <button type="button" onClick={() => void yuklash()} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-bold text-red-700 ring-1 ring-red-200">
          <RefreshCw size={14} />
          {t("tasdiq.retry")}
        </button>
      </div>
    );
  }

  const joriy = forma;
  function ozgartir<K extends keyof AgentSozlamaFormasi>(kalit: K, qiymat: AgentSozlamaFormasi[K]) {
    setForma((eski) => (eski ? { ...eski, [kalit]: qiymat } : eski));
    fx.tozala(kalit);
    // Yoqish xatosi ombor/egaga bog'liq: ulardan biri tanlansa yoqish xatosi ham ketadi.
    if (kalit === "warehouseId" || kalit === "draftOwnerId") fx.tozala("isEnabled");
    if (kalit === "workStart" || kalit === "workEnd") fx.tozala("workStart", "workEnd");
  }

  async function saqlash() {
    const xatolar = agentSozlamaXatolari(joriy, ruxsatliTurlar);
    if (Object.keys(xatolar).length) {
      fx.ornat(Object.fromEntries(Object.entries(xatolar).map(([kalit, x]) => [kalit, t(`sozlama.errors.${x.kod}`, x.params)])));
      return;
    }
    if (!ozgargan) return;
    setSaqlanmoqda(true);
    try {
      const yangi = formagaAylantirish(await fx.kuzat(() => savdoAgentiApi.sozlamalarniYangilash(ozgarishlar)));
      setAsl(yangi);
      setForma(yangi);
      fx.ornat({});
      muvaffaqiyatXabari(t("sozlama.saved"));
    } catch {
      // Matn global toastda, maydon xatosi `fx.kuzat` orqali joyida.
    } finally {
      setSaqlanmoqda(false);
    }
  }

  // Narx turi: tannarx hech qachon; sotuv sozlamalarida o'chirilgan tur faqat hozir tanlangan bo'lsa ko'rinadi (xato bilan).
  const narxTurlari = AGENT_NARX_TURLARI.filter((tur) => !ruxsatliTurlar || ruxsatliTurlar.includes(tur) || tur === joriy.priceType);
  const xodimTanlovlari = xodimlar.filter((x) => x.faol || x.id === joriy.draftOwnerId);
  const omborTanlovlari = omborlar.some((o) => o.id === joriy.warehouseId) || !joriy.warehouseId ? omborlar : [...omborlar, { id: joriy.warehouseId, nom: joriy.warehouseId }];
  const yoqishMumkin = Boolean(joriy.warehouseId && joriy.draftOwnerId);

  return (
    <form
      data-agent-sozlamalari
      onSubmit={(event) => {
        event.preventDefault();
        void saqlash();
      }}
      className="space-y-4"
    >
      <Karta ikonka={<Bot size={20} />} sarlavha={t("sozlama.status.title")} izoh={t("sozlama.status.subtitle")}>
        <XatoliMaydon xato={fx.xato("isEnabled")}>
          <div className="flex items-start gap-4 rounded-2xl bg-slate-50 p-4">
            <div className="min-w-0 flex-1">
              <p id="agent-yoqish" className="text-sm font-black text-slate-900">
                {t(joriy.isEnabled ? "sozlama.status.on" : "sozlama.status.off")}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{t(yoqishMumkin ? "sozlama.status.hint" : "sozlama.status.needs")}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={joriy.isEnabled}
              aria-labelledby="agent-yoqish"
              data-agent-yoqish
              onClick={() => ozgartir("isEnabled", !joriy.isEnabled)}
              className={`relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${joriy.isEnabled ? "bg-blue-600" : "bg-slate-300"}`}
            >
              <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${joriy.isEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </XatoliMaydon>
      </Karta>

      <div className="grid gap-4 xl:grid-cols-2">
        <Karta ikonka={<PackageSearch size={20} />} sarlavha={t("sozlama.drafts.title")} izoh={t("sozlama.drafts.subtitle")}>
          <div className="space-y-4">
            <Yorliq matn={t("sozlama.drafts.priceType")} izoh={t("sozlama.drafts.priceTypeHint")}>
              <XatoliMaydon xato={fx.xato("priceType")}>
                <AppSelect value={joriy.priceType} onChange={(e) => ozgartir("priceType", e.target.value)} aria-label={t("sozlama.drafts.priceType")} className="h-11 w-full rounded-xl text-sm font-semibold" data-agent-narx-turi>
                  {narxTurlari.map((tur) => (
                    <option key={tur} value={tur}>
                      {t(`sozlama.priceTypes.${tur}`)}
                    </option>
                  ))}
                </AppSelect>
              </XatoliMaydon>
            </Yorliq>
            <Yorliq matn={t("sozlama.drafts.warehouse")} izoh={t("sozlama.drafts.warehouseHint")}>
              <XatoliMaydon xato={fx.xato("warehouseId")}>
                <AppSelect value={joriy.warehouseId} onChange={(e) => ozgartir("warehouseId", e.target.value)} aria-label={t("sozlama.drafts.warehouse")} className="h-11 w-full rounded-xl text-sm font-semibold" data-agent-ombor>
                  <option value="">{t("sozlama.notSelected")}</option>
                  {omborTanlovlari.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nom}
                    </option>
                  ))}
                </AppSelect>
              </XatoliMaydon>
            </Yorliq>
            <Yorliq matn={t("sozlama.drafts.owner")} izoh={t("sozlama.drafts.ownerHint")}>
              <XatoliMaydon xato={fx.xato("draftOwnerId")}>
                <AppSelect value={joriy.draftOwnerId} onChange={(e) => ozgartir("draftOwnerId", e.target.value)} aria-label={t("sozlama.drafts.owner")} className="h-11 w-full rounded-xl text-sm font-semibold" data-agent-ega>
                  <option value="">{t("sozlama.notSelected")}</option>
                  {xodimTanlovlari.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.faol === false ? `${x.nom} (${t("sozlama.inactive")})` : x.nom}
                    </option>
                  ))}
                  {joriy.draftOwnerId && !xodimTanlovlari.some((x) => x.id === joriy.draftOwnerId) && <option value={joriy.draftOwnerId}>{joriy.draftOwnerId}</option>}
                </AppSelect>
              </XatoliMaydon>
            </Yorliq>
          </div>
        </Karta>

        <Karta ikonka={<Wallet size={20} />} sarlavha={t("sozlama.debt.title")} izoh={t("sozlama.debt.subtitle")}>
          <div className="space-y-4">
            <Yorliq matn={t("sozlama.debt.uzs")}>
              <XatoliMaydon xato={fx.xato("debtLimitUzs")}>
                <div className="relative">
                  <SummaMaydoni value={joriy.debtLimitUzs} onChange={(v) => ozgartir("debtLimitUzs", v)} placeholder={t("sozlama.debt.unlimited")} aria-label={t("sozlama.debt.uzs")} className={`${MAYDON} pr-14`} data-agent-qarz-uzs />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">so'm</span>
                </div>
              </XatoliMaydon>
            </Yorliq>
            <Yorliq matn={t("sozlama.debt.usd")}>
              <XatoliMaydon xato={fx.xato("debtLimitUsd")}>
                <div className="relative">
                  <SummaMaydoni value={joriy.debtLimitUsd} onChange={(v) => ozgartir("debtLimitUsd", v)} placeholder={t("sozlama.debt.unlimited")} aria-label={t("sozlama.debt.usd")} className={`${MAYDON} pr-10`} data-agent-qarz-usd />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                </div>
              </XatoliMaydon>
            </Yorliq>
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
              <ShieldAlert size={14} className="mt-0.5 shrink-0" />
              {t("sozlama.debt.hint")}
            </p>
          </div>
        </Karta>
      </div>

      <Karta ikonka={<Clock3 size={20} />} sarlavha={t("sozlama.behavior.title")} izoh={t("sozlama.behavior.subtitle")}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Yorliq matn={t("sozlama.behavior.workStart")}>
            <XatoliMaydon xato={fx.xato("workStart")}>
              <input type="time" value={joriy.workStart} onChange={(e) => ozgartir("workStart", e.target.value)} aria-label={t("sozlama.behavior.workStart")} className={MAYDON} data-agent-ish-boshi />
            </XatoliMaydon>
          </Yorliq>
          <Yorliq matn={t("sozlama.behavior.workEnd")}>
            <XatoliMaydon xato={fx.xato("workEnd")}>
              <input type="time" value={joriy.workEnd} onChange={(e) => ozgartir("workEnd", e.target.value)} aria-label={t("sozlama.behavior.workEnd")} className={MAYDON} data-agent-ish-oxiri />
            </XatoliMaydon>
          </Yorliq>
          <SonMaydoni kalit="managerQuietMinutes" joriy={joriy} xato={fx.xato("managerQuietMinutes")} onChange={ozgartir} />
          <div className="hidden xl:block" />
          <SonMaydoni kalit="customerMessagesPerHour" joriy={joriy} xato={fx.xato("customerMessagesPerHour")} onChange={ozgartir} />
          <SonMaydoni kalit="agentRunsPerDay" joriy={joriy} xato={fx.xato("agentRunsPerDay")} onChange={ozgartir} />
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">{t("sozlama.behavior.workHint")}</p>
        <div className="mt-4">
          <Yorliq matn={t("sozlama.behavior.instructions")} izoh={t("sozlama.behavior.instructionsHint")}>
            <XatoliMaydon xato={fx.xato("extraInstructions")}>
              <textarea
                value={joriy.extraInstructions}
                maxLength={AGENT_KORSATMA_UZUNLIGI}
                rows={4}
                onChange={(e) => ozgartir("extraInstructions", e.target.value)}
                placeholder={t("sozlama.behavior.instructionsPlaceholder")}
                aria-label={t("sozlama.behavior.instructions")}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                data-agent-korsatma
              />
            </XatoliMaydon>
            <p className="mt-1 text-right text-[11px] font-semibold text-slate-400">
              {joriy.extraInstructions.length}/{AGENT_KORSATMA_UZUNLIGI}
            </p>
          </Yorliq>
        </div>
      </Karta>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,.06)] backdrop-blur">
        <span className="mr-auto text-xs font-semibold text-slate-500">{t(ozgargan ? "sozlama.unsaved" : "sozlama.upToDate")}</span>
        <button
          type="button"
          disabled={!ozgargan || saqlanmoqda}
          onClick={() => {
            setForma(asl);
            fx.ornat({});
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-40"
        >
          <RotateCcw size={14} />
          {t("sozlama.reset")}
        </button>
        <button
          type="submit"
          disabled={!ozgargan || saqlanmoqda}
          data-agent-saqlash
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50"
        >
          {saqlanmoqda ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
          {t("sozlama.save")}
        </button>
      </div>
    </form>
  );
}

function Karta({ ikonka, sarlavha, izoh, children }: { ikonka: ReactNode; sarlavha: string; izoh: string; children: ReactNode }) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">{ikonka}</span>
        <div className="min-w-0">
          <h2 className="text-base font-black text-slate-900">{sarlavha}</h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">{izoh}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Yorliq({ matn, izoh, children }: { matn: string; izoh?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-xs font-bold text-slate-600">{matn}</p>
      {children}
      {izoh && <p className="mt-1 text-[11px] leading-4 text-slate-400">{izoh}</p>}
    </div>
  );
}

function SonMaydoni({
  kalit,
  joriy,
  xato,
  onChange,
}: {
  kalit: keyof typeof AGENT_SON_CHEGARALARI;
  joriy: AgentSozlamaFormasi;
  xato?: string;
  onChange: (kalit: keyof typeof AGENT_SON_CHEGARALARI, qiymat: string) => void;
}) {
  const { t } = useTranslation("savdo_agenti");
  const { min, max } = AGENT_SON_CHEGARALARI[kalit];
  return (
    <Yorliq matn={t(`sozlama.behavior.${kalit}`)} izoh={t("sozlama.behavior.range", { min, max })}>
      <XatoliMaydon xato={xato}>
        {/* Butun son; 0 ham haqiqiy qiymat (jim turmaslik) — bo'sh ko'rsatilmaydi. */}
        <input
          type="text"
          inputMode="numeric"
          value={joriy[kalit]}
          onChange={(e) => onChange(kalit, e.target.value.replace(/\D/g, "").slice(0, 5))}
          aria-label={t(`sozlama.behavior.${kalit}`)}
          className={MAYDON}
          data-agent-son={kalit}
        />
      </XatoliMaydon>
    </Yorliq>
  );
}
