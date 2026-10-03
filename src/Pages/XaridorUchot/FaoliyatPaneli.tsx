import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  MessageSquare,
  PenLine,
  Send,
  UserRound,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { crmApi, royxatniAjratish } from "@/api/crmApi";
import { profilApi } from "@/api/authProfileApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { Activity, ChatMessage, Comment } from "@/types/crm";
import { bugun, qisqaVaqt, sanaFormat } from "./yordamchilar";

// Tafsilotlar modalkalarining o'ng ustunidagi real CRM faoliyat oqimi.

export type FaoliyatTuri = "ish" | "izoh" | "xabar" | "vazifa" | "tolov" | "ozgarish";

export type FaoliyatYozuvi = {
  id: string;
  turi: FaoliyatTuri;
  sarlavha: string;
  matn: string;
  sana: string; // ISO — rejalashtirilgan muddat yoki qo'shilgan vaqt
};

const yozishTabKalitlari: FaoliyatTuri[] = ["ish", "izoh", "xabar", "vazifa"];

function hozirgiVaqt() {
  const sana = new Date();
  return `${String(sana.getHours()).padStart(2, "0")}:${String(sana.getMinutes()).padStart(2, "0")}`;
}

type Props = {
  boshlangichYozuvlar?: FaoliyatYozuvi[];
  customerId?: string;
  partnerId?: string;
};

const BOSH_YOZUVLAR: FaoliyatYozuvi[] = [];

export default function FaoliyatPaneli({ boshlangichYozuvlar = BOSH_YOZUVLAR, partnerId }: Props) {
  const { t } = useTranslation(["xaridor_uchot", "common"]);

  const activityYozuvi = useCallback((item: Activity): FaoliyatYozuvi => {
    return { id: item.id, turi: item.type === "TASK" ? "vazifa" : "ish", sarlavha: item.subject || t("faoliyatPaneli.defaultActivitySubject"), matn: item.description || item.result || "", sana: item.dueAt || item.createdAt || new Date().toISOString() };
  }, [t]);

  const commentYozuvi = useCallback((item: Comment): FaoliyatYozuvi => {
    return { id: item.id, turi: "izoh", sarlavha: t("faoliyatPaneli.commentSubject"), matn: item.text || "", sana: item.createdAt || new Date().toISOString() };
  }, [t]);

  const chatYozuvi = useCallback((item: ChatMessage, index: number): FaoliyatYozuvi => {
    return { id: item.id || `chat-${item.createdAt || index}`, turi: "xabar", sarlavha: item.direction === "IN" ? t("faoliyatPaneli.chatFromCustomer") : t("faoliyatPaneli.chatSent"), matn: item.text || "", sana: item.createdAt || new Date().toISOString() };
  }, [t]);

  const yozishTablari = yozishTabKalitlari.map((kalit) => ({ kalit, nom: t(`faoliyatPaneli.tabs.${kalit}`) }));
  const sarlavhaPlaceholder: Record<FaoliyatTuri, string> = {
    ish: t("faoliyatPaneli.titlePlaceholders.ish"),
    izoh: t("faoliyatPaneli.titlePlaceholders.izoh"),
    xabar: t("faoliyatPaneli.titlePlaceholders.xabar"),
    vazifa: t("faoliyatPaneli.titlePlaceholders.vazifa"),
    tolov: "",
    ozgarish: "",
  };
  const tafsilotPlaceholder: Record<FaoliyatTuri, string> = {
    ish: t("faoliyatPaneli.detailPlaceholders.ish"),
    izoh: t("faoliyatPaneli.detailPlaceholders.izoh"),
    xabar: t("faoliyatPaneli.detailPlaceholders.xabar"),
    vazifa: t("faoliyatPaneli.detailPlaceholders.vazifa"),
    tolov: "",
    ozgarish: "",
  };
  function muddatMatni(sana: string, vaqt: string) {
    const kun = sana === bugun() ? t("faoliyatPaneli.today") : sanaFormat(sana);
    return t("faoliyatPaneli.dueLabel", { day: kun, time: vaqt || "—" });
  }

  const [faoliyatTab, setFaoliyatTab] = useState<FaoliyatTuri>("ish");
  const [ochiq, setOchiq] = useState(false);
  const [sanaMenyuOchiq, setSanaMenyuOchiq] = useState(false);
  const [sarlavha, setSarlavha] = useState("");
  const [tafsilot, setTafsilot] = useState("");
  const [sana, setSana] = useState(bugun());
  const [vaqt, setVaqt] = useState(hozirgiVaqt());
  const [yozuvlar, setYozuvlar] = useState<FaoliyatYozuvi[]>(boshlangichYozuvlar);
  const [assigneeId, setAssigneeId] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xatolik, setXatolik] = useState("");

  const yuklash = useCallback(async () => {
    if (!partnerId) { setYozuvlar(boshlangichYozuvlar); return; }
    setYuklanmoqda(true); setXatolik("");
    try {
      const [activities, comments, chat, profile] = await Promise.all([
        crmApi.activities({ partnerId }),
        crmApi.partnerComments(partnerId, { limit: 100 }),
        crmApi.partnerChatTarixi(partnerId, { limit: 100 }),
        profilApi.olish(),
      ]);
      setAssigneeId(profile.id);
      setYozuvlar([
        ...activities.map(activityYozuvi),
        ...royxatniAjratish(comments).map(commentYozuvi),
        ...royxatniAjratish(chat).map(chatYozuvi),
        ...boshlangichYozuvlar,
      ].sort((a,b) => new Date(b.sana).getTime() - new Date(a.sana).getTime()));
    } catch (error) { setXatolik(getApiErrorMessage(error)); }
    finally { setYuklanmoqda(false); }
  }, [activityYozuvi, boshlangichYozuvlar, chatYozuvi, commentYozuvi, partnerId]);

  useEffect(() => { void yuklash(); }, [yuklash]);

  function tozalash() {
    setSarlavha("");
    setTafsilot("");
    setSana(bugun());
    setVaqt(hozirgiVaqt());
  }

  async function saqlash() {
    const tozaSarlavha = sarlavha.trim();
    if (!tozaSarlavha) return;
    if (!partnerId) { setXatolik(t("faoliyatPaneli.errors.noPartnerId")); return; }
    const muddat = new Date(`${sana}T${vaqt || "00:00"}`);
    setSaqlanmoqda(true); setXatolik("");
    try {
      if (faoliyatTab === "izoh") {
        const data = { text: tafsilot.trim() || tozaSarlavha };
        await crmApi.partnerCommentYaratish(partnerId, data);
      } else if (faoliyatTab === "xabar") {
        await crmApi.partnerChatXabarYuborish(partnerId, tafsilot.trim() || tozaSarlavha);
      }
      else {
        if (!assigneeId) throw new Error(t("faoliyatPaneli.errors.noAssignee"));
        await crmApi.activityYaratish({ type: faoliyatTab === "vazifa" ? "TASK" : "CALL", partnerId, subject: tozaSarlavha, description: tafsilot.trim() || undefined, dueAt: Number.isNaN(muddat.getTime()) ? new Date().toISOString() : muddat.toISOString(), assigneeId });
      }
      tozalash(); setOchiq(false); await yuklash();
    } catch (error) { setXatolik(getApiErrorMessage(error)); }
    finally { setSaqlanmoqda(false); }
  }

  return (
    <div className="space-y-5">
      {xatolik && <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-600">{xatolik}</div>}
      <section className="overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(37,99,235,.08)] ring-1 ring-orange-100/80 backdrop-blur">
        <nav className="mb-4 flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-50 p-1.5 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
          {yozishTablari.map((tab) => (
            <button
              key={tab.kalit}
              type="button"
              onClick={() => {
                setFaoliyatTab(tab.kalit);
                setOchiq(true);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 transition ${
                faoliyatTab === tab.kalit && ochiq
                  ? "bg-white text-[#2563EB] shadow-sm ring-1 ring-orange-100"
                  : "hover:bg-white/70 hover:text-[#2563EB]"
              }`}
            >
              <FaoliyatIkonka turi={tab.kalit} size={16} />
              {tab.nom}
            </button>
          ))}
        </nav>

        {!ochiq ? (
          <button
            type="button"
            onClick={() => setOchiq(true)}
            className="flex h-14 w-full items-center gap-3 rounded-xl border border-orange-100 bg-[#F8FAFC]/60 px-5 text-left text-slate-400 transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50 hover:shadow-sm"
          >
            <PenLine size={18} className="shrink-0 text-slate-300" />
            <span>{t("faoliyatPaneli.collapsedPlaceholder")}</span>
          </button>
        ) : (
          <div className="animate-in slide-in-from-top-2 fade-in-0 duration-300">
            <div className="rounded-2xl border border-orange-300 bg-gradient-to-br from-white to-[#F8FAFC] p-4 shadow-inner transition-all duration-300 ease-in-out focus-within:ring-4 focus-within:ring-orange-100">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <input
                    value={sarlavha}
                    onChange={(event) => setSarlavha(event.target.value)}
                    placeholder={sarlavhaPlaceholder[faoliyatTab]}
                    autoFocus
                    className="h-10 w-full bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-700"
                  />
                  <textarea
                    value={tafsilot}
                    onChange={(event) => setTafsilot(event.target.value)}
                    rows={3}
                    placeholder={tafsilotPlaceholder[faoliyatTab]}
                    className="mt-4 min-h-[72px] w-full resize-none bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
                  />
                </div>
                <div className="flex h-10 shrink-0 items-center gap-2 text-slate-400">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-amber-400 ring-4 ring-amber-50" title={t("faoliyatPaneli.priorityTitle")} />
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-[#2563EB]"
                    title={t("faoliyatPaneli.responsibleTitle")}
                  >
                    <UserRound size={18} />
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSanaMenyuOchiq((joriy) => !joriy)}
                    className={`inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold text-slate-700 transition ${
                      sanaMenyuOchiq ? "border-[#2563EB] ring-4 ring-orange-100" : "border-slate-200 hover:border-orange-200"
                    }`}
                    aria-expanded={sanaMenyuOchiq}
                  >
                    <CalendarDays size={16} className="shrink-0 text-slate-400" />
                    {muddatMatni(sana, vaqt)}
                    <ChevronDown size={15} className={`shrink-0 text-slate-400 transition ${sanaMenyuOchiq ? "rotate-180" : ""}`} />
                  </button>
                  {sanaMenyuOchiq && (
                    <>
                      <button
                        type="button"
                        aria-label={t("common:actions.cancel")}
                        className="fixed inset-0 z-30 cursor-default"
                        onClick={() => setSanaMenyuOchiq(false)}
                      />
                      <div className="absolute left-0 top-12 z-40 w-72 rounded-2xl bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,.16)] ring-1 ring-orange-100">
                        <label className="grid gap-1.5 text-xs font-bold text-slate-500">
                          {t("faoliyatPaneli.dateLabel")}
                          <input
                            type="date"
                            value={sana}
                            onChange={(event) => setSana(event.target.value)}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100"
                          />
                        </label>
                        <label className="mt-3 grid gap-1.5 text-xs font-bold text-slate-500">
                          {t("faoliyatPaneli.timeLabel")}
                          <input
                            type="time"
                            value={vaqt}
                            onChange={(event) => setVaqt(event.target.value)}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100"
                          />
                        </label>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSana(bugun());
                              setVaqt(hozirgiVaqt());
                            }}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100"
                          >
                            {t("faoliyatPaneli.resetDate")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSanaMenyuOchiq(false)}
                            className="rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-black text-white transition hover:bg-[#1D4ED8]"
                          >
                            {t("faoliyatPaneli.dateDone")}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-orange-50 hover:text-[#2563EB]"
                  title={t("faoliyatPaneli.reminderTitle")}
                >
                  <Bell size={18} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => void saqlash()}
                disabled={!sarlavha.trim() || saqlanmoqda || !partnerId}
                className="rounded-full bg-[#2563EB] px-5 py-2 text-xs font-bold uppercase text-white transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {saqlanmoqda ? t("faoliyatPaneli.saving") : t("common:actions.save")}
              </button>
              <button
                type="button"
                onClick={() => {
                  tozalash();
                  setOchiq(false);
                }}
                className="text-xs font-bold uppercase text-slate-600 transition hover:text-slate-900"
              >
                {t("common:actions.cancel")}
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="flex justify-center">
        <span className="rounded-full bg-orange-50 px-5 py-1.5 text-sm font-bold text-[#2563EB]">
          {t("faoliyatPaneli.sectionBadge")}
        </span>
      </div>

      <div className="space-y-4">
        {yuklanmoqda && <p className="rounded-[22px] bg-white/70 p-6 text-center text-sm font-semibold text-slate-400">{t("faoliyatPaneli.loading")}</p>}
        {yozuvlar.map((yozuv) => (
          <article
            key={yozuv.id}
            className="rounded-[20px] border border-orange-100/80 bg-white/92 p-5 shadow-[0_14px_38px_rgba(37,99,235,.06)] transition duration-300 hover:shadow-[0_20px_50px_rgba(37,99,235,.10)]"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[#2563EB] ring-1 ring-orange-100">
                <FaoliyatIkonka turi={yozuv.turi} />
              </span>
              <h3 className="font-black text-slate-800">{yozuv.sarlavha}</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                {qisqaVaqt(yozuv.sana)}
              </span>
            </div>
            {yozuv.matn && (
              <p className="mt-3 break-words text-sm leading-6 text-slate-600">{yozuv.matn}</p>
            )}
          </article>
        ))}

        {yozuvlar.length === 0 && (
          <p className="rounded-[22px] border border-dashed border-orange-200 bg-white/60 p-10 text-center text-sm font-semibold text-slate-400">
            {t("faoliyatPaneli.empty")}
          </p>
        )}
      </div>
    </div>
  );
}

function FaoliyatIkonka({ turi, size = 15 }: { turi: FaoliyatTuri; size?: number }) {
  if (turi === "tolov") return <Wallet size={size} />;
  if (turi === "izoh") return <MessageSquare size={size} />;
  if (turi === "xabar") return <Send size={size} />;
  if (turi === "vazifa") return <ClipboardCheck size={size} />;
  if (turi === "ish") return <CalendarCheck size={size} />;
  return <Bell size={size} />;
}
