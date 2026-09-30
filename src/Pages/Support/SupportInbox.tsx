import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Headset,
  Info,
  LoaderCircle,
  MessageSquarePlus,
  Paperclip,
  RotateCcw,
  Search,
  Send,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/Components/ui/avatar";
import { Button } from "@/Components/ui/button";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Textarea } from "@/Components/ui/textarea";
import { crmIlovalarApi } from "@/api/crmAttachmentsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { supportApi } from "@/api/supportApi";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useSupportStore } from "@/store/supportStore";
import type { QollabQuvvatlashXabari, SupportTicket, SupportTicketHolati } from "@/types/support";
import { KunlarRoyxati } from "./SupportXabarlari";
import { guruhlash } from "./supportYordamchilar";

// Qo'llab-quvvatlash inboxi: chapda murojaatlar, o'rtada suhbat, o'ngda murojaat haqida ma'lumot.
// Backendda murojaatlar (tickets) bo'lsa — to'liq ishlaydi (docs/support-backend-spec.md).
// Bo'lmasa (404) — mavjud /support/messages oqimi bitta "umumiy suhbat" sifatida ko'rsatiladi.

const YAGONA_ID = "general";
const TABLAR: SupportTicketHolati[] = ["ACTIVE", "IN_PROGRESS", "COMPLETED"];
const HOLAT_RANGI: Record<SupportTicketHolati, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-600",
  IN_PROGRESS: "bg-amber-50 text-amber-600",
  COMPLETED: "bg-slate-100 text-slate-500",
};
const HOLAT_NUQTASI: Record<SupportTicketHolati, string> = {
  ACTIVE: "bg-emerald-500",
  IN_PROGRESS: "bg-amber-500",
  COMPLETED: "bg-slate-400",
};

type Rejim = "yuklanmoqda" | "tickets" | "yagona";

function backendYoqmi(error: unknown) {
  return axios.isAxiosError(error) && [404, 405, 501].includes(error.response?.status ?? 0);
}

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

function toliqSana(iso?: string | null) {
  if (!iso) return "—";
  const sana = new Date(iso);
  if (Number.isNaN(sana.getTime())) return "—";
  return sana.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function xabarlarniBirlashtirish(joriy: QollabQuvvatlashXabari[], serverdan: QollabQuvvatlashXabari[]) {
  const mavjud = new Set(joriy.map((x) => x.id));
  const map = new Map(serverdan.map((x) => [x.id, x]));
  return [...joriy.map((x) => map.get(x.id) ?? x), ...serverdan.filter((x) => !mavjud.has(x.id))];
}

export default function SupportInbox() {
  const { t } = useTranslation("support");
  const [rejim, setRejim] = useState<Rejim>("yuklanmoqda");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [tanlanganId, setTanlanganId] = useState<string | null>(null);
  const [tab, setTab] = useState<SupportTicketHolati>("ACTIVE");
  const [qidiruv, setQidiruv] = useState("");
  const [mobilChat, setMobilChat] = useState(false);

  // O'ng panelda tizimga kirgan foydalanuvchining telefon raqami ko'rsatiladi.
  const profil = useAuthProfileStore((state) => state.profil);
  const profilniYuklash = useAuthProfileStore((state) => state.profilniYuklash);
  useEffect(() => {
    if (!profil) void profilniYuklash();
  }, [profil, profilniYuklash]);

  const [xabarlar, setXabarlar] = useState<QollabQuvvatlashXabari[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [xabarlarYuklanmoqda, setXabarlarYuklanmoqda] = useState(false);
  const [eskilarYuklanmoqda, setEskilarYuklanmoqda] = useState(false);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [xatolik, setXatolik] = useState<string | null>(null);

  const [matn, setMatn] = useState("");
  const [fayllar, setFayllar] = useState<File[]>([]);
  const faylInputRef = useRef<HTMLInputElement | null>(null);
  const oxirigaRef = useRef<HTMLDivElement | null>(null);
  const oxirgiXabarId = useRef<string | null>(null);

  const [yangiOchiq, setYangiOchiq] = useState(false);
  const [yangiMavzu, setYangiMavzu] = useState("");
  const [yangiMatn, setYangiMatn] = useState("");
  const [yaratilmoqda, setYaratilmoqda] = useState(false);

  // ---- Murojaatlar ro'yxati ----
  const yagonaTicket = useMemo<SupportTicket>(() => {
    const oxirgi = xabarlar.at(-1);
    return {
      id: YAGONA_ID,
      subject: t("inbox.generalSubject"),
      status: "ACTIVE",
      createdAt: xabarlar[0]?.createdAt ?? new Date().toISOString(),
      lastMessage: oxirgi?.text ?? null,
      lastMessageAt: oxirgi?.createdAt ?? null,
      messageCount: xabarlar.length,
    };
  }, [xabarlar, t]);

  const barchaTicketlar = useMemo(() => (rejim === "yagona" ? [yagonaTicket] : tickets), [rejim, yagonaTicket, tickets]);
  const tanlangan = barchaTicketlar.find((item) => item.id === tanlanganId) ?? null;

  const tabSonlari = useMemo(() => {
    const sonlar: Record<SupportTicketHolati, number> = { ACTIVE: 0, IN_PROGRESS: 0, COMPLETED: 0 };
    barchaTicketlar.forEach((item) => { sonlar[item.status] += 1; });
    return sonlar;
  }, [barchaTicketlar]);

  const korinadiganTicketlar = useMemo(() => {
    const q = qidiruv.trim().toLowerCase();
    return barchaTicketlar
      .filter((item) => item.status === tab)
      .filter((item) => !q || item.subject.toLowerCase().includes(q) || (item.lastMessage ?? "").toLowerCase().includes(q))
      .sort((a, b) => Date.parse(b.lastMessageAt ?? b.createdAt) - Date.parse(a.lastMessageAt ?? a.createdAt));
  }, [barchaTicketlar, qidiruv, tab]);

  const tarixTicketlari = barchaTicketlar.filter((item) => item.id !== tanlanganId).slice(0, 6);

  // ---- Boshlang'ich yuklash: tickets bormi yoki yagona oqim ----
  useEffect(() => {
    let faol = true;
    supportApi
      .tickets({ limit: 100 })
      .then((royxat) => {
        if (!faol) return;
        setTickets(royxat);
        setRejim("tickets");
        const birinchi = royxat.find((item) => item.status === "ACTIVE") ?? royxat[0];
        if (birinchi) {
          setTanlanganId(birinchi.id);
          setTab(birinchi.status);
        }
      })
      .catch((error) => {
        if (!faol) return;
        if (backendYoqmi(error)) {
          setRejim("yagona");
          setTanlanganId(YAGONA_ID);
        } else {
          setRejim("tickets");
          setXatolik(getApiErrorMessage(error));
        }
      });
    return () => { faol = false; };
  }, []);

  // ---- Tanlangan suhbat xabarlari ----
  const oqilganBelgilash = useCallback(async (id: string) => {
    const store = useSupportStore.getState();
    try {
      if (id === YAGONA_ID) {
        await store.oqilganDebBelgilash();
      } else {
        await supportApi.ticketOqilgan(id);
        setTickets((joriy) => joriy.map((item) => (item.id === id ? { ...item, unreadCount: 0 } : item)));
        void store.oqilmaganSoniniYangilash();
      }
    } catch {
      // fon jarayoni — xato ko'rsatilmaydi
    }
  }, []);

  const xabarlarniOlish = useCallback(async (id: string, cursor?: string) => {
    const params = { limit: 30, ...(cursor ? { cursor } : {}) };
    return id === YAGONA_ID ? supportApi.xabarlar(params) : supportApi.ticketXabarlari(id, params);
  }, []);

  useEffect(() => {
    if (!tanlanganId || rejim === "yuklanmoqda") return;
    let faol = true;
    setXabarlar([]);
    setNextCursor(null);
    oxirgiXabarId.current = null;
    setXabarlarYuklanmoqda(true);
    xabarlarniOlish(tanlanganId)
      .then(({ items, nextCursor: keyingi }) => {
        if (!faol) return;
        setXabarlar([...items].reverse());
        setNextCursor(keyingi);
        void oqilganBelgilash(tanlanganId);
      })
      .catch((error) => { if (faol && !backendYoqmi(error)) setXatolik(getApiErrorMessage(error)); })
      .finally(() => { if (faol) setXabarlarYuklanmoqda(false); });
    return () => { faol = false; };
  }, [tanlanganId, rejim, xabarlarniOlish, oqilganBelgilash]);

  // ---- Har 5 soniyada yangilanish ----
  useEffect(() => {
    if (rejim === "yuklanmoqda") return;
    const interval = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        if (rejim === "tickets") {
          const royxat = await supportApi.tickets({ limit: 100 });
          setTickets(royxat);
        }
        if (tanlanganId) {
          const { items } = await xabarlarniOlish(tanlanganId);
          const oxirgilar = [...items].reverse();
          let yangiKirish = false;
          setXabarlar((joriy) => {
            const mavjud = new Set(joriy.map((x) => x.id));
            yangiKirish = oxirgilar.some((x) => !mavjud.has(x.id) && x.direction === "IN");
            return xabarlarniBirlashtirish(joriy, oxirgilar);
          });
          if (yangiKirish) void oqilganBelgilash(tanlanganId);
        }
      } catch {
        // keyingi urinishda qayta tekshiriladi
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [rejim, tanlanganId, xabarlarniOlish, oqilganBelgilash]);

  // Yangi xabar kelganda pastga aylantirish
  useEffect(() => {
    const oxirgiId = xabarlar.at(-1)?.id;
    if (!oxirgiId || oxirgiXabarId.current === oxirgiId) return;
    const birinchi = oxirgiXabarId.current === null;
    oxirgiXabarId.current = oxirgiId;
    oxirigaRef.current?.scrollIntoView({ behavior: birinchi ? "auto" : "smooth", block: "end" });
  }, [xabarlar]);

  const kunlarBoyicha = useMemo(() => guruhlash(xabarlar), [xabarlar]);

  // ---- Amallar ----
  function ticketniTanlash(id: string) {
    if (id === tanlanganId) {
      setMobilChat(true);
      return;
    }
    setTanlanganId(id);
    setMobilChat(true);
    setMatn("");
    setFayllar([]);
    setXatolik(null);
  }

  function tabniOzgartirish(yangi: SupportTicketHolati) {
    setTab(yangi);
    const royxat = barchaTicketlar.filter((item) => item.status === yangi);
    if (royxat.length && !royxat.some((item) => item.id === tanlanganId)) setTanlanganId(royxat[0].id);
  }

  async function eskilarniYuklash() {
    if (!tanlanganId || !nextCursor || eskilarYuklanmoqda) return;
    setEskilarYuklanmoqda(true);
    try {
      const { items, nextCursor: keyingi } = await xabarlarniOlish(tanlanganId, nextCursor);
      setXabarlar((joriy) => [...[...items].reverse(), ...joriy]);
      setNextCursor(keyingi);
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setEskilarYuklanmoqda(false);
    }
  }

  async function yuborish() {
    if (!tanlanganId || (!matn.trim() && fayllar.length === 0) || yuborilmoqda) return;
    const yuboriladiganMatn = matn.trim();
    const yuboriladiganFayllar = fayllar;
    setYuborilmoqda(true);
    setXatolik(null);
    try {
      const ilovalar = yuboriladiganFayllar.length
        ? await Promise.all(yuboriladiganFayllar.map((fayl) => crmIlovalarApi.yuklash(fayl)))
        : [];
      const ilovaIdlari = ilovalar.length ? ilovalar.map((ilova) => ilova.id) : undefined;
      const xabar =
        tanlanganId === YAGONA_ID
          ? await supportApi.xabarYuborish(yuboriladiganMatn, ilovaIdlari)
          : await supportApi.ticketXabarYuborish(tanlanganId, yuboriladiganMatn, ilovaIdlari);
      setXabarlar((joriy) => [...joriy, xabar]);
      setMatn("");
      setFayllar([]);
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setYuborilmoqda(false);
    }
  }

  async function holatniOzgartirish(yangi: SupportTicketHolati) {
    if (!tanlangan || rejim !== "tickets") return;
    try {
      const yangilangan = await supportApi.ticketHolati(tanlangan.id, yangi);
      setTickets((joriy) =>
        joriy.map((item) => (item.id === tanlangan.id ? { ...item, ...yangilangan, status: yangilangan?.status ?? yangi } : item))
      );
      setTab(yangi);
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    }
  }

  async function ticketYaratish() {
    if (!yangiMavzu.trim() || !yangiMatn.trim() || yaratilmoqda) return;
    setYaratilmoqda(true);
    try {
      const yangi = await supportApi.ticketYaratish({ subject: yangiMavzu.trim(), text: yangiMatn.trim() });
      setTickets((joriy) => [yangi, ...joriy]);
      setTab(yangi.status ?? "ACTIVE");
      setTanlanganId(yangi.id);
      setMobilChat(true);
      setYangiOchiq(false);
      setYangiMavzu("");
      setYangiMatn("");
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setYaratilmoqda(false);
    }
  }

  function fayllarTanlandi(event: React.ChangeEvent<HTMLInputElement>) {
    const tanlanganlar = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (tanlanganlar.length) setFayllar((joriy) => [...joriy, ...tanlanganlar]);
  }

  const ilovalar = useMemo(() => xabarlar.flatMap((x) => x.attachments ?? []), [xabarlar]);
  const yakunlangan = tanlangan?.status === "COMPLETED";
  const mutaxassis = tanlangan?.assignee ?? null;

  return (
    <div className="grid h-[calc(100vh-140px)] min-h-[560px] gap-4 xl:grid-cols-[340px_minmax(0,1fr)_320px]">
      {/* ================= Chap: murojaatlar ================= */}
      <aside className={`min-h-0 flex-col overflow-hidden rounded-[26px] border border-slate-100 bg-white shadow-[0_18px_50px_rgba(37,99,235,.08)] ${mobilChat ? "hidden xl:flex" : "flex"}`}>
        <div className="space-y-3 p-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={qidiruv}
                onChange={(event) => setQidiruv(event.target.value)}
                placeholder={t("inbox.searchPlaceholder")}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>
            {rejim === "tickets" && (
              <button
                type="button"
                onClick={() => setYangiOchiq(true)}
                aria-label={t("inbox.newTicket")}
                title={t("inbox.newTicket")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-md shadow-blue-200 transition hover:scale-105"
              >
                <MessageSquarePlus size={18} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1" role="tablist">
            {TABLAR.map((holat) => (
              <button
                key={holat}
                type="button"
                role="tab"
                aria-selected={tab === holat}
                onClick={() => tabniOzgartirish(holat)}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-1.5 py-2 text-xs font-bold transition ${
                  tab === holat ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="truncate">{t(`inbox.tabs.${holat}`)}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${tab === holat ? "bg-blue-50 text-blue-600" : "bg-white/70 text-slate-400"}`}>
                  {tabSonlari[holat]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {rejim === "yagona" && (
          <p className="mx-4 mb-2 flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-semibold leading-4 text-blue-700">
            <Info size={14} className="mt-px shrink-0" />
            {t("inbox.singleModeBanner")}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-100">
          {rejim === "yuklanmoqda" ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 text-sm font-semibold text-slate-400">
              <LoaderCircle size={24} className="animate-spin text-blue-600" />
              {t("inbox.loadingList")}
            </div>
          ) : korinadiganTicketlar.length === 0 ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Headset size={22} /></span>
              <p className="text-sm font-bold text-slate-600">{t("inbox.noTickets")}</p>
              <p className="text-xs font-medium text-slate-400">{t("inbox.noTicketsText")}</p>
            </div>
          ) : (
            <ul>
              {korinadiganTicketlar.map((item) => {
                const faol = item.id === tanlanganId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => ticketniTanlash(item.id)}
                      className={`relative flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3.5 text-left transition ${
                        faol ? "bg-blue-50/70" : "hover:bg-slate-50"
                      }`}
                    >
                      {faol && <span className="absolute inset-y-0 left-0 w-1 bg-blue-600" />}
                      <span className="relative shrink-0">
                        <Avatar className="!size-11 border border-blue-100 bg-blue-50">
                          <AvatarImage src={item.assignee?.avatarUrl ?? undefined} alt="" />
                          <AvatarFallback className="bg-gradient-to-br from-blue-50 to-sky-100 text-blue-600">
                            <Headset size={19} />
                          </AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${HOLAT_NUQTASI[item.status]}`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-slate-800">{item.subject}</span>
                          <span className="shrink-0 text-[11px] font-semibold text-slate-400">{royxatVaqti(item.lastMessageAt ?? item.createdAt)}</span>
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium text-slate-500">
                            {item.lastMessage || t("inbox.noMessagesPreview")}
                          </span>
                          {(item.unreadCount ?? 0) > 0 && (
                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-black text-white">
                              {(item.unreadCount ?? 0) > 9 ? "9+" : item.unreadCount}
                            </span>
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

      {/* ================= O'rta: suhbat ================= */}
      <section className={`min-h-0 flex-col overflow-hidden rounded-[26px] border border-slate-100 bg-white shadow-[0_18px_50px_rgba(37,99,235,.08)] ${mobilChat ? "flex" : "hidden xl:flex"}`}>
        {!tanlangan ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-blue-50 to-sky-100 text-blue-600 ring-1 ring-blue-100">
              <Headset size={36} />
            </span>
            <p className="text-base font-bold text-slate-900">{t("inbox.selectTicket")}</p>
            <p className="max-w-xs text-sm text-slate-500">{t("inbox.selectTicketText")}</p>
          </div>
        ) : (
          <>
            <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-6">
              <button
                type="button"
                onClick={() => setMobilChat(false)}
                aria-label={t("inbox.back")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 xl:hidden"
              >
                <ArrowLeft size={18} />
              </button>
              <Avatar className="!size-11 shrink-0 border border-blue-100 bg-blue-50">
                <AvatarImage src={mutaxassis?.avatarUrl ?? undefined} alt="" />
                <AvatarFallback className="bg-gradient-to-br from-blue-50 to-sky-100 text-blue-600"><Headset size={19} /></AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold leading-5 text-slate-900">{tanlangan.subject}</h2>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{mutaxassis?.name ?? t("supportTeamName")}</p>
              </div>
              <span className={`hidden shrink-0 rounded-full px-3 py-1 text-xs font-bold sm:inline-flex ${HOLAT_RANGI[tanlangan.status]}`}>
                {t(`inbox.statusLabel.${tanlangan.status}`)}
              </span>
              {rejim === "tickets" && (
                yakunlangan ? (
                  <button
                    type="button"
                    onClick={() => void holatniOzgartirish("ACTIVE")}
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-blue-200 px-3.5 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
                  >
                    <RotateCcw size={15} />
                    <span className="hidden sm:inline">{t("inbox.reopen")}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void holatniOzgartirish("COMPLETED")}
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-emerald-500 px-3.5 text-sm font-bold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-600"
                  >
                    <CheckCircle2 size={16} />
                    <span className="hidden sm:inline">{t("inbox.complete")}</span>
                  </button>
                )
              )}
            </header>

            {xatolik && (
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 sm:px-6">
                <span>{xatolik}</span>
                <button type="button" onClick={() => setXatolik(null)} aria-label={t("closeErrorAria")} className="shrink-0 rounded-md p-1 text-red-500 hover:bg-red-100">
                  <X size={16} />
                </button>
              </div>
            )}

            <ScrollArea className="min-h-0 flex-1 bg-gradient-to-b from-slate-50 via-white to-blue-50/50">
              <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-8">
                {xabarlarYuklanmoqda ? (
                  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-sm font-medium text-slate-500">
                    <LoaderCircle size={22} className="animate-spin text-blue-600" />
                    {t("loading")}
                  </div>
                ) : xabarlar.length === 0 ? (
                  <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                    <span className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-blue-50 to-sky-100 text-blue-600 ring-1 ring-blue-100">
                      <Headset size={36} />
                    </span>
                    <p className="text-base font-bold text-slate-900">{t("emptyTitle")}</p>
                    <p className="max-w-xs text-sm text-slate-500">{t("emptyText")}</p>
                  </div>
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
                          {eskilarYuklanmoqda ? t("loadingOlder") : t("loadOlder")}
                        </button>
                      </div>
                    )}
                    <KunlarRoyxati kunlar={kunlarBoyicha} t={t} />
                  </>
                )}
                <div ref={oxirigaRef} />
              </div>
            </ScrollArea>

            {yakunlangan ? (
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-8">
                <p className="text-sm font-medium text-slate-500">{t("inbox.completedNotice")}</p>
                <button
                  type="button"
                  onClick={() => void holatniOzgartirish("ACTIVE")}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  <RotateCcw size={15} />
                  {t("inbox.reopen")}
                </button>
              </div>
            ) : (
              <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-4 sm:px-8 sm:py-5">
                {fayllar.length > 0 && (
                  <div className="mx-auto mb-2.5 flex w-full max-w-3xl flex-wrap gap-2">
                    {fayllar.map((fayl, index) => (
                      <span key={`${fayl.name}-${index}`} className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-800">
                        <FileText size={13} className="shrink-0 text-blue-500" />
                        <span className="max-w-[140px] truncate">{fayl.name}</span>
                        <button type="button" onClick={() => setFayllar((joriy) => joriy.filter((_, i) => i !== index))} aria-label={t("removeAttachmentAria")} className="shrink-0 text-blue-500 hover:text-red-600">
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-[26px] border border-slate-200 bg-slate-50 p-2 shadow-sm transition focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-[0_8px_28px_rgba(37,99,235,.12)] focus-within:ring-4 focus-within:ring-blue-50">
                  <input ref={faylInputRef} type="file" multiple onChange={fayllarTanlandi} className="hidden" />
                  <Button type="button" variant="ghost" size="icon" aria-label={t("attachAria")} onClick={() => faylInputRef.current?.click()} className="!size-10 shrink-0 rounded-full text-slate-500 hover:bg-blue-50 hover:text-blue-600">
                    <Paperclip size={17} />
                  </Button>
                  <Textarea
                    value={matn}
                    onChange={(event) => setMatn(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void yuborish();
                      }
                    }}
                    rows={1}
                    placeholder={t("inputPlaceholder")}
                    className="min-h-10 max-h-32 min-w-0 flex-1 resize-none border-none bg-transparent px-1 py-2.5 text-sm font-medium leading-5 text-slate-900 shadow-none outline-none placeholder:text-slate-400 focus-visible:ring-0"
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => void yuborish()}
                    disabled={(!matn.trim() && fayllar.length === 0) || yuborilmoqda}
                    aria-label={t("sendAria")}
                    className="!size-10 shrink-0 rounded-full border-none bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-md shadow-blue-200 transition hover:scale-105 disabled:scale-100 disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                  >
                    {yuborilmoqda ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ================= O'ng: murojaat haqida ================= */}
      <aside className="hidden min-h-0 flex-col overflow-y-auto rounded-[26px] border border-slate-100 bg-white shadow-[0_18px_50px_rgba(37,99,235,.08)] xl:flex">
        {tanlangan ? (
          <>
            <div className="border-b-2 border-slate-100 p-6 text-center">
              <Avatar className="mx-auto !size-20 border-2 border-blue-100 bg-blue-50">
                <AvatarImage src={mutaxassis?.avatarUrl ?? undefined} alt="" />
                <AvatarFallback className="bg-gradient-to-br from-blue-50 to-sky-100 text-blue-600"><Headset size={30} /></AvatarFallback>
              </Avatar>
              <p className="mt-3 text-base font-black text-slate-900">{mutaxassis?.name ?? t("supportTeamName")}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-400">
                {mutaxassis ? mutaxassis.role || t("inbox.info.agentRole") : t("inbox.info.teamRole")}
              </p>
              {!mutaxassis && rejim === "tickets" && (
                <p className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-600">{t("inbox.info.agentNone")}</p>
              )}
            </div>

            <dl className="divide-y-2 divide-slate-100 px-6 [&>div]:py-3.5">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm font-bold text-slate-400">{t("inbox.info.phone")}</dt>
                <dd className="text-sm font-black text-slate-800">{profil?.phone || "—"}</dd>
              </div>
              {tanlangan.id !== YAGONA_ID && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-sm font-bold text-slate-400">{t("inbox.info.number")}</dt>
                  <dd className="text-sm font-black text-slate-800">{`#${tanlangan.id.slice(-6).toUpperCase()}`}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm font-bold text-slate-400">{t("inbox.info.status")}</dt>
                <dd className={`rounded-full px-2.5 py-1 text-xs font-bold ${HOLAT_RANGI[tanlangan.status]}`}>{t(`inbox.statusLabel.${tanlangan.status}`)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm font-bold text-slate-400">{t("inbox.info.created")}</dt>
                <dd className="text-right text-sm font-semibold text-slate-700">{toliqSana(tanlangan.createdAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm font-bold text-slate-400">{t("inbox.info.lastReply")}</dt>
                <dd className="text-right text-sm font-semibold text-slate-700">{toliqSana(tanlangan.lastMessageAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm font-bold text-slate-400">{t("inbox.info.messages")}</dt>
                <dd className="text-sm font-black text-slate-800">{tanlangan.messageCount ?? xabarlar.length}</dd>
              </div>
            </dl>

            <div className="border-t-2 border-slate-100 px-6 py-4">
              <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">{t("inbox.info.files")}</p>
              {ilovalar.length === 0 ? (
                <p className="text-xs font-semibold text-slate-400">{t("inbox.info.filesEmpty")}</p>
              ) : (
                <ul className="space-y-2">
                  {ilovalar.slice(-5).map((ilova) => (
                    <li key={ilova.id}>
                      <button
                        type="button"
                        onClick={() => void crmIlovalarApi.yuklabOlish(ilova.id, ilova.name)}
                        className="flex w-full items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-blue-50"
                      >
                        <FileText size={15} className="shrink-0 text-blue-500" />
                        <span className="min-w-0 flex-1 truncate">{ilova.name}</span>
                        <Download size={14} className="shrink-0 text-slate-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t-2 border-slate-100 px-6 py-4">
              <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">{t("inbox.info.history")}</p>
              {tarixTicketlari.length === 0 ? (
                <p className="text-xs font-semibold text-slate-400">{t("inbox.info.historyEmpty")}</p>
              ) : (
                <ul className="space-y-1">
                  {tarixTicketlari.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => { setTab(item.status); ticketniTanlash(item.id); }}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50"
                      >
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${HOLAT_NUQTASI[item.status]}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-700">{item.subject}</span>
                          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400"><Clock3 size={11} />{toliqSana(item.createdAt)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {rejim === "yagona" && (
              <p className="mx-6 mb-6 mt-auto rounded-xl bg-blue-50 px-3 py-2.5 text-[11px] font-semibold leading-4 text-blue-700">{t("inbox.info.hint")}</p>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm font-medium text-slate-400">{t("inbox.selectTicketText")}</div>
        )}
      </aside>

      {/* ================= Yangi murojaat ================= */}
      {yangiOchiq && (
        <AppModal onClose={() => setYangiOchiq(false)} className="p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-slate-900">{t("inbox.newTicketTitle")}</h3>
              <button type="button" onClick={() => setYangiOchiq(false)} aria-label={t("closeChatAria")} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-bold text-slate-600">
                {t("inbox.subjectLabel")}
                <input
                  value={yangiMavzu}
                  onChange={(event) => setYangiMavzu(event.target.value)}
                  placeholder={t("inbox.subjectPlaceholder")}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block text-sm font-bold text-slate-600">
                {t("inbox.firstMessageLabel")}
                <textarea
                  value={yangiMatn}
                  onChange={(event) => setYangiMatn(event.target.value)}
                  rows={5}
                  placeholder={t("inbox.firstMessagePlaceholder")}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setYangiOchiq(false)} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-500 hover:bg-slate-50">{t("inbox.cancel")}</button>
              <button
                type="button"
                onClick={() => void ticketYaratish()}
                disabled={!yangiMavzu.trim() || !yangiMatn.trim() || yaratilmoqda}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {yaratilmoqda && <LoaderCircle size={16} className="animate-spin" />}
                {t("inbox.create")}
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}
