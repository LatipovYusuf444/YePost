import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MapPin,
  MessagesSquare,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { savdoAgentiApi } from "@/api/savdoAgentiApi";
import { vaqtMatni } from "@/lib/hujjatSanasi";
import { foydalanuvchiAdminmi } from "@/lib/roles";
import type { AgentQoralamasi } from "@/lib/savdoAgentiSozlama";
import { muvaffaqiyatXabari, ogohlantirishXabari } from "@/lib/toast";
import { oziValyutadaMatn, valyutaKodi } from "@/lib/valyuta";
import { useAuthProfileStore } from "@/store/authProfileStore";
import RadEtishOynasi from "./RadEtishOynasi";
import { nisbiyVaqtMatni } from "./lidYordamchilari";

const SAHIFA_HAJMI = 20;
const YANGILASH_MS = 30_000;

/**
 * Agent ochgan, menejer tasdig'ini kutayotgan qoralamalar (GET /sales-agent/drafts). Tasdiqlash — sotuv qoralama bo'lib qoladi,
 * kassir odatdagidek tasdiqlaydi; rad etish — qoralama o'chadi, lid yo'qotiladi. Qaror tugmalari faqat ADMIN/DIREKTOR'ga.
 * `onSoni` — tab belgisi uchun jami (filtrsiz ro'yxatda).
 */
export default function TasdiqKutayotganlar({ onSoni }: { onSoni?: (soni: number) => void }) {
  const { t } = useTranslation("savdo_agenti");
  const profil = useAuthProfileStore((state) => state.profil);
  const qarorBera = foydalanuvchiAdminmi(profil);
  const [params, setParams] = useSearchParams();
  const suhbatId = params.get("thread");
  const [sahifa, setSahifa] = useState(1);
  const [royxat, setRoyxat] = useState<AgentQoralamasi[]>([]);
  const [jami, setJami] = useState(0);
  const [holat, setHolat] = useState<"yuklanmoqda" | "tayyor" | "xato">("yuklanmoqda");
  const [band, setBand] = useState<Record<string, "tasdiq" | "rad">>({});
  const [radEtiladigan, setRadEtiladigan] = useState<AgentQoralamasi | null>(null);
  const sorovRaqami = useRef(0);

  const yuklash = useCallback(
    async (fon = false) => {
      const raqam = ++sorovRaqami.current;
      if (!fon) setHolat("yuklanmoqda");
      try {
        const natija = await savdoAgentiApi.qoralamalar({ threadId: suhbatId, page: sahifa, pageSize: SAHIFA_HAJMI }, fon);
        if (raqam !== sorovRaqami.current) return;
        // Oxirgi sahifadagi yagona buyurtma hal qilinsa — oldingi sahifaga qaytiladi.
        if (natija.items.length === 0 && sahifa > 1 && natija.total > 0) {
          setSahifa((joriy) => Math.max(1, joriy - 1));
          return;
        }
        setRoyxat(natija.items);
        setJami(natija.total);
        if (!suhbatId) onSoni?.(natija.total);
        setHolat("tayyor");
      } catch {
        if (raqam !== sorovRaqami.current) return;
        if (!fon) setHolat("xato");
      }
    },
    [onSoni, sahifa, suhbatId]
  );

  useEffect(() => {
    void yuklash();
  }, [yuklash]);

  // Agent yangi buyurtma ochsa — ro'yxat o'zi yangilanadi (fon, toastsiz).
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void yuklash(true);
    }, YANGILASH_MS);
    return () => window.clearInterval(id);
  }, [yuklash]);

  useEffect(() => {
    setSahifa(1);
  }, [suhbatId]);

  // Qaror chiqarilgan (yoki boshqa menejer allaqachon hal qilgan) buyurtma ro'yxatdan darhol olinadi, keyin server bilan moslanadi.
  function royxatdanOlish(id: string) {
    setRoyxat((joriy) => joriy.filter((q) => q.id !== id));
    setJami((joriy) => Math.max(0, joriy - 1));
  }

  // 409 agent_draft_not_pending / 404 — buyurtma endi kutmayapti: matnni global toast beradi, ro'yxat yangilanadi.
  function eskirganmi(error: unknown) {
    return axios.isAxiosError(error) && (error.response?.status === 409 || error.response?.status === 404);
  }

  async function tasdiqlash(qoralama: AgentQoralamasi) {
    setBand((joriy) => ({ ...joriy, [qoralama.id]: "tasdiq" }));
    try {
      const natija = await savdoAgentiApi.tasdiqlash(qoralama.id);
      royxatdanOlish(qoralama.id);
      muvaffaqiyatXabari(t("tasdiq.approved"));
      if (!natija.customerNotified) ogohlantirishXabari(t("tasdiq.notNotified"));
    } catch (error) {
      if (eskirganmi(error)) royxatdanOlish(qoralama.id);
    } finally {
      setBand((joriy) => Object.fromEntries(Object.entries(joriy).filter(([id]) => id !== qoralama.id)));
      void yuklash(true);
    }
  }

  async function radEtish(qoralama: AgentQoralamasi, body: { lostReason: string; note?: string }) {
    setBand((joriy) => ({ ...joriy, [qoralama.id]: "rad" }));
    try {
      const natija = await savdoAgentiApi.radEtish(qoralama.id, body);
      royxatdanOlish(qoralama.id);
      setRadEtiladigan(null);
      muvaffaqiyatXabari(t("tasdiq.rejected"));
      if (!natija.customerNotified) ogohlantirishXabari(t("tasdiq.notNotified"));
    } catch (error) {
      if (eskirganmi(error)) {
        royxatdanOlish(qoralama.id);
        setRadEtiladigan(null);
      }
    } finally {
      setBand((joriy) => Object.fromEntries(Object.entries(joriy).filter(([id]) => id !== qoralama.id)));
      void yuklash(true);
    }
  }

  const sahifalarSoni = Math.max(1, Math.ceil(jami / SAHIFA_HAJMI));

  return (
    <section className="space-y-4" data-agent-tasdiq>
      <div className="flex flex-wrap items-center gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black text-slate-900">
            {t("tasdiq.title")}
            <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-black text-blue-700" data-agent-tasdiq-jami>
              {jami}
            </span>
          </h2>
          <p className="mt-0.5 text-xs font-medium leading-5 text-slate-500">{t(qarorBera ? "tasdiq.subtitle" : "tasdiq.subtitleReadOnly")}</p>
        </div>
        {suhbatId && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 py-1 pl-3 pr-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
            <MessagesSquare size={13} />
            {t("tasdiq.threadFilter")}
            <button
              type="button"
              aria-label={t("tasdiq.clearThread")}
              title={t("tasdiq.clearThread")}
              onClick={() => {
                const yangi = new URLSearchParams(params);
                yangi.delete("thread");
                setParams(yangi, { replace: true });
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-blue-100"
            >
              <X size={13} />
            </button>
          </span>
        )}
        <button
          type="button"
          onClick={() => void yuklash()}
          disabled={holat === "yuklanmoqda"}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={holat === "yuklanmoqda" ? "animate-spin" : ""} />
          {t("tasdiq.refresh")}
        </button>
      </div>

      {holat === "yuklanmoqda" && royxat.length === 0 ? (
        <div className="flex min-h-[260px] items-center justify-center gap-2 rounded-[22px] border border-slate-200 bg-white text-sm font-semibold text-slate-500">
          <LoaderCircle size={18} className="animate-spin text-blue-600" />
          {t("tasdiq.loading")}
        </div>
      ) : holat === "xato" ? (
        <div role="alert" className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-[22px] border border-red-100 bg-red-50/60 p-6 text-center">
          <p className="text-sm font-bold text-red-700">{t("tasdiq.loadError")}</p>
          <button type="button" onClick={() => void yuklash()} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-bold text-red-700 ring-1 ring-red-200">
            <RefreshCw size={14} />
            {t("tasdiq.retry")}
          </button>
        </div>
      ) : royxat.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-[22px] border border-slate-200 bg-white px-6 py-10 text-center" data-agent-tasdiq-bosh>
          <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <ShieldCheck size={30} />
          </span>
          <h3 className="text-base font-black text-slate-900">{t("tasdiq.empty")}</h3>
          <p className="max-w-md text-sm leading-6 text-slate-500">{t("tasdiq.emptyText")}</p>
        </div>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {royxat.map((qoralama) => (
            <QoralamaKartasi
              key={qoralama.id}
              qoralama={qoralama}
              qarorBera={qarorBera}
              band={band[qoralama.id]}
              onTasdiqlash={() => void tasdiqlash(qoralama)}
              onRadEtish={() => setRadEtiladigan(qoralama)}
            />
          ))}
        </ul>
      )}

      {sahifalarSoni > 1 && (
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
          <span>{t("tasdiq.pageOf", { page: sahifa, pages: sahifalarSoni })}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={sahifa <= 1}
              onClick={() => setSahifa((joriy) => Math.max(1, joriy - 1))}
              className="inline-flex h-9 items-center gap-1 rounded-xl bg-white px-3 font-bold text-slate-600 ring-1 ring-slate-200 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              {t("lid.prev")}
            </button>
            <button
              type="button"
              disabled={sahifa >= sahifalarSoni}
              onClick={() => setSahifa((joriy) => joriy + 1)}
              className="inline-flex h-9 items-center gap-1 rounded-xl bg-white px-3 font-bold text-slate-600 ring-1 ring-slate-200 disabled:opacity-40"
            >
              {t("lid.next")}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {radEtiladigan && (
        <RadEtishOynasi
          nom={radEtiladigan.mijozNomi || t("tasdiq.unknownCustomer")}
          onYopish={() => setRadEtiladigan(null)}
          onSaqlash={(body) => radEtish(radEtiladigan, body)}
        />
      )}
    </section>
  );
}

function QoralamaKartasi({
  qoralama,
  qarorBera,
  band,
  onTasdiqlash,
  onRadEtish,
}: {
  qoralama: AgentQoralamasi;
  qarorBera: boolean;
  band?: "tasdiq" | "rad";
  onTasdiqlash: () => void;
  onRadEtish: () => void;
}) {
  const { t } = useTranslation("savdo_agenti");
  const valyuta = valyutaKodi(qoralama.currency);
  const oluvchiBoshqa = qoralama.oluvchi && qoralama.oluvchi !== qoralama.mijozNomi;
  return (
    <li
      data-agent-qoralama={qoralama.id}
      className={`flex flex-col rounded-[22px] border bg-white shadow-sm ${qoralama.qarzOgohlantirishi ? "border-amber-200" : "border-slate-200"}`}
    >
      <header className="flex flex-wrap items-start gap-3 border-b border-slate-100 px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <UserRound size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-slate-900">{qoralama.mijozNomi || t("tasdiq.unknownCustomer")}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            {qoralama.mijozTelefoni && (
              <span className="inline-flex items-center gap-1">
                <Phone size={11} />
                {qoralama.mijozTelefoni}
              </span>
            )}
            {qoralama.yangiMijoz ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-700 ring-1 ring-amber-100">{t("tasdiq.walkIn")}</span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 ring-1 ring-emerald-100">{t("tasdiq.linkedCustomer")}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-base font-black text-slate-900" data-agent-qoralama-jami>
            {oziValyutadaMatn(qoralama.jami, valyuta)}
          </p>
          <p className="text-[11px] font-semibold text-slate-400" title={vaqtMatni(qoralama.createdAt)}>
            {nisbiyVaqtMatni(qoralama.createdAt, t)}
          </p>
        </div>
      </header>

      {qoralama.qarzOgohlantirishi && (
        <p role="status" data-agent-qarz-ogohlantirishi className="mx-4 mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800 ring-1 ring-amber-100">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {t("tasdiq.debtWarning")}
        </p>
      )}

      {/* Mahsulotlar: kartaning ichida ixcham ro'yxat (nom · miqdor × narx · summa) — telefonda ham yonma-yon aylantirishsiz. */}
      <ul className="mx-4 mt-3 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-100" aria-label={t("tasdiq.items")} data-agent-qatorlar>
        {qoralama.qatorlar.map((qator) => {
          const qatorValyutasi = valyutaKodi(qator.currency);
          return (
            <li key={qator.id} className="flex items-start gap-3 px-3 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <span className="block font-bold text-slate-800 [overflow-wrap:anywhere]">{qator.mahsulot || "—"}</span>
                {qator.variant && <span className="block text-[11px] font-semibold text-slate-400">{qator.variant}</span>}
              </div>
              <div className="shrink-0 text-right">
                <span className="block whitespace-nowrap font-black text-slate-900">{oziValyutadaMatn(qator.total, qatorValyutasi)}</span>
                <span className="block whitespace-nowrap text-[11px] font-semibold text-slate-500">
                  {t("tasdiq.lineQty", { miqdor: qator.quantity.toLocaleString("uz-UZ"), narx: oziValyutadaMatn(qator.price, qatorValyutasi) })}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {(qoralama.manzil || oluvchiBoshqa || qoralama.yetkazishIzohi || qoralama.note) && (
        <dl className="mx-4 mt-3 space-y-1.5 rounded-xl bg-slate-50 px-3 py-2.5 text-xs">
          {qoralama.manzil && (
            <div className="flex gap-2">
              <dt className="flex shrink-0 items-center gap-1 font-bold text-slate-500">
                <MapPin size={12} />
                {t("tasdiq.address")}
              </dt>
              <dd className="min-w-0 font-semibold text-slate-800 [overflow-wrap:anywhere]">{qoralama.manzil}</dd>
            </div>
          )}
          {oluvchiBoshqa && (
            <div className="flex gap-2">
              <dt className="shrink-0 font-bold text-slate-500">{t("tasdiq.recipient")}</dt>
              <dd className="min-w-0 font-semibold text-slate-800">
                {qoralama.oluvchi}
                {qoralama.oluvchiTelefoni ? ` · ${qoralama.oluvchiTelefoni}` : ""}
              </dd>
            </div>
          )}
          {(qoralama.yetkazishIzohi || qoralama.note) && (
            <div className="flex gap-2">
              <dt className="shrink-0 font-bold text-slate-500">{t("tasdiq.note")}</dt>
              <dd className="min-w-0 whitespace-pre-line font-semibold text-slate-800 [overflow-wrap:anywhere]">
                {[qoralama.yetkazishIzohi, qoralama.note].filter((x, i, a) => x && a.indexOf(x) === i).join("\n")}
              </dd>
            </div>
          )}
        </dl>
      )}

      <footer className="mt-auto flex flex-wrap items-center gap-2 px-4 py-3">
        {qoralama.suhbatId && (
          <Link
            to={`/savdo-agenti/suhbatlar?thread=${encodeURIComponent(qoralama.suhbatId)}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-50"
          >
            <MessagesSquare size={14} />
            {t("tasdiq.openChat")}
          </Link>
        )}
        {qarorBera ? (
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              data-agent-rad
              onClick={onRadEtish}
              disabled={Boolean(band)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-rose-50 px-3.5 text-xs font-black text-rose-600 ring-1 ring-rose-100 transition hover:bg-rose-100 disabled:opacity-50"
            >
              {band === "rad" ? <LoaderCircle size={14} className="animate-spin" /> : <XCircle size={14} />}
              {t("tasdiq.reject.button")}
            </button>
            <button
              type="button"
              data-agent-tasdiqlash
              onClick={onTasdiqlash}
              disabled={Boolean(band)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {band === "tasdiq" ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {t("tasdiq.approve")}
            </button>
          </div>
        ) : (
          <span className="ml-auto text-[11px] font-semibold text-slate-400">{t("tasdiq.managerOnly")}</span>
        )}
      </footer>
    </li>
  );
}
