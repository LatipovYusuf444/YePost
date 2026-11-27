import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Bot, ChevronDown, LoaderCircle, RefreshCw, X } from "lucide-react";
import { crmApi, royxatniAjratish } from "@/api/crmApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { vaqtMatni } from "@/lib/hujjatSanasi";
import type { AgentAmali } from "@/types/crm";

const LIMIT = 30;

// Ma'lum vositalar (backend tool nomlari); noma'lumi o'z nomi bilan ko'rsatiladi.
const VOSITALAR = ["search_products", "check_stock", "get_price", "order_status", "create_order", "add_lead_note", "handoff"];

/** Kirish/natija obyektidan qisqa satr: oddiy qiymatlar "kalit: qiymat", ichma-ich obyekt/ro'yxat — soni bilan. */
function qisqaMatn(qiymat: unknown): string {
  if (qiymat === null || qiymat === undefined) return "";
  if (typeof qiymat !== "object") return String(qiymat);
  if (Array.isArray(qiymat)) return `[${qiymat.length}]`;
  return Object.entries(qiymat as Record<string, unknown>)
    .slice(0, 4)
    .map(([kalit, ichki]) => `${kalit}: ${ichki !== null && typeof ichki === "object" ? (Array.isArray(ichki) ? `[${ichki.length}]` : "{…}") : String(ichki)}`)
    .join(" · ");
}

/**
 * Agent shu suhbatda nima qilgani (GET /crm/chat/threads/:id/agent-calls): qidirdi, qoldiq/narx tekshirdi, qoralama ochdi, menejerga
 * o'tkazdi. Eng yangisi birinchi, kursor bilan eskilari. Xom kirish va natija har bir qatorda yig'ib qo'yilgan.
 */
export default function AgentAmallariPaneli({ suhbatId, suhbatNomi, onYopish }: { suhbatId: string; suhbatNomi: string; onYopish: () => void }) {
  const { t } = useTranslation("savdo_agenti");
  const [amallar, setAmallar] = useState<AgentAmali[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [holat, setHolat] = useState<"yuklanmoqda" | "tayyor" | "xato">("yuklanmoqda");
  const [xato, setXato] = useState("");
  const [eskilar, setEskilar] = useState(false);
  const joriy = useRef(suhbatId);
  joriy.current = suhbatId;

  const yuklash = useCallback(async () => {
    setHolat("yuklanmoqda");
    try {
      const javob = await crmApi.agentAmallari(suhbatId, { limit: LIMIT });
      if (joriy.current !== suhbatId) return;
      setAmallar(royxatniAjratish(javob));
      setNextCursor(Array.isArray(javob) ? null : (javob.nextCursor ?? null));
      setHolat("tayyor");
    } catch (error) {
      if (joriy.current !== suhbatId) return;
      setXato(getApiErrorMessage(error));
      setHolat("xato");
    }
  }, [suhbatId]);

  useEffect(() => {
    void yuklash();
  }, [yuklash]);

  useEffect(() => {
    const tugma = (event: KeyboardEvent) => {
      if (event.key === "Escape") onYopish();
    };
    document.addEventListener("keydown", tugma);
    return () => document.removeEventListener("keydown", tugma);
  }, [onYopish]);

  async function eskilarniYuklash() {
    if (!nextCursor || eskilar) return;
    setEskilar(true);
    try {
      const javob = await crmApi.agentAmallari(suhbatId, { cursor: nextCursor, limit: LIMIT });
      if (joriy.current !== suhbatId) return;
      const yangi = royxatniAjratish(javob);
      setAmallar((eski) => [...eski, ...yangi.filter((a) => !eski.some((b) => b.id === a.id))]);
      setNextCursor(Array.isArray(javob) ? null : (javob.nextCursor ?? null));
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setEskilar(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[99990] flex justify-end bg-slate-900/30 backdrop-blur-[2px]" onClick={(event) => event.target === event.currentTarget && onYopish()}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("agentRejim.calls.title")}
        data-agent-amallari
        className="flex h-full w-full max-w-[460px] flex-col overflow-hidden bg-white shadow-[-24px_0_60px_rgba(15,23,42,.18)]"
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Bot size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-slate-900">{t("agentRejim.calls.title")}</h2>
            <p className="truncate text-xs font-semibold text-slate-500">{suhbatNomi}</p>
          </div>
          <button type="button" onClick={() => void yuklash()} aria-label={t("suhbat.refresh")} title={t("suhbat.refresh")} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
            <RefreshCw size={16} className={holat === "yuklanmoqda" ? "animate-spin" : ""} />
          </button>
          <button type="button" onClick={onYopish} aria-label={t("lid.card.close")} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold leading-4 text-slate-500">{t("agentRejim.calls.hint")}</p>
          {holat === "yuklanmoqda" && amallar.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-sm font-semibold text-slate-500">
              <LoaderCircle size={18} className="animate-spin text-blue-600" />
              {t("agentRejim.calls.loading")}
            </div>
          ) : holat === "xato" ? (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{xato}</p>
          ) : amallar.length === 0 ? (
            <p className="py-10 text-center text-sm font-semibold text-slate-400">{t("agentRejim.calls.empty")}</p>
          ) : (
            <ol className="space-y-2">
              {amallar.map((amal) => {
                const nom = VOSITALAR.includes(amal.tool) ? t(`agentRejim.tools.${amal.tool}`) : amal.tool;
                const kirish = qisqaMatn(amal.input);
                return (
                  <li key={amal.id} data-agent-amal={amal.tool} className={`rounded-2xl border px-3 py-2.5 ${amal.error ? "border-red-100 bg-red-50/40" : "border-slate-100 bg-white"}`}>
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{nom}</span>
                      {typeof amal.durationMs === "number" && <span className="shrink-0 text-[10px] font-semibold text-slate-400">{amal.durationMs} ms</span>}
                      <span className="shrink-0 text-[11px] font-semibold text-slate-400">{vaqtMatni(amal.createdAt)}</span>
                    </div>
                    {kirish && <p className="mt-1 break-words text-xs font-medium text-slate-600">{kirish}</p>}
                    {amal.error && (
                      <p className="mt-1 flex items-start gap-1 text-xs font-bold text-red-600">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                        <span className="break-all">{amal.error}</span>
                      </p>
                    )}
                    <details className="mt-1.5 group">
                      <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] font-bold text-blue-700">
                        <ChevronDown size={12} className="transition group-open:rotate-180" />
                        {t("agentRejim.calls.details")}
                      </summary>
                      <pre className="mt-1.5 max-h-60 overflow-auto rounded-lg bg-slate-900 p-2 text-[11px] leading-4 text-slate-100">
                        {JSON.stringify({ input: amal.input ?? null, result: amal.result ?? null }, null, 2)}
                      </pre>
                    </details>
                  </li>
                );
              })}
            </ol>
          )}
          {nextCursor && holat === "tayyor" && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                disabled={eskilar}
                onClick={() => void eskilarniYuklash()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
              >
                {eskilar && <LoaderCircle size={13} className="animate-spin" />}
                {t("agentRejim.calls.loadMore")}
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}
