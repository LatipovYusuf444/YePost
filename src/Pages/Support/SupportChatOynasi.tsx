import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  CheckCheck,
  Download,
  FileText,
  Headset,
  LifeBuoy,
  LoaderCircle,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import { useSupportStore } from "@/store/supportStore";
import { crmIlovalarApi } from "@/api/crmAttachmentsApi";
import { Avatar, AvatarFallback, AvatarImage } from "@/Components/ui/avatar";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Textarea } from "@/Components/ui/textarea";
import { Button } from "@/Components/ui/button";
import type { QollabQuvvatlashXabari } from "@/types/support";

function kunBoshi(sana: Date) {
  return new Date(sana.getFullYear(), sana.getMonth(), sana.getDate()).getTime();
}

function vaqtMatni(iso: string) {
  const sana = new Date(iso);
  if (Number.isNaN(sana.getTime())) return "";
  return `${String(sana.getHours()).padStart(2, "0")}:${String(sana.getMinutes()).padStart(2, "0")}`;
}

function sanaSarlavhasi(iso: string, t: (key: string) => string) {
  const sana = new Date(iso);
  if (Number.isNaN(sana.getTime())) return "";
  const bugun = kunBoshi(new Date());
  const kun = kunBoshi(sana);
  if (kun === bugun) return t("today");
  if (kun === bugun - 86400000) return t("yesterday");
  return sana.toLocaleDateString("uz-UZ", { day: "2-digit", month: "long", year: "numeric" });
}

function sanaSarlavhasiKaliti(iso: string) {
  const sana = new Date(iso);
  if (Number.isNaN(sana.getTime())) return iso;
  return String(kunBoshi(sana));
}

type Guruh = { sana: string; xabarlar: QollabQuvvatlashXabari[][] };

// Ketma-ket kelgan bir xil yo'nalishdagi xabarlarni guruhlab, avatarni faqat
// guruhning oxirgi xabarida ko'rsatish uchun (shadcn "Message" uslubiga mos).
function guruhlash(xabarlar: QollabQuvvatlashXabari[]): Guruh[] {
  const kunlar: Guruh[] = [];

  for (const xabar of xabarlar) {
    const sanaKaliti = sanaSarlavhasiKaliti(xabar.createdAt);
    let kun = kunlar.at(-1);
    if (!kun || kun.sana !== sanaKaliti) {
      kun = { sana: sanaKaliti, xabarlar: [] };
      kunlar.push(kun);
    }
    const oxirgiGuruh = kun.xabarlar.at(-1);
    if (oxirgiGuruh && oxirgiGuruh[0].direction === xabar.direction) {
      oxirgiGuruh.push(xabar);
    } else {
      kun.xabarlar.push([xabar]);
    }
  }

  return kunlar;
}

// Chatni ilovaning asosiy ko'k palitrasi bilan bir xil tutamiz.
export const QOLLAB_QUVVATLASH_GRADIENT = "bg-gradient-to-br from-sky-500 to-blue-700";

type Props = { compact?: boolean; onClose?: () => void };

export default function SupportChatOynasi({ compact = false, onClose }: Props) {
  const { t } = useTranslation("support");
  const {
    xabarlar,
    nextCursor,
    yuklanmoqda,
    eskilarYuklanmoqda,
    yuborilmoqda,
    xatolik,
    ulanmagan,
    xabarlarniYuklash,
    yangiXabarlarniTekshirish,
    eskiXabarlarniYuklash,
    xabarYuborish,
    xatolikniTozalash,
  } = useSupportStore();
  const [matn, setMatn] = useState("");
  const [tanlanganFayllar, setTanlanganFayllar] = useState<File[]>([]);
  const [yuklabOlinmoqda, setYuklabOlinmoqda] = useState<string | null>(null);
  const oxirigaRef = useRef<HTMLDivElement | null>(null);
  const faylInputRef = useRef<HTMLInputElement | null>(null);
  const birinchiYuklanish = useRef(true);
  const oxirgiXabarIdRef = useRef<string | null>(null);

  useEffect(() => {
    void xabarlarniYuklash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void yangiXabarlarniTekshirish();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [yangiXabarlarniTekshirish]);

  useEffect(() => {
    const oxirgiId = xabarlar.at(-1)?.id;
    if (!oxirgiId || oxirgiXabarIdRef.current === oxirgiId) return;
    const ilkYuklanish = birinchiYuklanish.current;
    birinchiYuklanish.current = false;
    oxirgiXabarIdRef.current = oxirgiId;
    oxirigaRef.current?.scrollIntoView({ behavior: ilkYuklanish ? "auto" : "smooth", block: "end" });
  }, [xabarlar]);

  const kunlarBoyicha = useMemo(() => guruhlash(xabarlar), [xabarlar]);
  const oxirgiOutXabar = [...xabarlar].reverse().find((item) => item.direction === "OUT");

  function fayllarTanlandi(event: React.ChangeEvent<HTMLInputElement>) {
    const tanlangan = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (tanlangan.length) setTanlanganFayllar((joriy) => [...joriy, ...tanlangan]);
  }

  function faylniOlibTashlash(index: number) {
    setTanlanganFayllar((joriy) => joriy.filter((_, i) => i !== index));
  }

  async function yuklabOlish(attachment: { id: string; name: string }) {
    setYuklabOlinmoqda(attachment.id);
    try {
      await crmIlovalarApi.yuklabOlish(attachment.id, attachment.name);
    } finally {
      setYuklabOlinmoqda(null);
    }
  }

  async function yuborish() {
    if ((!matn.trim() && tanlanganFayllar.length === 0) || yuborilmoqda) return;
    const yuborilganMatn = matn;
    const yuborilganFayllar = tanlanganFayllar;
    setMatn("");
    setTanlanganFayllar([]);
    const ok = await xabarYuborish(yuborilganMatn, yuborilganFayllar);
    if (!ok) {
      setMatn(yuborilganMatn);
      setTanlanganFayllar(yuborilganFayllar);
    }
  }

  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden bg-white ${
        compact ? "h-full" : "h-[calc(100vh-140px)] min-h-[560px] rounded-[24px] border border-slate-200 shadow-sm"
      }`}
    >
      <header className={`flex shrink-0 items-center gap-3 border-b border-slate-100 bg-white ${compact ? "px-4 py-3.5" : "px-6 py-4"}`}>
        <Avatar size="lg" className="!size-10 border border-blue-100 bg-blue-50 text-blue-700">
          <AvatarFallback className="bg-blue-50 text-blue-700">
            <Headset size={19} strokeWidth={2.1} />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold leading-5 tracking-tight text-slate-900">{t("supportTeamName")}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] font-medium text-slate-500">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-[3px] ring-emerald-50" />
            {t("onlineStatus")}
          </p>
        </div>
        {compact && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeChatAria")}
            className="shrink-0 rounded-[10px] p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <X size={18} />
          </button>
        )}
      </header>

      {ulanmagan && (
        <div className="shrink-0 border-b border-blue-100 bg-blue-50 px-4 py-2 text-center text-xs font-medium text-blue-800 sm:px-6 sm:py-2.5">
          {t("notConnectedBanner")}
        </div>
      )}

      {xatolik && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 sm:px-6 sm:py-2.5">
          <span>{xatolik}</span>
          <button type="button" onClick={xatolikniTozalash} aria-label={t("closeErrorAria")} className="shrink-0 rounded-md p-1 text-red-500 hover:bg-red-100 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1 bg-slate-50">
        <div className={`mx-auto w-full max-w-3xl ${compact ? "px-4 py-5" : "px-5 py-7 sm:px-8"}`}>
          {yuklanmoqda ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-sm font-medium text-slate-500">
              <LoaderCircle size={22} className="animate-spin text-blue-600" />
              {t("loading")}
            </div>
          ) : xabarlar.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <LifeBuoy size={26} />
              </span>
              <p className="text-sm font-semibold text-slate-900">{t("emptyTitle")}</p>
              <p className="max-w-xs text-xs leading-5 text-slate-500">{t("emptyText")}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {nextCursor && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    disabled={eskilarYuklanmoqda}
                    onClick={() => void eskiXabarlarniYuklash()}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-60"
                  >
                    {eskilarYuklanmoqda && <LoaderCircle size={13} className="animate-spin" />}
                    {eskilarYuklanmoqda ? t("loadingOlder") : t("loadOlder")}
                  </button>
                </div>
              )}
              {kunlarBoyicha.map((kun) => (
                <div key={kun.sana} className="space-y-4">
                  <div className="flex items-center gap-3 py-1">
                    <span className="h-px flex-1 bg-slate-200" />
                    <span className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {sanaSarlavhasi(kun.xabarlar[0][0].createdAt, t)}
                    </span>
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>
                  {kun.xabarlar.map((guruh, guruhIndex) => {
                    const own = guruh[0].direction === "OUT";
                    return (
                      <div key={guruhIndex} className={`flex items-end gap-2.5 ${own ? "justify-end" : ""}`}>
                        {!own && (
                          <Avatar size="default" className="!size-7 shrink-0 border border-blue-100 bg-blue-50 text-blue-700">
                            <AvatarImage src={guruh[0].senderAvatarUrl} alt="" />
                            <AvatarFallback className="bg-blue-50 text-blue-700">
                              <Headset size={14} />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`flex min-w-0 max-w-[82%] flex-col gap-1.5 ${own ? "items-end" : "items-start"} ${compact ? "max-w-[82%]" : "max-w-[75%]"}`}>
                          {!own && (
                            <span className="px-1 text-[11px] font-semibold text-slate-600">
                              {guruh[0].senderName?.trim() || t("defaultSenderName")}
                            </span>
                          )}
                          {guruh.map((xabar) => (
                            <div
                              key={xabar.id}
                              className={`min-w-0 max-w-full rounded-2xl px-3.5 py-2.5 shadow-sm ${
                                own
                                  ? "rounded-br-[5px] bg-blue-600 text-white shadow-[0_2px_8px_rgba(37,99,235,.14)]"
                                  : "rounded-bl-[5px] border border-slate-200 bg-white text-slate-800"
                              }`}
                            >
                              {xabar.text && (
                                <p className="whitespace-pre-wrap break-words text-[13px] font-medium leading-[1.55]">
                                  {xabar.text}
                                </p>
                              )}
                              {xabar.attachments && xabar.attachments.length > 0 && (
                                <div className={`flex flex-col gap-1.5 ${xabar.text ? "mt-2" : ""}`}>
                                  {xabar.attachments.map((ilova) => (
                                    <button
                                      key={ilova.id}
                                      type="button"
                                      onClick={() => void yuklabOlish(ilova)}
                                      disabled={yuklabOlinmoqda === ilova.id}
                                      className={`flex max-w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-medium transition disabled:opacity-60 ${
                                        own
                                          ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                      }`}
                                    >
                                      <FileText size={14} className="shrink-0" />
                                      <span className="max-w-[160px] truncate">{ilova.name}</span>
                                      {yuklabOlinmoqda === ilova.id ? (
                                        <LoaderCircle size={13} className="shrink-0 animate-spin" />
                                      ) : (
                                        <Download size={13} className="shrink-0" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                          <span className="px-1 text-[10px] font-medium text-slate-500">
                            {vaqtMatni(guruh.at(-1)!.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {oxirgiOutXabar?.status && (
                <p className="text-right text-[11px] font-medium text-slate-500">
                  {oxirgiOutXabar.status === "READ" ? (
                    <span className="inline-flex items-center gap-1 text-blue-600">
                      <CheckCheck size={13} /> {t(`status.${oxirgiOutXabar.status}`)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      {oxirgiOutXabar.status === "DELIVERED" ? <CheckCheck size={13} /> : <Check size={13} />}
                      {t(`status.${oxirgiOutXabar.status}`)}
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
          <div ref={oxirigaRef} />
        </div>
      </ScrollArea>

      <div className={`shrink-0 border-t border-slate-200 bg-white ${compact ? "p-3.5" : "p-4 sm:p-5"}`}>
        {tanlanganFayllar.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {tanlanganFayllar.map((fayl, index) => (
              <span
                key={`${fayl.name}-${index}`}
                className="flex items-center gap-2 rounded-[10px] border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-800"
              >
                <FileText size={13} className="shrink-0 text-blue-500" />
                <span className="max-w-[140px] truncate">{fayl.name}</span>
                <button
                  type="button"
                  onClick={() => faylniOlibTashlash(index)}
                  aria-label={t("removeAttachmentAria")}
                  className="shrink-0 rounded text-blue-500 hover:text-red-600"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-[16px] border border-slate-200 bg-slate-50 p-1.5 transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50">
          <input ref={faylInputRef} type="file" multiple onChange={fayllarTanlandi} className="hidden" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("attachAria")}
            onClick={() => faylInputRef.current?.click()}
            className="!size-9 shrink-0 rounded-[10px] border border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
          >
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
            className="min-h-9 max-h-28 min-w-0 flex-1 resize-none border-none bg-transparent px-1 py-2 text-[13px] font-medium leading-5 text-slate-900 shadow-none outline-none placeholder:text-slate-400 focus-visible:ring-0"
          />
          <Button
            type="button"
            size="icon"
            onClick={() => void yuborish()}
            disabled={(!matn.trim() && tanlanganFayllar.length === 0) || yuborilmoqda}
            aria-label={t("sendAria")}
            className="!size-9 shrink-0 rounded-[10px] border-none bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            {yuborilmoqda ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
