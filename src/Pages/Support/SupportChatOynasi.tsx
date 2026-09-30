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
  UserRound,
  X,
} from "lucide-react";
import { useSupportStore } from "@/store/supportStore";
import { useAuthProfileStore } from "@/store/authProfileStore";
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

// OUT (biznes -> YePost) xabar pufakchalari va launcher/avatar uchun umumiy
// gradient — ilovaning asosiy to'q sariq rangidan ataylab farqlanadi, chunki
// bu suhbat vidjeti alohida, tanish "chat" brendi sifatida ko'zga tashlanishi kerak.
export const QOLLAB_QUVVATLASH_GRADIENT = "bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600";

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
    eskiXabarlarniYuklash,
    xabarYuborish,
    xatolikniTozalash,
  } = useSupportStore();
  const profil = useAuthProfileStore((state) => state.profil);
  const [matn, setMatn] = useState("");
  const [tanlanganFayllar, setTanlanganFayllar] = useState<File[]>([]);
  const [yuklabOlinmoqda, setYuklabOlinmoqda] = useState<string | null>(null);
  const oxirigaRef = useRef<HTMLDivElement | null>(null);
  const faylInputRef = useRef<HTMLInputElement | null>(null);
  const birinchiYuklanish = useRef(true);

  useEffect(() => {
    void xabarlarniYuklash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!birinchiYuklanish.current) return;
    if (xabarlar.length === 0) return;
    birinchiYuklanish.current = false;
    oxirigaRef.current?.scrollIntoView({ block: "end" });
  }, [xabarlar.length]);

  useEffect(() => {
    if (birinchiYuklanish.current) return;
    oxirigaRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [xabarlar.length]);

  const kunlarBoyicha = useMemo(() => guruhlash(xabarlar), [xabarlar]);
  const oxirgiOutXabar = [...xabarlar].reverse().find((item) => item.direction === "OUT");

  const ism = profil?.fullName?.trim() || profil?.username || "";
  const bosHarf = ism ? ism.charAt(0).toUpperCase() : "";

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
      className={`flex flex-col overflow-hidden bg-black ${
        compact ? "h-full" : "h-[calc(100vh-140px)] min-h-[560px] rounded-[28px] border border-white/10 shadow-sm"
      }`}
    >
      <header className={`flex shrink-0 items-center gap-3 border-b border-white/10 bg-white/3 ${compact ? "px-4 py-3.5" : "px-6 py-4"}`}>
        <Avatar size={compact ? "sm" : "lg"} className={`${QOLLAB_QUVVATLASH_GRADIENT} text-white`}>
          <AvatarFallback className={`${QOLLAB_QUVVATLASH_GRADIENT} text-white`}>
            <Headset size={compact ? 14 : 20} />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className={`font-black text-white ${compact ? "text-[12px] leading-tight" : "truncate text-sm"}`}>{t("supportTeamName")}</h1>
          <p className="flex items-center gap-1.5 truncate text-[10px] font-semibold text-slate-400">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            {t("onlineStatus")}
          </p>
        </div>
        {compact && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeErrorAria")}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        )}
      </header>

      {ulanmagan && (
        <div className="shrink-0 border-b border-blue-500/20 bg-blue-500/10 px-4 py-2 text-center text-[11px] font-bold text-blue-300 sm:px-6 sm:py-2.5 sm:text-xs">
          {t("notConnectedBanner")}
        </div>
      )}

      {xatolik && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 sm:px-6 sm:py-2.5 sm:text-sm">
          <span>{xatolik}</span>
          <button type="button" onClick={xatolikniTozalash} aria-label={t("closeErrorAria")} className="shrink-0 text-red-400 hover:text-red-200">
            <X size={16} />
          </button>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className={compact ? "px-3.5 py-4" : "px-5 py-6 sm:px-8"}>
          {yuklanmoqda ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 text-xs font-bold text-slate-400">
              <LoaderCircle size={20} className="animate-spin text-indigo-400" />
              {t("loading")}
            </div>
          ) : xabarlar.length === 0 ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10 text-slate-300">
                <LifeBuoy size={26} />
              </span>
              <p className="text-xs font-black text-white">{t("emptyTitle")}</p>
              <p className="max-w-xs text-xs font-medium text-slate-400">{t("emptyText")}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {nextCursor && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    disabled={eskilarYuklanmoqda}
                    onClick={() => void eskiXabarlarniYuklash()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 transition hover:text-indigo-300 disabled:opacity-60"
                  >
                    {eskilarYuklanmoqda && <LoaderCircle size={13} className="animate-spin" />}
                    {eskilarYuklanmoqda ? t("loadingOlder") : t("loadOlder")}
                  </button>
                </div>
              )}
              {kunlarBoyicha.map((kun) => (
                <div key={kun.sana} className="space-y-3.5">
                  <div className="flex items-center justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {sanaSarlavhasi(kun.xabarlar[0][0].createdAt, t)}
                    </span>
                  </div>
                  {kun.xabarlar.map((guruh, guruhIndex) => {
                    const own = guruh[0].direction === "OUT";
                    return (
                      <div key={guruhIndex} className={`flex items-end gap-2 ${own ? "flex-row-reverse" : ""}`}>
                        <Avatar
                          size={compact ? "sm" : "default"}
                          className={own ? `${QOLLAB_QUVVATLASH_GRADIENT} text-white` : "bg-white/10 text-slate-300"}
                        >
                          {own ? (
                            <AvatarFallback className={`${QOLLAB_QUVVATLASH_GRADIENT} text-white`}>
                              {bosHarf || <UserRound size={14} />}
                            </AvatarFallback>
                          ) : (
                            <>
                              <AvatarImage src={guruh[0].senderAvatarUrl} alt="" />
                              <AvatarFallback className="bg-white/10 text-slate-300">
                                <Headset size={14} />
                              </AvatarFallback>
                            </>
                          )}
                        </Avatar>
                        <div className={`flex min-w-0 max-w-[80%] flex-col gap-1 ${own ? "items-end" : "items-start"} ${compact ? "max-w-[78%]" : "max-w-[75%]"}`}>
                          {!own && (
                            <span className="px-1 text-[10px] font-bold text-indigo-300">
                              {guruh[0].senderName?.trim() || t("defaultSenderName")}
                            </span>
                          )}
                          {guruh.map((xabar) => (
                            <div key={xabar.id} className="flex flex-col gap-1.5">
                              {xabar.text && (
                                <span className="whitespace-pre-wrap break-words text-[13px] font-medium leading-5 text-white">
                                  {xabar.text}
                                </span>
                              )}
                              {xabar.attachments && xabar.attachments.length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                  {xabar.attachments.map((ilova) => (
                                    <button
                                      key={ilova.id}
                                      type="button"
                                      onClick={() => void yuklabOlish(ilova)}
                                      disabled={yuklabOlinmoqda === ilova.id}
                                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-60 ${
                                        own
                                          ? "border-indigo-400/30 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25"
                                          : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
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
                          <span className="px-1 text-[10px] font-semibold text-slate-500">
                            {vaqtMatni(guruh.at(-1)!.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {oxirgiOutXabar?.status && (
                <p className="pr-11 text-right text-[11px] font-bold text-slate-500">
                  {oxirgiOutXabar.status === "READ" ? (
                    <span className="inline-flex items-center gap-1 text-indigo-400">
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

      <div className={`shrink-0 border-t border-white/10 bg-black ${compact ? "p-3" : "p-4 sm:p-5"}`}>
        {tanlanganFayllar.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {tanlanganFayllar.map((fayl, index) => (
              <span
                key={`${fayl.name}-${index}`}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200"
              >
                <FileText size={13} className="shrink-0 text-slate-400" />
                <span className="max-w-[140px] truncate">{fayl.name}</span>
                <button
                  type="button"
                  onClick={() => faylniOlibTashlash(index)}
                  aria-label={t("removeAttachmentAria")}
                  className="shrink-0 text-slate-400 hover:text-red-400"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 transition focus-within:border-indigo-400/50 focus-within:bg-white/10 focus-within:ring-4 focus-within:ring-indigo-500/20">
          <input ref={faylInputRef} type="file" multiple onChange={fayllarTanlandi} className="hidden" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("attachAria")}
            onClick={() => faylInputRef.current?.click()}
            className="shrink-0 text-slate-300 hover:bg-white/10 hover:text-white"
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
            className="min-h-9 max-h-32 min-w-0 flex-1 resize-none border-none bg-transparent px-2 py-1.5 text-sm font-medium text-white shadow-none outline-none placeholder:text-slate-500 focus-visible:ring-0"
          />
          <Button
            type="button"
            size="icon"
            onClick={() => void yuborish()}
            disabled={(!matn.trim() && tanlanganFayllar.length === 0) || yuborilmoqda}
            aria-label={t("sendAria")}
            className={`shrink-0 rounded-xl border-none text-white hover:opacity-90 ${QOLLAB_QUVVATLASH_GRADIENT}`}
          >
            {yuborilmoqda ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
