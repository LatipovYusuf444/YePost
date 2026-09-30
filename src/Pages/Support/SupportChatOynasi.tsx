import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Headset,
  LifeBuoy,
  LoaderCircle,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import { useSupportStore } from "@/store/supportStore";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Textarea } from "@/Components/ui/textarea";
import { Button } from "@/Components/ui/button";
import { KunlarRoyxati } from "./SupportXabarlari";
import { guruhlash } from "./supportYordamchilar";

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

  function fayllarTanlandi(event: React.ChangeEvent<HTMLInputElement>) {
    const tanlangan = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (tanlangan.length) setTanlanganFayllar((joriy) => [...joriy, ...tanlangan]);
  }

  function faylniOlibTashlash(index: number) {
    setTanlanganFayllar((joriy) => joriy.filter((_, i) => i !== index));
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
        compact ? "h-full" : "h-[calc(100vh-140px)] min-h-[560px] rounded-[28px] border border-blue-100 shadow-[0_24px_70px_rgba(37,99,235,.12)]"
      }`}
    >
      <header
        className={`relative flex shrink-0 items-center gap-3.5 overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-white ${
          compact ? "px-4 py-3.5" : "px-7 py-5"
        }`}
      >
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/10" />
        <span aria-hidden className="pointer-events-none absolute -bottom-20 right-32 h-40 w-40 rounded-full bg-white/5" />
        <span className={`relative flex shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur ${compact ? "h-10 w-10" : "h-12 w-12"}`}>
          <Headset size={compact ? 19 : 23} strokeWidth={2.1} />
        </span>
        <div className="relative min-w-0 flex-1">
          <h2 className={`truncate font-bold leading-6 tracking-tight ${compact ? "text-[15px]" : "text-lg"}`}>{t("supportTeamName")}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-medium text-white/85">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-300 ring-[3px] ring-emerald-300/30" />
            {t("onlineStatus")}
          </p>
        </div>
        {compact && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeChatAria")}
            className="relative shrink-0 rounded-[10px] p-2 text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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

      <ScrollArea className="min-h-0 flex-1 bg-gradient-to-b from-slate-50 via-white to-blue-50/50">
        <div className={`mx-auto w-full max-w-3xl ${compact ? "px-4 py-5" : "px-5 py-7 sm:px-8"}`}>
          {yuklanmoqda ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-sm font-medium text-slate-500">
              <LoaderCircle size={22} className="animate-spin text-blue-600" />
              {t("loading")}
            </div>
          ) : xabarlar.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-blue-50 to-sky-100 text-blue-600 shadow-inner ring-1 ring-blue-100">
                <LifeBuoy size={36} />
              </span>
              <p className="text-base font-bold text-slate-900">{t("emptyTitle")}</p>
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
              <KunlarRoyxati kunlar={kunlarBoyicha} compact={compact} t={t} />
            </div>
          )}
          <div ref={oxirigaRef} />
        </div>
      </ScrollArea>

      <div className={`shrink-0 border-t border-slate-100 bg-white ${compact ? "p-3.5" : "px-5 py-4 sm:px-8 sm:py-5"}`}>
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
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-[26px] border border-slate-200 bg-slate-50 p-2 shadow-sm transition focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-[0_8px_28px_rgba(37,99,235,.12)] focus-within:ring-4 focus-within:ring-blue-50">
          <input ref={faylInputRef} type="file" multiple onChange={fayllarTanlandi} className="hidden" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("attachAria")}
            onClick={() => faylInputRef.current?.click()}
            className="!size-10 shrink-0 rounded-full text-slate-500 hover:bg-blue-50 hover:text-blue-600"
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
            className="min-h-10 max-h-32 min-w-0 flex-1 resize-none border-none bg-transparent px-1 py-2.5 text-sm font-medium leading-5 text-slate-900 shadow-none outline-none placeholder:text-slate-400 focus-visible:ring-0"
          />
          <Button
            type="button"
            size="icon"
            onClick={() => void yuborish()}
            disabled={(!matn.trim() && tanlanganFayllar.length === 0) || yuborilmoqda}
            aria-label={t("sendAria")}
            className="!size-10 shrink-0 rounded-full border-none bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-md shadow-blue-200 transition hover:scale-105 hover:from-blue-700 hover:to-sky-600 disabled:scale-100 disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            {yuborilmoqda ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
