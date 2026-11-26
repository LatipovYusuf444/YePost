import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  LoaderCircle,
  MessagesSquare,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  Target,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { crmApi, lidlarApi, royxatniAjratish } from "@/api/crmApi";
import { xodimlar as xodimlarniOlish } from "@/api/omborApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { kunMatni, vaqtMatni } from "@/lib/hujjatSanasi";
import { xatolikXabari } from "@/lib/toast";
import {
  kanalTuri,
  suhbatBoshHarflari,
  suhbatNomi,
  xabarMuallifi,
  xabarlarniBirlashtirish,
} from "@/lib/savdoAgenti";
import type { Attachment, ChatMessage, ChatThread, CursorJavobi, Lid } from "@/types/crm";
import KanalBelgisi from "./KanalBelgisi";
import MijozBiriktirish from "./MijozBiriktirish";
import LidKartasi, { type LidXodimi } from "./LidKartasi";
import { bosqichRangi } from "./lidYordamchilari";

const XABAR_LIMIT = 30;
// Yangi xabarlar uchun davriy tekshiruv (sahifa ko'rinib turganda).
const YANGILASH_MS = 15000;

type Filtr = "all" | "unassigned";

function sahifaniOqish(javob: CursorJavobi<ChatMessage>) {
  const items = royxatniAjratish(javob);
  const nextCursor = Array.isArray(javob) ? null : (javob.nextCursor ?? javob.cursor ?? null);
  return { items, nextCursor };
}

function soatMatni(qiymat?: string | null) {
  return vaqtMatni(qiymat).split(" ")[1] ?? "";
}

export default function Suhbatlar() {
  const { t } = useTranslation("savdo_agenti");
  const [params, setParams] = useSearchParams();
  const tanlanganId = params.get("thread");

  const [filtr, setFiltr] = useState<Filtr>("all");
  const [qidiruv, setQidiruv] = useState("");
  const [suhbatlar, setSuhbatlar] = useState<ChatThread[]>([]);
  const [royxatHolati, setRoyxatHolati] = useState<"yuklanmoqda" | "tayyor" | "xato">("yuklanmoqda");
  const [royxatXatosi, setRoyxatXatosi] = useState("");
  // Ro'yxatdan chiqib ketgan (masalan, "Biriktirilmagan" filtrida biriktirilgan) ochiq suhbat sarlavhasi uchun.
  const kesh = useRef(new Map<string, ChatThread>());

  const [xabarlar, setXabarlar] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [xabarHolati, setXabarHolati] = useState<"bosh" | "yuklanmoqda" | "tayyor" | "xato">("bosh");
  const [xabarXatosi, setXabarXatosi] = useState("");
  const [eskilarYuklanmoqda, setEskilarYuklanmoqda] = useState(false);

  const [matn, setMatn] = useState("");
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [yuborishXatosi, setYuborishXatosi] = useState<string | null>(null);
  const [biriktirishOchiq, setBiriktirishOchiq] = useState(false);
  // Ochiq suhbatning eng so'nggi lidi (undefined — yuklanmoqda, null — lid yo'q) va uning paneli.
  const [lid, setLid] = useState<Lid | null | undefined>(undefined);
  const [lidOchiq, setLidOchiq] = useState(false);
  const [xodimlar, setXodimlar] = useState<LidXodimi[] | null>(null);

  const joriyId = useRef<string | null>(null);
  const oynaRef = useRef<HTMLDivElement>(null);
  const scrollAmali = useRef<{ tur: "past" } | { tur: "saqla"; qoldiq: number } | null>(null);

  const royxatniYuklash = useCallback(
    async (fon = false) => {
      if (!fon) setRoyxatHolati("yuklanmoqda");
      try {
        const royxat = await crmApi.chatThreadlar(filtr === "unassigned" ? true : undefined, fon);
        for (const suhbat of royxat) kesh.current.set(suhbat.id, suhbat);
        setSuhbatlar(royxat);
        setRoyxatHolati("tayyor");
      } catch (error) {
        if (fon) return;
        setRoyxatXatosi(getApiErrorMessage(error));
        setRoyxatHolati("xato");
      }
    },
    [filtr]
  );

  useEffect(() => {
    void royxatniYuklash();
  }, [royxatniYuklash]);

  // Suhbat almashganda tarix boshidan (eng yangi sahifa) yuklanadi; eski so'rov javobi e'tiborsiz qoldiriladi.
  useEffect(() => {
    joriyId.current = tanlanganId;
    setXabarlar([]);
    setNextCursor(null);
    setMatn("");
    setYuborishXatosi(null);
    if (!tanlanganId) {
      setXabarHolati("bosh");
      return;
    }
    setXabarHolati("yuklanmoqda");
    crmApi
      .chatThreadXabarlari(tanlanganId, { limit: XABAR_LIMIT })
      .then((javob) => {
        if (joriyId.current !== tanlanganId) return;
        const sahifa = sahifaniOqish(javob);
        scrollAmali.current = { tur: "past" };
        setXabarlar(xabarlarniBirlashtirish(sahifa.items));
        setNextCursor(sahifa.nextCursor);
        setXabarHolati("tayyor");
      })
      .catch((error) => {
        if (joriyId.current !== tanlanganId) return;
        setXabarXatosi(getApiErrorMessage(error));
        setXabarHolati("xato");
      });
  }, [tanlanganId]);

  useEffect(() => {
    setLid(undefined);
    setLidOchiq(false);
    if (!tanlanganId) return;
    let faol = true;
    lidlarApi
      .royxat({ threadId: tanlanganId, page: 1, pageSize: 1 })
      .then((natija) => {
        if (faol) setLid(natija.items[0] ?? null);
      })
      .catch(() => {
        if (faol) setLid(null);
      });
    return () => {
      faol = false;
    };
  }, [tanlanganId]);

  // Mas'ul tayinlash ro'yxati — panel birinchi ochilganda (kassirga backend bermaydi: bo'sh, "Menga" qoladi).
  useEffect(() => {
    if (!lidOchiq || xodimlar !== null) return;
    xodimlarniOlish()
      .then((royxat) => setXodimlar(royxat.map((x) => ({ id: x.id, nom: x.fullName || x.name || x.username || x.id }))))
      .catch(() => setXodimlar([]));
  }, [lidOchiq, xodimlar]);

  // Davriy yangilash: ro'yxat va ochiq suhbatning eng yangi sahifasi (fon so'rovlari — xato toastsiz).
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void royxatniYuklash(true);
      const suhbatId = joriyId.current;
      if (!suhbatId) return;
      crmApi
        .chatThreadXabarlari(suhbatId, { limit: XABAR_LIMIT }, true)
        .then((javob) => {
          if (joriyId.current !== suhbatId) return;
          const oyna = oynaRef.current;
          const pastda = !oyna || oyna.scrollHeight - oyna.scrollTop - oyna.clientHeight < 120;
          setXabarlar((joriy) => {
            const yangi = xabarlarniBirlashtirish(joriy, sahifaniOqish(javob).items);
            if (yangi.length !== joriy.length && pastda) scrollAmali.current = { tur: "past" };
            return yangi;
          });
        })
        .catch(() => {});
    }, YANGILASH_MS);
    return () => window.clearInterval(id);
  }, [royxatniYuklash]);

  useLayoutEffect(() => {
    const oyna = oynaRef.current;
    const amal = scrollAmali.current;
    if (!oyna || !amal) return;
    scrollAmali.current = null;
    oyna.scrollTop = amal.tur === "past" ? oyna.scrollHeight : oyna.scrollHeight - amal.qoldiq;
  }, [xabarlar]);

  async function eskilarniYuklash() {
    const suhbatId = tanlanganId;
    if (!suhbatId || !nextCursor || eskilarYuklanmoqda) return;
    setEskilarYuklanmoqda(true);
    try {
      const sahifa = sahifaniOqish(await crmApi.chatThreadXabarlari(suhbatId, { cursor: nextCursor, limit: XABAR_LIMIT }));
      if (joriyId.current !== suhbatId) return;
      const oyna = oynaRef.current;
      if (oyna) scrollAmali.current = { tur: "saqla", qoldiq: oyna.scrollHeight - oyna.scrollTop };
      setXabarlar((joriy) => xabarlarniBirlashtirish(sahifa.items, joriy));
      setNextCursor(sahifa.nextCursor);
    } catch (error) {
      xatolikXabari(getApiErrorMessage(error));
    } finally {
      setEskilarYuklanmoqda(false);
    }
  }

  async function yuborish() {
    const suhbatId = tanlanganId;
    const toza = matn.trim();
    if (!suhbatId || !toza || yuborilmoqda) return;
    setYuborilmoqda(true);
    setYuborishXatosi(null);
    try {
      const xabar = await crmApi.chatThreadXabarYuborish(suhbatId, toza);
      if (joriyId.current !== suhbatId) return;
      setMatn("");
      scrollAmali.current = { tur: "past" };
      setXabarlar((joriy) => xabarlarniBirlashtirish(joriy, xabar && typeof xabar === "object" ? [xabar] : []));
      void royxatniYuklash(true);
    } catch (error) {
      // telegram_business_cannot_reply / telegram_send_failed (24 soat) — xabar saqlanmagan, matn maydonda qoladi.
      if (joriyId.current === suhbatId) setYuborishXatosi(getApiErrorMessage(error));
    } finally {
      setYuborilmoqda(false);
    }
  }

  function suhbatniTanlash(id: string | null) {
    setParams(
      (joriy) => {
        const yangi = new URLSearchParams(joriy);
        if (id) yangi.set("thread", id);
        else yangi.delete("thread");
        return yangi;
      },
      { replace: true }
    );
  }

  const korinadigan = useMemo(() => {
    const soz = qidiruv.trim().toLowerCase();
    if (!soz) return suhbatlar;
    return suhbatlar.filter((suhbat) =>
      [suhbat.displayName, suhbat.telegramUsername, suhbat.telegramChatId].some((qiymat) => qiymat?.toLowerCase().includes(soz))
    );
  }, [qidiruv, suhbatlar]);

  const tanlangan = tanlanganId ? (suhbatlar.find((suhbat) => suhbat.id === tanlanganId) ?? kesh.current.get(tanlanganId) ?? null) : null;
  const tanlanganNomi = tanlangan ? suhbatNomi(tanlangan) : tanlanganId ? `#${tanlanganId.slice(0, 8)}` : "";
  const biznes = kanalTuri(tanlangan?.channel) === "BUSINESS";
  const kunlar = useMemo(() => kunlargaAjratish(xabarlar), [xabarlar]);

  return (
    <div className="grid h-[calc(100dvh-250px)] min-h-[520px] gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
      {/* ============ Chap: suhbatlar ro'yxati ============ */}
      <aside
        className={`min-h-0 flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm ${tanlanganId ? "hidden lg:flex" : "flex"}`}
      >
        <div className="space-y-3 p-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={qidiruv}
                onChange={(event) => setQidiruv(event.target.value)}
                placeholder={t("suhbat.search")}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>
            <button
              type="button"
              onClick={() => void royxatniYuklash()}
              aria-label={t("suhbat.refresh")}
              title={t("suhbat.refresh")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-blue-600"
            >
              <RefreshCw size={17} className={royxatHolati === "yuklanmoqda" ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1" role="tablist">
            {(["all", "unassigned"] as const).map((qiymat) => (
              <button
                key={qiymat}
                type="button"
                role="tab"
                aria-selected={filtr === qiymat}
                onClick={() => setFiltr(qiymat)}
                className={`rounded-xl px-2 py-2 text-xs font-bold transition ${
                  filtr === qiymat ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t(qiymat === "all" ? "suhbat.filterAll" : "suhbat.filterUnassigned")}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-100">
          {royxatHolati === "yuklanmoqda" && suhbatlar.length === 0 ? (
            <Holat icon={<LoaderCircle size={24} className="animate-spin text-blue-600" />} sarlavha={t("suhbat.loading")} />
          ) : royxatHolati === "xato" ? (
            <Holat
              icon={<X size={22} className="text-red-500" />}
              sarlavha={royxatXatosi}
              amal={{ matn: t("suhbat.refresh"), bosish: () => void royxatniYuklash() }}
            />
          ) : suhbatlar.length === 0 ? (
            <Holat icon={<MessagesSquare size={22} />} sarlavha={t("suhbat.empty")} matn={t("suhbat.emptyText")} />
          ) : korinadigan.length === 0 ? (
            <Holat icon={<Search size={22} />} sarlavha={t("suhbat.notFound")} />
          ) : (
            <ul>
              {korinadigan.map((suhbat) => {
                const faol = suhbat.id === tanlanganId;
                const nom = suhbatNomi(suhbat);
                const biriktirilmagan = !suhbat.partnerId;
                return (
                  <li key={suhbat.id}>
                    <button
                      type="button"
                      onClick={() => suhbatniTanlash(suhbat.id)}
                      className={`relative flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition ${
                        faol ? "bg-blue-50/70" : "hover:bg-slate-50"
                      }`}
                    >
                      {faol && <span className="absolute inset-y-0 left-0 w-1 bg-blue-600" />}
                      <Avatar nom={nom} biznes={kanalTuri(suhbat.channel) === "BUSINESS"} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-slate-800">{nom}</span>
                          <span className="shrink-0 text-[11px] font-semibold text-slate-400">{royxatVaqti(suhbat.lastMessageAt)}</span>
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <KanalBelgisi kanal={suhbat.channel} ixcham />
                          {biriktirilmagan && (
                            <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-100">
                              {t("suhbat.unassigned")}
                            </span>
                          )}
                          {suhbat.telegramUsername && suhbat.displayName && (
                            <span className="truncate text-[11px] font-medium text-slate-400">@{suhbat.telegramUsername.replace(/^@/, "")}</span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ============ O'ng: suhbat ============ */}
      <section
        className={`min-h-0 flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm ${tanlanganId ? "flex" : "hidden lg:flex"}`}
      >
        {!tanlanganId ? (
          <Holat
            katta
            icon={<MessagesSquare size={34} />}
            sarlavha={t("suhbat.select")}
            matn={t("suhbat.selectText")}
          />
        ) : (
          <>
            <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => suhbatniTanlash(null)}
                aria-label={t("suhbat.back")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 lg:hidden"
              >
                <ArrowLeft size={18} />
              </button>
              <Avatar nom={tanlanganNomi} biznes={biznes} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold leading-5 text-slate-900">{tanlanganNomi}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {tanlangan && <KanalBelgisi kanal={tanlangan.channel} />}
                  {tanlangan &&
                    (tanlangan.partnerId ? (
                      <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                        {t("suhbat.assigned")}
                      </span>
                    ) : (
                      <span className="whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-100">
                        {t("suhbat.unassigned")}
                      </span>
                    ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {lid ? (
                  <button
                    type="button"
                    data-suhbat-lid={lid.stage}
                    onClick={() => setLidOchiq(true)}
                    aria-label={`${t("suhbat.openLead")}: ${t(`lid.stage.${lid.stage}`, { defaultValue: lid.stage })}`}
                    title={t("suhbat.openLead")}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold ring-1 transition hover:brightness-95 ${bosqichRangi(lid.stage)}`}
                  >
                    <Target size={14} />
                    <span className="hidden sm:inline">{t("suhbat.leadStage")}:</span>
                    <span>{t(`lid.stage.${lid.stage}`, { defaultValue: lid.stage })}</span>
                  </button>
                ) : lid === null ? (
                  <span className="hidden h-9 items-center rounded-xl px-2 text-[11px] font-semibold text-slate-400 sm:inline-flex">{t("suhbat.noLead")}</span>
                ) : null}
                {tanlangan && !tanlangan.partnerId && (
                  <button
                    type="button"
                    onClick={() => setBiriktirishOchiq(true)}
                    aria-label={t("suhbat.assign")}
                    title={t("suhbat.assign")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                  >
                    <UserPlus size={14} />
                    <span className="hidden sm:inline">{t("suhbat.assign")}</span>
                  </button>
                )}
              </div>
            </header>

            <div ref={oynaRef} className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-blue-50/40">
              <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-5 sm:px-6">
                {xabarHolati === "yuklanmoqda" ? (
                  <Holat icon={<LoaderCircle size={22} className="animate-spin text-blue-600" />} sarlavha={t("suhbat.loadingMessages")} />
                ) : xabarHolati === "xato" ? (
                  <Holat icon={<X size={22} className="text-red-500" />} sarlavha={xabarXatosi} />
                ) : xabarlar.length === 0 ? (
                  <Holat icon={<MessagesSquare size={22} />} sarlavha={t("suhbat.noMessages")} />
                ) : (
                  <>
                    {nextCursor && (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          disabled={eskilarYuklanmoqda}
                          onClick={() => void eskilarniYuklash()}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
                        >
                          {eskilarYuklanmoqda && <LoaderCircle size={13} className="animate-spin" />}
                          {eskilarYuklanmoqda ? t("suhbat.loadingOlder") : t("suhbat.loadOlder")}
                        </button>
                      </div>
                    )}
                    {kunlar.map((kun) => (
                      <div key={kun.kalit} className="space-y-2.5">
                        <div className="flex justify-center">
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm ring-1 ring-slate-100">
                            {kunSarlavhasi(kun.kalit, t)}
                          </span>
                        </div>
                        {kun.xabarlar.map((xabar, index) => (
                          <XabarPufagi key={xabar.id ?? `${kun.kalit}-${index}`} xabar={xabar} />
                        ))}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
              {yuborishXatosi && (
                <div role="alert" className="mx-auto mb-2 flex w-full max-w-3xl items-start justify-between gap-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-700 ring-1 ring-red-100">
                  <span>{yuborishXatosi}</span>
                  <button type="button" onClick={() => setYuborishXatosi(null)} aria-label={t("suhbat.closeError")} className="shrink-0 rounded-md p-0.5 text-red-500 hover:bg-red-100">
                    <X size={14} />
                  </button>
                </div>
              )}
              <div
                className={`mx-auto flex w-full max-w-3xl items-end gap-2 rounded-[22px] border bg-slate-50 p-2 transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50 ${
                  yuborishXatosi ? "border-red-300" : "border-slate-200"
                }`}
              >
                <textarea
                  value={matn}
                  onChange={(event) => {
                    setMatn(event.target.value);
                    if (yuborishXatosi) setYuborishXatosi(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      void yuborish();
                    }
                  }}
                  rows={1}
                  disabled={xabarHolati === "yuklanmoqda"}
                  placeholder={t("suhbat.placeholder")}
                  className="max-h-32 min-h-10 min-w-0 flex-1 resize-none border-none bg-transparent px-2 py-2.5 text-sm font-medium leading-5 text-slate-900 outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => void yuborish()}
                  disabled={!matn.trim() || yuborilmoqda}
                  aria-label={t("suhbat.send")}
                  title={t("suhbat.send")}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-md shadow-blue-200 transition hover:scale-105 disabled:scale-100 disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                >
                  {yuborilmoqda ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}
                </button>
              </div>
              {tanlangan && (
                <p className="mx-auto mt-1.5 flex w-full max-w-3xl items-center gap-1.5 px-2 text-[11px] font-semibold text-slate-400">
                  {biznes ? <Smartphone size={12} /> : <MessagesSquare size={12} />}
                  {t(biznes ? "suhbat.sendBusinessHint" : "suhbat.sendBotHint")}
                </p>
              )}
            </div>
          </>
        )}
      </section>

      {lidOchiq && lid && (
        <LidKartasi
          lidId={lid.id}
          xodimlar={xodimlar ?? []}
          onYopish={() => setLidOchiq(false)}
          onSuhbat={() => setLidOchiq(false)}
          onYangilandi={(yangi) => setLid((joriy) => (joriy && joriy.id === yangi.id ? { ...joriy, ...yangi } : joriy))}
        />
      )}

      {biriktirishOchiq && tanlangan && (
        <MijozBiriktirish
          suhbatId={tanlangan.id}
          suhbatNomi={tanlanganNomi}
          onYopish={() => setBiriktirishOchiq(false)}
          onBiriktirildi={(yangi) => {
            const birlashgan = { ...tanlangan, ...yangi };
            kesh.current.set(birlashgan.id, birlashgan);
            setSuhbatlar((joriy) => joriy.map((suhbat) => (suhbat.id === birlashgan.id ? birlashgan : suhbat)));
            setBiriktirishOchiq(false);
          }}
        />
      )}
    </div>
  );
}

function Avatar({ nom, biznes }: { nom: string; biznes: boolean }) {
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black ring-1 ${
        biznes ? "bg-gradient-to-br from-violet-50 to-fuchsia-100 text-violet-700 ring-violet-100" : "bg-gradient-to-br from-blue-50 to-sky-100 text-blue-700 ring-blue-100"
      }`}
    >
      {nom ? suhbatBoshHarflari(nom) : <UserRound size={18} />}
    </span>
  );
}

function Holat({
  icon,
  sarlavha,
  matn,
  amal,
  katta = false,
}: {
  icon: ReactNode;
  sarlavha: string;
  matn?: string;
  amal?: { matn: string; bosish: () => void };
  katta?: boolean;
}) {
  return (
    <div className={`flex h-full flex-col items-center justify-center gap-2 px-6 text-center ${katta ? "min-h-64" : "min-h-48"}`}>
      <span
        className={`flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 text-slate-400 ring-1 ring-slate-100 ${
          katta ? "h-20 w-20 rounded-[26px] text-blue-600" : "h-12 w-12 rounded-2xl"
        }`}
      >
        {icon}
      </span>
      <p className={`font-bold text-slate-700 ${katta ? "text-base" : "text-sm"}`}>{sarlavha}</p>
      {matn && <p className="max-w-xs text-xs font-medium leading-5 text-slate-400">{matn}</p>}
      {amal && (
        <button type="button" onClick={amal.bosish} className="mt-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50">
          {amal.matn}
        </button>
      )}
    </div>
  );
}

function XabarPufagi({ xabar }: { xabar: ChatMessage }) {
  const { t } = useTranslation("savdo_agenti");
  const muallif = xabarMuallifi(xabar);
  const chiquvchi = muallif !== "mijoz";
  const ilovalar = (xabar.attachments ?? []).filter((ilova): ilova is Attachment => Boolean(ilova?.id));
  const xodimNomi = xabar.sender?.fullName || xabar.sender?.name || xabar.sender?.username;
  return (
    <div className={`flex ${chiquvchi ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-[20px] px-3.5 py-2.5 shadow-sm sm:max-w-[75%] ${
          muallif === "mijoz"
            ? "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-100"
            : muallif === "akkaunt"
              ? "rounded-br-md bg-violet-600 text-white"
              : "rounded-br-md bg-blue-600 text-white"
        }`}
      >
        {chiquvchi && (
          <p
            className={`mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide ${muallif === "akkaunt" ? "text-violet-100" : "text-blue-100"}`}
            title={muallif === "akkaunt" ? t("suhbat.akkauntIzoh") : undefined}
          >
            {muallif === "akkaunt" && <Smartphone size={11} />}
            {muallif === "akkaunt" ? t("suhbat.author.akkaunt") : xodimNomi || t("suhbat.author.xodim")}
          </p>
        )}
        {xabar.text && <p className="whitespace-pre-wrap break-words text-sm leading-5">{xabar.text}</p>}
        {ilovalar.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ilovalar.map((ilova) => (
              <button
                key={ilova.id}
                type="button"
                onClick={() => void ilovaniYuklash(ilova, t("suhbat.downloadFailed"))}
                className={`inline-flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                  chiquvchi ? "bg-white/15 text-white hover:bg-white/25" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Paperclip size={12} className="shrink-0" />
                <span className="max-w-[180px] truncate">{ilova.originalName || ilova.fileName || t("suhbat.attachment")}</span>
              </button>
            ))}
          </div>
        )}
        <p className={`mt-1 text-right text-[10px] font-semibold ${chiquvchi ? "text-white/70" : "text-slate-400"}`}>{soatMatni(xabar.createdAt)}</p>
      </div>
    </div>
  );
}

async function ilovaniYuklash(ilova: Attachment, xatoMatni: string) {
  try {
    const blob = await crmApi.faylYuklabOlish(ilova.id);
    const url = URL.createObjectURL(blob);
    const havola = document.createElement("a");
    havola.href = url;
    havola.download = ilova.originalName || ilova.fileName || "fayl";
    document.body.appendChild(havola);
    havola.click();
    havola.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    xatolikXabari(xatoMatni);
  }
}

function kunlargaAjratish(xabarlar: ChatMessage[]) {
  const kunlar: Array<{ kalit: string; xabarlar: ChatMessage[] }> = [];
  for (const xabar of xabarlar) {
    const kalit = kunMatni(xabar.createdAt) || "";
    const oxirgi = kunlar[kunlar.length - 1];
    if (oxirgi && oxirgi.kalit === kalit) oxirgi.xabarlar.push(xabar);
    else kunlar.push({ kalit, xabarlar: [xabar] });
  }
  return kunlar;
}

function kunSarlavhasi(kalit: string, t: (kalit: string) => string) {
  if (!kalit) return t("suhbat.noDate");
  if (kalit === kunMatni(new Date())) return t("suhbat.today");
  if (kalit === kunMatni(Date.now() - 86400000)) return t("suhbat.yesterday");
  return kalit;
}

function royxatVaqti(qiymat?: string | null) {
  if (!qiymat) return "";
  return kunMatni(qiymat) === kunMatni(new Date()) ? soatMatni(qiymat) : kunMatni(qiymat).slice(0, 5);
}
