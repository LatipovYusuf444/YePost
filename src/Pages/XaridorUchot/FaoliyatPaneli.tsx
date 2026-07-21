import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Briefcase,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  MessageSquare,
  UserRound,
  Wallet,
} from "lucide-react";
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

const yozishTablari: { kalit: FaoliyatTuri; nom: string }[] = [
  { kalit: "ish", nom: "Ish" },
  { kalit: "izoh", nom: "Izoh" },
  { kalit: "xabar", nom: "Xabar" },
  { kalit: "vazifa", nom: "Vazifa" },
];

const sarlavhaPlaceholder: Record<FaoliyatTuri, string> = {
  ish: "Mijoz bilan bog'lanish",
  izoh: "Izoh sarlavhasi",
  xabar: "Xabar mavzusi",
  vazifa: "Vazifa nomi",
  tolov: "",
  ozgarish: "",
};

const tafsilotPlaceholder: Record<FaoliyatTuri, string> = {
  ish: "Vazifa haqida batafsil yozing...",
  izoh: "Izoh matnini yozing...",
  xabar: "Xabar matnini yozing...",
  vazifa: "Vazifa haqida batafsil yozing...",
  tolov: "",
  ozgarish: "",
};

function hozirgiVaqt() {
  const sana = new Date();
  return `${String(sana.getHours()).padStart(2, "0")}:${String(sana.getMinutes()).padStart(2, "0")}`;
}

function muddatMatni(sana: string, vaqt: string) {
  const kun = sana === bugun() ? "Bugun" : sanaFormat(sana);
  return `${kun}, soat ${vaqt || "—"}`;
}

type Props = {
  boshlangichYozuvlar?: FaoliyatYozuvi[];
  customerId?: string;
  partnerId?: string;
};

const BOSH_YOZUVLAR: FaoliyatYozuvi[] = [];

function activityYozuvi(item: Activity): FaoliyatYozuvi {
  return { id: item.id, turi: item.type === "TASK" ? "vazifa" : "ish", sarlavha: item.subject || "CRM faoliyati", matn: item.description || item.result || "", sana: item.dueAt || item.createdAt || new Date().toISOString() };
}

function commentYozuvi(item: Comment): FaoliyatYozuvi {
  return { id: item.id, turi: "izoh", sarlavha: "Izoh", matn: item.text || "", sana: item.createdAt || new Date().toISOString() };
}

function chatYozuvi(item: ChatMessage, index: number): FaoliyatYozuvi {
  return { id: item.id || `chat-${item.createdAt || index}`, turi: "xabar", sarlavha: item.direction === "IN" ? "Mijozdan xabar" : "Xabar yuborildi", matn: item.text || "", sana: item.createdAt || new Date().toISOString() };
}

export default function FaoliyatPaneli({ boshlangichYozuvlar = BOSH_YOZUVLAR, customerId, partnerId }: Props) {
  const [faoliyatTab, setFaoliyatTab] = useState<FaoliyatTuri>("ish");
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
    if (!partnerId && !customerId) { setYozuvlar(boshlangichYozuvlar); return; }
    setYuklanmoqda(true); setXatolik("");
    try {
      const [activities, comments, chat, profile] = await Promise.all([
        crmApi.activities(partnerId ? { partnerId } : { customerId }),
        partnerId ? crmApi.partnerComments(partnerId, { limit: 100 }) : crmApi.comments(customerId!, { limit: 100 }),
        partnerId ? crmApi.partnerChatTarixi(partnerId, { limit: 100 }) : crmApi.chatTarixi(customerId!, { limit: 100 }),
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
  }, [boshlangichYozuvlar, customerId, partnerId]);

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
    if (!partnerId && !customerId) { setXatolik("CRM faoliyatini saqlash uchun real partner ID mavjud emas."); return; }
    const muddat = new Date(`${sana}T${vaqt || "00:00"}`);
    setSaqlanmoqda(true); setXatolik("");
    try {
      if (faoliyatTab === "izoh") {
        const data = { text: tafsilot.trim() || tozaSarlavha, attachments: [] };
        if (partnerId) await crmApi.partnerCommentYaratish(partnerId, data);
        else await crmApi.commentYaratish(customerId!, data);
      } else if (faoliyatTab === "xabar") {
        if (partnerId) await crmApi.partnerChatXabarYuborish(partnerId, tafsilot.trim() || tozaSarlavha);
        else await crmApi.chatXabarYuborish(customerId!, tafsilot.trim() || tozaSarlavha);
      }
      else {
        if (!assigneeId) throw new Error("Joriy mas’ul foydalanuvchi aniqlanmadi.");
        await crmApi.activityYaratish({ type: faoliyatTab === "vazifa" ? "TASK" : "CALL", ...(partnerId ? { partnerId } : { customerId }), subject: tozaSarlavha, description: tafsilot.trim() || undefined, dueAt: Number.isNaN(muddat.getTime()) ? new Date().toISOString() : muddat.toISOString(), assigneeId });
      }
      tozalash(); await yuklash();
    } catch (error) { setXatolik(getApiErrorMessage(error)); }
    finally { setSaqlanmoqda(false); }
  }

  return (
    <div className="space-y-5">
      {xatolik && <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-600">{xatolik}</div>}
      <section className="overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          {yozishTablari.map((tab) => (
            <button
              key={tab.kalit}
              type="button"
              onClick={() => setFaoliyatTab(tab.kalit)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold transition ${
                faoliyatTab === tab.kalit
                  ? "border border-orange-200 bg-orange-50 text-[#FF6A00]"
                  : "text-slate-500 hover:bg-orange-50 hover:text-[#FF6A00]"
              }`}
            >
              {tab.nom}
            </button>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-500 transition hover:bg-orange-50 hover:text-[#FF6A00]"
          >
            Ko'proq <ChevronDown size={14} />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-orange-300 bg-gradient-to-br from-white to-[#FFF7EC] p-4 shadow-inner transition focus-within:ring-4 focus-within:ring-orange-100">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-3">
              <input
                value={sarlavha}
                onChange={(event) => setSarlavha(event.target.value)}
                placeholder={sarlavhaPlaceholder[faoliyatTab]}
                className="h-9 w-full border-0 bg-transparent text-base font-semibold text-slate-700 outline-none placeholder:text-slate-700"
              />
              <textarea
                value={tafsilot}
                onChange={(event) => setTafsilot(event.target.value)}
                rows={4}
                placeholder={tafsilotPlaceholder[faoliyatTab]}
                className="w-full resize-none border-0 bg-transparent text-sm font-semibold leading-6 text-slate-600 outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="flex shrink-0 items-center gap-3 pt-1">
              <span className="h-3.5 w-3.5 rounded-full bg-amber-400" title="Muhimlik" />
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-[#FF6A00]"
                title="Mas'ul"
              >
                <UserRound size={18} />
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="inline-flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/80 px-3 py-2 text-sm font-semibold text-slate-700">
              <CalendarDays size={16} className="shrink-0 text-[#FF6A00]" />
              <span className="shrink-0">{muddatMatni(sana, vaqt)}</span>
              <input
                type="date"
                value={sana}
                onChange={(event) => setSana(event.target.value)}
                className="h-7 rounded-lg border border-orange-100 bg-white px-2 text-xs font-bold text-slate-600 outline-none focus:border-[#FF6A00]"
              />
              <input
                type="time"
                value={vaqt}
                onChange={(event) => setVaqt(event.target.value)}
                className="h-7 rounded-lg border border-orange-100 bg-white px-2 text-xs font-bold text-slate-600 outline-none focus:border-[#FF6A00]"
              />
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-orange-50 hover:text-[#FF6A00]"
              title="Eslatma"
            >
              <Bell size={18} />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void saqlash()}
              disabled={!sarlavha.trim() || saqlanmoqda || (!partnerId && !customerId)}
              className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#FF6A00] px-6 text-sm font-black uppercase text-white shadow-[0_12px_28px_rgba(255,106,0,.22)] transition hover:-translate-y-0.5 hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:bg-orange-200 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {saqlanmoqda ? "Saqlanmoqda..." : "Saqlash"}
            </button>
            <button
              type="button"
              onClick={tozalash}
              className="inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-black uppercase text-slate-600 transition hover:bg-orange-50 hover:text-[#FF6A00]"
            >
              Bekor qilish
            </button>
          </div>
        </div>
      </section>

      <div className="flex justify-center">
        <span className="rounded-full bg-orange-50 px-5 py-1.5 text-sm font-bold text-[#FF6A00]">
          Faoliyat
        </span>
      </div>

      <div className="space-y-4">
        {yuklanmoqda && <p className="rounded-[22px] bg-white/70 p-6 text-center text-sm font-semibold text-slate-400">CRM ma’lumotlari yuklanmoqda...</p>}
        {yozuvlar.map((yozuv) => (
          <article
            key={yozuv.id}
            className="relative overflow-hidden rounded-[22px] bg-white/92 p-5 shadow-[0_14px_36px_rgba(255,106,0,.07)] ring-1 ring-orange-100/70"
          >
            <span className="absolute inset-y-0 left-0 w-1.5 bg-[#FF6A00]" />
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[#FF6A00]">
                <FaoliyatIkonka turi={yozuv.turi} />
              </span>
              <h3 className="text-base font-black text-slate-900">{yozuv.sarlavha}</h3>
              <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-bold text-[#FF6A00]">
                {qisqaVaqt(yozuv.sana)}
              </span>
            </div>
            {yozuv.matn && (
              <p className="mt-3 text-sm leading-6 text-slate-600">{yozuv.matn}</p>
            )}
          </article>
        ))}

        {yozuvlar.length === 0 && (
          <p className="rounded-[22px] border border-dashed border-orange-200 bg-white/60 p-10 text-center text-sm font-semibold text-slate-400">
            Faoliyat yozuvlari yo'q
          </p>
        )}
      </div>
    </div>
  );
}

function FaoliyatIkonka({ turi }: { turi: FaoliyatTuri }) {
  if (turi === "tolov") return <Wallet size={15} />;
  if (turi === "izoh" || turi === "xabar") return <MessageSquare size={15} />;
  if (turi === "vazifa") return <CheckSquare size={15} />;
  if (turi === "ish") return <Briefcase size={15} />;
  return <Bell size={15} />;
}
