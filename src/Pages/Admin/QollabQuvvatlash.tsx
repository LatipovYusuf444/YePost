import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Building2, CheckCircle2, Headset, LoaderCircle, MessageSquare, RotateCcw, Search, Send, UserCheck } from "lucide-react";
import { platformSupportApi } from "@/api/supportApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useAuthProfileStore } from "@/store/authProfileStore";
import type { PlatformSupportTicket, QollabQuvvatlashXabari, SupportTicketHolati } from "@/types/support";
import { KunlarRoyxati } from "@/Pages/Support/SupportXabarlari";
import { guruhlash } from "@/Pages/Support/supportYordamchilar";
import { Avatar, SahifaSarlavhasi, XatoXabari } from "./AdminUI";

type HolatFiltri = "ALL" | SupportTicketHolati;

const FILTRLAR: HolatFiltri[] = ["ACTIVE", "IN_PROGRESS", "COMPLETED", "ALL"];
const HOLAT_RANGI: Record<SupportTicketHolati, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70",
  IN_PROGRESS: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70",
  COMPLETED: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
};

function royxatVaqti(iso?: string | null) {
  if (!iso) return "";
  const sana = new Date(iso);
  if (Number.isNaN(sana.getTime())) return "";
  const hozir = new Date();
  if (sana.toDateString() === hozir.toDateString()) {
    return `${String(sana.getHours()).padStart(2, "0")}:${String(sana.getMinutes()).padStart(2, "0")}`;
  }
  return `${String(sana.getDate()).padStart(2, "0")}.${String(sana.getMonth() + 1).padStart(2, "0")}`;
}

// Yangi xabarlarni mavjudlariga id bo'yicha qo'shadi va vaqt bo'yicha tartiblaydi.
function xabarlarniBirlashtirish(joriy: QollabQuvvatlashXabari[], yangi: QollabQuvvatlashXabari[]) {
  const xarita = new Map(joriy.map((xabar) => [xabar.id, xabar]));
  for (const xabar of yangi) xarita.set(xabar.id, xabar);
  return [...xarita.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

// Super admin: barcha kompaniyalarning qo'llab-quvvatlash murojaatlari (GET /platform/support/tickets ...).
export default function AdminQollabQuvvatlash() {
  const { t } = useTranslation("admin");
  const { t: tSupport } = useTranslation("support");
  const profil = useAuthProfileStore((state) => state.profil);
  const [filtr, setFiltr] = useState<HolatFiltri>("ACTIVE");
  const [qidiruv, setQidiruv] = useState("");
  const [qidiruvKechiktirilgan, setQidiruvKechiktirilgan] = useState("");
  const [tickets, setTickets] = useState<PlatformSupportTicket[]>([]);
  const [royxatYuklanmoqda, setRoyxatYuklanmoqda] = useState(true);
  const [tanlangan, setTanlangan] = useState<PlatformSupportTicket | null>(null);
  const [xabarlar, setXabarlar] = useState<QollabQuvvatlashXabari[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [xabarlarYuklanmoqda, setXabarlarYuklanmoqda] = useState(false);
  const [matn, setMatn] = useState("");
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [amalBajarilmoqda, setAmalBajarilmoqda] = useState(false);
  const [xato, setXato] = useState("");
  const oxirigaRef = useRef<HTMLDivElement | null>(null);
  const tanlanganId = tanlangan?.id ?? null;

  useEffect(() => {
    const kechiktirish = window.setTimeout(() => setQidiruvKechiktirilgan(qidiruv.trim()), 350);
    return () => window.clearTimeout(kechiktirish);
  }, [qidiruv]);

  const royxatniOlish = useCallback(
    () => platformSupportApi.tickets({ status: filtr === "ALL" ? undefined : filtr, search: qidiruvKechiktirilgan || undefined, limit: 100 }),
    [filtr, qidiruvKechiktirilgan]
  );

  // Ro'yxat: filtr o'zgarganda yuklanadi, keyin har 5 soniyada jimgina yangilanadi.
  useEffect(() => {
    let faol = true;
    setRoyxatYuklanmoqda(true);
    royxatniOlish()
      .then((royxat) => faol && setTickets(royxat))
      .catch((error) => faol && setXato(getApiErrorMessage(error)))
      .finally(() => faol && setRoyxatYuklanmoqda(false));
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      royxatniOlish()
        .then((royxat) => faol && setTickets(royxat))
        .catch(() => undefined);
    }, 5000);
    return () => {
      faol = false;
      window.clearInterval(interval);
    };
  }, [royxatniOlish]);

  const oqilganBelgilash = useCallback((id: string) => {
    void platformSupportApi
      .oqilgan(id)
      .then(() => setTickets((joriy) => joriy.map((ticket) => (ticket.id === id ? { ...ticket, unreadCount: 0 } : ticket))))
      .catch(() => undefined);
  }, []);

  // Tanlangan murojaat xabarlari: ochilganda yuklanadi, keyin har 5 soniyada yangilari qo'shiladi.
  useEffect(() => {
    if (!tanlanganId) return;
    let faol = true;
    setXabarlar([]);
    setNextCursor(null);
    setXabarlarYuklanmoqda(true);
    platformSupportApi
      .xabarlar(tanlanganId, { limit: 30 })
      .then(({ items, nextCursor: keyingi }) => {
        if (!faol) return;
        setXabarlar(xabarlarniBirlashtirish([], items));
        setNextCursor(keyingi);
        oqilganBelgilash(tanlanganId);
      })
      .catch((error) => faol && setXato(getApiErrorMessage(error)))
      .finally(() => faol && setXabarlarYuklanmoqda(false));
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      platformSupportApi
        .xabarlar(tanlanganId, { limit: 30 })
        .then(({ items }) => {
          if (!faol) return;
          setXabarlar((joriy) => {
            const yangilari = items.filter((xabar) => !joriy.some((element) => element.id === xabar.id));
            if (yangilari.length > 0 && yangilari.some((xabar) => xabar.direction === "OUT")) oqilganBelgilash(tanlanganId);
            return yangilari.length > 0 ? xabarlarniBirlashtirish(joriy, items) : joriy;
          });
        })
        .catch(() => undefined);
    }, 5000);
    return () => {
      faol = false;
      window.clearInterval(interval);
    };
  }, [tanlanganId, oqilganBelgilash]);

  useEffect(() => {
    oxirigaRef.current?.scrollIntoView({ block: "end" });
  }, [xabarlar.length, tanlanganId]);

  async function oldingilarniYuklash() {
    if (!tanlanganId || !nextCursor) return;
    try {
      const { items, nextCursor: keyingi } = await platformSupportApi.xabarlar(tanlanganId, { limit: 30, cursor: nextCursor });
      setXabarlar((joriy) => xabarlarniBirlashtirish(joriy, items));
      setNextCursor(keyingi);
    } catch (error) {
      setXato(getApiErrorMessage(error));
    }
  }

  function ticketniYangilash(yangi: PlatformSupportTicket) {
    setTanlangan((joriy) => (joriy ? { ...joriy, ...yangi } : joriy));
    setTickets((joriy) => joriy.map((ticket) => (ticket.id === yangi.id ? { ...ticket, ...yangi } : ticket)));
  }

  async function amalBajarish(bajar: () => Promise<PlatformSupportTicket>) {
    setAmalBajarilmoqda(true);
    setXato("");
    try {
      ticketniYangilash(await bajar());
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setAmalBajarilmoqda(false);
    }
  }

  async function javobYuborish() {
    const toza = matn.trim();
    if (!tanlanganId || !toza || yuborilmoqda) return;
    setYuborilmoqda(true);
    setXato("");
    try {
      const xabar = await platformSupportApi.javob(tanlanganId, toza);
      setXabarlar((joriy) => xabarlarniBirlashtirish(joriy, [xabar]));
      setMatn("");
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setYuborilmoqda(false);
    }
  }

  // Xodim nuqtai nazaridan: o'z (xodim) javoblari o'ngda ko'rinishi uchun yo'nalish teskari qilinadi.
  const kunlar = useMemo(() => guruhlash(xabarlar.map((xabar) => ({ ...xabar, direction: xabar.direction === "IN" ? ("OUT" as const) : ("IN" as const) }))), [xabarlar]);
  const yakunlangan = tanlangan?.status === "COMPLETED";
  const umumiy = Boolean(tanlangan?.isGeneral);
  const oziga = Boolean(tanlangan?.assignee?.id && tanlangan.assignee.id === profil?.id);

  return (
    <div className="space-y-5">
      <SahifaSarlavhasi eyebrow={t("eyebrow")} sarlavha={t("qollabQuvvatlash.sarlavha")} tavsif={t("qollabQuvvatlash.tavsif")} ikonka={<Headset size={26} />} />

      {xato && <XatoXabari matn={xato} yopish={() => setXato("")} />}

      <div className="grid h-[calc(100vh-260px)] min-h-[520px] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className={`${tanlangan ? "hidden lg:flex" : "flex"} min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_4px_20px_rgba(15,23,42,.05)]`}>
          <div className="space-y-3 border-b border-slate-100 p-4">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-orange-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
              <Search size={17} className="shrink-0 text-slate-400" />
              <input
                value={qidiruv}
                onChange={(event) => setQidiruv(event.target.value)}
                placeholder={t("qollabQuvvatlash.qidirish")}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
              {FILTRLAR.map((kalit) => (
                <button
                  key={kalit}
                  type="button"
                  onClick={() => setFiltr(kalit)}
                  className={`h-8 rounded-lg px-1 text-[11px] font-bold transition ${
                    filtr === kalit ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {t(`qollabQuvvatlash.filtr.${kalit}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {royxatYuklanmoqda && tickets.length === 0 ? (
              <div className="flex h-48 items-center justify-center">
                <LoaderCircle className="animate-spin text-orange-500" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 px-6 text-center text-sm font-semibold text-slate-400">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-300"><MessageSquare size={26} /></span>
                {t("qollabQuvvatlash.bosh")}
              </div>
            ) : (
              tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => {
                    setTanlangan(ticket);
                    setMatn("");
                  }}
                  className={`relative flex w-full flex-col gap-1.5 border-b border-slate-100 px-4 py-3.5 text-left transition ${
                    tanlanganId === ticket.id ? "bg-orange-50/70" : "hover:bg-slate-50"
                  }`}
                >
                  {tanlanganId === ticket.id && <span className="absolute inset-y-0 left-0 w-1 bg-orange-500" />}
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-orange-600">
                      <Avatar nom={ticket.workspace?.name ?? "?"} kattalik="sm" />
                      <span className="truncate">{ticket.workspace?.name ?? "—"}</span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-slate-400">{royxatVaqti(ticket.lastMessageAt ?? ticket.createdAt)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-black text-slate-800">{ticket.isGeneral ? tSupport("inbox.generalSubject") : ticket.subject}</span>
                    {Boolean(ticket.unreadCount) && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-black text-white">
                        {ticket.unreadCount}
                      </span>
                    )}
                  </span>
                  <span className="truncate text-xs text-slate-500">{ticket.lastMessage || tSupport("inbox.noMessagesPreview")}</span>
                  <span className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${HOLAT_RANGI[ticket.status]}`}>{t(`qollabQuvvatlash.holat.${ticket.status}`)}</span>
                    <span className="truncate text-[11px] font-semibold text-slate-400">{ticket.assignee?.name ?? t("qollabQuvvatlash.biriktirilmagan")}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className={`${tanlangan ? "flex" : "hidden lg:flex"} min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_4px_20px_rgba(15,23,42,.05)]`}>
          {!tanlangan ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-slate-400">
              <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50 text-orange-300 ring-8 ring-orange-50/60"><Headset size={36} /></span>
              <p className="font-black text-slate-600">{t("qollabQuvvatlash.tanlang")}</p>
              <p className="text-sm">{t("qollabQuvvatlash.tanlangTavsif")}</p>
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-gradient-to-b from-orange-50/50 to-white px-5 py-4">
                <button
                  type="button"
                  onClick={() => setTanlangan(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-slate-100 lg:hidden"
                  aria-label={t("qollabQuvvatlash.orqaga")}
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-orange-600">
                    <Building2 size={13} />
                    {tanlangan.workspace?.name ?? "—"}
                  </p>
                  <h2 className="mt-0.5 truncate text-lg font-black text-slate-900">{umumiy ? tSupport("inbox.generalSubject") : tanlangan.subject}</h2>
                  <p className="mt-0.5 text-xs font-semibold text-slate-400">
                    {t("qollabQuvvatlash.masul")}: {tanlangan.assignee?.name ?? t("qollabQuvvatlash.biriktirilmagan")}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${HOLAT_RANGI[tanlangan.status]}`}>{t(`qollabQuvvatlash.holat.${tanlangan.status}`)}</span>
                {!yakunlangan && !oziga && (
                  <button
                    type="button"
                    disabled={amalBajarilmoqda}
                    onClick={() => void amalBajarish(() => platformSupportApi.biriktirish(tanlangan.id))}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-50"
                  >
                    <UserCheck size={16} />
                    <span className="hidden sm:inline">{t("qollabQuvvatlash.ozimgaBiriktirish")}</span>
                  </button>
                )}
                {!umumiy &&
                  (yakunlangan ? (
                    <button
                      type="button"
                      disabled={amalBajarilmoqda}
                      onClick={() => void amalBajarish(() => platformSupportApi.holat(tanlangan.id, "ACTIVE"))}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-orange-200 px-3.5 text-sm font-bold text-orange-600 transition hover:bg-orange-50 disabled:opacity-50"
                    >
                      <RotateCcw size={15} />
                      <span className="hidden sm:inline">{t("qollabQuvvatlash.qaytaOchish")}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={amalBajarilmoqda}
                      onClick={() => void amalBajarish(() => platformSupportApi.holat(tanlangan.id, "COMPLETED"))}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      <span className="hidden sm:inline">{t("qollabQuvvatlash.yakunlash")}</span>
                    </button>
                  ))}
              </header>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-5 py-5">
                {nextCursor && (
                  <div className="flex justify-center">
                    <button type="button" onClick={() => void oldingilarniYuklash()} className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-orange-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-orange-50">
                      {t("qollabQuvvatlash.oldingilar")}
                    </button>
                  </div>
                )}
                {xabarlarYuklanmoqda ? (
                  <div className="flex h-40 items-center justify-center">
                    <LoaderCircle className="animate-spin text-orange-500" />
                  </div>
                ) : xabarlar.length === 0 ? (
                  <p className="py-16 text-center text-sm font-semibold text-slate-400">{t("qollabQuvvatlash.xabarYoq")}</p>
                ) : (
                  <KunlarRoyxati kunlar={kunlar} t={(kalit) => tSupport(kalit)} />
                )}
                <div ref={oxirigaRef} />
              </div>

              {yakunlangan ? (
                <p className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-500">{t("qollabQuvvatlash.yakunlanganEslatma")}</p>
              ) : (
                <div className="flex items-end gap-3 border-t border-slate-100 bg-white px-5 py-4">
                  <textarea
                    value={matn}
                    onChange={(event) => setMatn(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void javobYuborish();
                      }
                    }}
                    rows={2}
                    placeholder={t("qollabQuvvatlash.javobYozing")}
                    className="min-h-12 flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                  <button
                    type="button"
                    onClick={() => void javobYuborish()}
                    disabled={!matn.trim() || yuborilmoqda}
                    className="inline-flex h-12 items-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                  >
                    {yuborilmoqda ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
                    {t("qollabQuvvatlash.yuborish")}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
