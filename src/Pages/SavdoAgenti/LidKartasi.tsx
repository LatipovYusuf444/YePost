import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Bot, History, LoaderCircle, MessagesSquare, StickyNote, UserRound, X } from "lucide-react";
import AppSelect from "@/Components/ui/AppSelect";
import { lidlarApi } from "@/api/crmApi";
import { vaqtMatni } from "@/lib/hujjatSanasi";
import { bosqichSorovi, lidYopiqmi, suhbatNomi } from "@/lib/savdoAgenti";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { LID_BOSQICHLARI, LID_YOQOTISH_SABABLARI, type Lid, type LidKartochkasi } from "@/types/crm";
import KanalBelgisi from "./KanalBelgisi";
import { bosqichRangi, davomiylikMatni, nisbiyVaqtMatni } from "./lidYordamchilari";

/** Mas'ul tayinlash ro'yxatidagi xodim (ADMIN/DIREKTOR uchun /accounts/users dan). */
export type LidXodimi = { id: string; nom: string };

// Lid kartasi (o'ngdan chiquvchi panel): bosqich, yo'qotish sababi, mas'ul, izohlar va bosqichlar tarixi.
export default function LidKartasi({
  lidId,
  xodimlar = [],
  onYopish,
  onYangilandi,
  onSuhbat,
}: {
  lidId: string;
  xodimlar?: LidXodimi[];
  onYopish: () => void;
  onYangilandi: (lid: Lid) => void;
  // Suhbat oynasi ichidan ochilganda: "Suhbatni ochish" boshqa sahifaga o'tmaydi, panelni yopadi.
  onSuhbat?: () => void;
}) {
  const { t } = useTranslation("savdo_agenti");
  const navigate = useNavigate();
  const menId = useAuthProfileStore((state) => state.profil?.id ?? null);

  const [lid, setLid] = useState<LidKartochkasi | null>(null);
  const [xato, setXato] = useState(false);
  const [bosqich, setBosqich] = useState("");
  const [sabab, setSabab] = useState("");
  const [sababXatosi, setSababXatosi] = useState(false);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [izoh, setIzoh] = useState("");
  const [izohQoshilmoqda, setIzohQoshilmoqda] = useState(false);

  const yuklash = useCallback(async () => {
    try {
      const karta = await lidlarApi.kartochka(lidId);
      setLid(karta);
      setBosqich(String(karta.stage ?? ""));
      setSabab(String(karta.lostReason ?? ""));
      setSababXatosi(false);
      setXato(false);
    } catch {
      setXato(true);
    }
  }, [lidId]);

  useEffect(() => {
    setLid(null);
    setXato(false);
    void yuklash();
  }, [yuklash]);

  useEffect(() => {
    function tugma(event: KeyboardEvent) {
      if (event.key === "Escape") onYopish();
    }
    document.addEventListener("keydown", tugma);
    return () => document.removeEventListener("keydown", tugma);
  }, [onYopish]);

  async function yangilash(malumot: { stage?: string; lostReason?: string; ownerId?: string | null }) {
    if (!lid || saqlanmoqda) return;
    setSaqlanmoqda(true);
    try {
      const yangi = await lidlarApi.yangilash(lid.id, malumot);
      if (yangi && typeof yangi === "object") onYangilandi(yangi);
      await yuklash();
    } catch {
      // Xato matni (masalan, lead_changed / lead_already_open) global toastda chiqadi.
    } finally {
      setSaqlanmoqda(false);
    }
  }

  function bosqichniSaqlash() {
    if (!lid) return;
    const joriy = String(lid.stage);
    if (bosqich === "LOST" && !sabab) {
      setSababXatosi(true);
      return;
    }
    const sorov =
      bosqichSorovi(joriy, bosqich, sabab) ??
      (joriy === "LOST" && bosqich === "LOST" && sabab && sabab !== lid.lostReason ? { lostReason: sabab } : null);
    if (sorov) void yangilash(sorov);
  }

  async function izohQoshish() {
    const matn = izoh.trim();
    if (!lid || !matn || izohQoshilmoqda) return;
    setIzohQoshilmoqda(true);
    try {
      const yangi = await lidlarApi.izohQoshish(lid.id, matn);
      setIzoh("");
      if (yangi && typeof yangi === "object") {
        setLid((joriy) => (joriy ? { ...joriy, notes: [...(joriy.notes ?? []), yangi] } : joriy));
      } else {
        await yuklash();
      }
    } catch {
      // Global toast.
    } finally {
      setIzohQoshilmoqda(false);
    }
  }

  const ozgargan =
    lid !== null && (bosqich !== String(lid.stage) || (bosqich === "LOST" && Boolean(sabab) && sabab !== (lid.lostReason ?? "")));
  const nom = lid?.thread ? suhbatNomi(lid.thread) : lid ? `#${lid.threadId.slice(0, 8)}` : "";

  return createPortal(
    <div className="fixed inset-0 z-[99990] flex justify-end bg-slate-900/30 backdrop-blur-[2px]" onClick={(event) => event.target === event.currentTarget && onYopish()}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("lid.card.title")}
        className="flex h-full w-full max-w-[460px] flex-col overflow-hidden bg-white shadow-[-24px_0_60px_rgba(15,23,42,.18)]"
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{t("lid.card.title")}</p>
            <h2 className="mt-0.5 truncate text-lg font-black text-slate-900">{nom || "…"}</h2>
            {lid && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <KanalBelgisi kanal={lid.source} />
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${bosqichRangi(lid.stage)}`}>
                  {t(`lid.stage.${lid.stage}`, { defaultValue: lid.stage })}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onYopish}
            aria-label={t("lid.card.close")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </header>

        {!lid ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm font-semibold text-slate-400">
            {xato ? (
              <button type="button" onClick={() => void yuklash()} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50">
                {t("suhbat.refresh")}
              </button>
            ) : (
              <>
                <LoaderCircle size={18} className="animate-spin text-blue-600" />
                {t("lid.card.loading")}
              </>
            )}
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <button
              type="button"
              onClick={() => (onSuhbat ? onSuhbat() : navigate(`/savdo-agenti/suhbatlar?thread=${encodeURIComponent(lid.threadId)}`))}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
            >
              <MessagesSquare size={16} />
              {t("lid.card.openChat")}
            </button>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Malumot sarlavha={t("lid.card.created")} qiymat={vaqtMatni(lid.createdAt)} />
              <Malumot sarlavha={t("lid.card.stageSince")} qiymat={vaqtMatni(lid.stageEnteredAt)} />
              <Malumot sarlavha={t("lid.col.firstReply")} qiymat={davomiylikMatni(lid.firstReplySeconds, t) || t("lid.noReply")} />
              <Malumot sarlavha={t("lid.col.lastActivity")} qiymat={nisbiyVaqtMatni(lid.lastActivityAt, t)} izoh={vaqtMatni(lid.lastActivityAt)} />
              {lid.closedAt && <Malumot sarlavha={t("lid.card.closedAt")} qiymat={vaqtMatni(lid.closedAt)} />}
            </dl>

            {/* Mas'ul */}
            <section className="rounded-2xl border border-slate-200 p-3">
              <p className="text-xs font-bold text-slate-500">{t("lid.card.owner")}</p>
              {xodimlar.length > 0 && (
                <div className="mt-1.5">
                  <AppSelect
                    value={lid.ownerId ?? ""}
                    disabled={saqlanmoqda}
                    onChange={(event) => {
                      const yangi = event.target.value || null;
                      if (yangi !== (lid.ownerId ?? null)) void yangilash({ ownerId: yangi });
                    }}
                    aria-label={t("lid.card2.assign")}
                    className="h-10 w-full rounded-xl"
                  >
                    <option value="">{t("lid.card2.noOwnerOption")}</option>
                    {lid.ownerId && !xodimlar.some((x) => x.id === lid.ownerId) && (
                      <option value={lid.ownerId}>{lid.owner?.fullName || `#${lid.ownerId.slice(0, 8)}`}</option>
                    )}
                    {xodimlar.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nom}
                      </option>
                    ))}
                  </AppSelect>
                </div>
              )}
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                {xodimlar.length === 0 ? (
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-800">
                    <UserRound size={15} className="text-slate-400" />
                    {lid.owner?.fullName || (lid.ownerId ? `#${lid.ownerId.slice(0, 8)}` : t("lid.noOwner"))}
                  </span>
                ) : (
                  <span />
                )}
                <div className="flex gap-1.5">
                  {menId && lid.ownerId !== menId && (
                    <button
                      type="button"
                      disabled={saqlanmoqda}
                      onClick={() => void yangilash({ ownerId: menId })}
                      className="h-8 rounded-lg bg-blue-50 px-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                    >
                      {t("lid.card.assignMe")}
                    </button>
                  )}
                  {lid.ownerId && (
                    <button
                      type="button"
                      disabled={saqlanmoqda}
                      onClick={() => void yangilash({ ownerId: null })}
                      className="h-8 rounded-lg border border-slate-200 px-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {t("lid.card.removeOwner")}
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Bosqich */}
            <section className="space-y-2.5">
              <p className="text-xs font-bold text-slate-500">{t("lid.card.changeStage")}</p>
              {lidYopiqmi(lid) && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-700">{t("lid.card.closedNote")}</p>}
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {LID_BOSQICHLARI.map((qiymat) => {
                  const tanlangan = bosqich === qiymat;
                  return (
                    <button
                      key={qiymat}
                      type="button"
                      onClick={() => {
                        setBosqich(qiymat);
                        setSababXatosi(false);
                      }}
                      aria-pressed={tanlangan}
                      className={`rounded-xl px-2 py-2 text-xs font-bold ring-1 transition ${
                        tanlangan ? `${bosqichRangi(qiymat)} ring-2` : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {t(`lid.stage.${qiymat}`)}
                    </button>
                  );
                })}
              </div>
              {bosqich === "LOST" && (
                <div data-maydon-xato={sababXatosi ? "true" : undefined}>
                  <AppSelect
                    value={sabab}
                    onChange={(event) => {
                      setSabab(event.target.value);
                      setSababXatosi(false);
                    }}
                    aria-label={t("lid.card.lostReason")}
                    className={`h-10 w-full rounded-xl ${sababXatosi ? "!border-red-400 ring-2 ring-red-100" : ""}`}
                  >
                    <option value="">{t("lid.card.lostReasonPick")}</option>
                    {LID_YOQOTISH_SABABLARI.map((qiymat) => (
                      <option key={qiymat} value={qiymat}>
                        {t(`lid.reason.${qiymat}`)}
                      </option>
                    ))}
                  </AppSelect>
                  {sababXatosi && <p className="mt-1 px-1 text-xs font-bold text-red-600">{t("lid.card.lostReasonRequired")}</p>}
                </div>
              )}
              <button
                type="button"
                disabled={!ozgargan || saqlanmoqda}
                onClick={bosqichniSaqlash}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-40"
              >
                {saqlanmoqda && <LoaderCircle size={15} className="animate-spin" />}
                {saqlanmoqda ? t("lid.card.saving") : t("lid.card.save")}
              </button>
            </section>

            {/* Izohlar */}
            <section className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <StickyNote size={14} />
                {t("lid.card.notes")}
              </p>
              {(lid.notes ?? []).length === 0 ? (
                <p className="text-xs font-medium text-slate-400">{t("lid.card.noNotes")}</p>
              ) : (
                <ul className="space-y-2">
                  {(lid.notes ?? []).map((yozuv) => (
                    <li key={yozuv.id} className={`rounded-xl px-3 py-2 ${yozuv.author === "AGENT" ? "bg-violet-50" : "bg-slate-50"}`}>
                      <p className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          {yozuv.author === "AGENT" ? <Bot size={12} /> : <UserRound size={12} />}
                          {t(`lid.actor.${yozuv.author}`, { defaultValue: yozuv.author })}
                        </span>
                        <span className="font-semibold text-slate-400">{vaqtMatni(yozuv.createdAt)}</span>
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{yozuv.text}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={izoh}
                  onChange={(event) => setIzoh(event.target.value)}
                  rows={2}
                  placeholder={t("lid.card.notePlaceholder")}
                  className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
                <button
                  type="button"
                  disabled={!izoh.trim() || izohQoshilmoqda}
                  onClick={() => void izohQoshish()}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-40"
                >
                  {izohQoshilmoqda && <LoaderCircle size={13} className="animate-spin" />}
                  {t("lid.card.addNote")}
                </button>
              </div>
            </section>

            {/* Tarix */}
            <section className="space-y-2 pb-2">
              <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <History size={14} />
                {t("lid.card.history")}
              </p>
              {(lid.events ?? []).length === 0 ? (
                <p className="text-xs font-medium text-slate-400">{t("lid.card.noHistory")}</p>
              ) : (
                <ol className="space-y-1.5 border-l-2 border-slate-100 pl-3">
                  {[...(lid.events ?? [])].reverse().map((hodisa) => (
                    <li key={hodisa.id} className="text-xs">
                      <p className="flex flex-wrap items-center gap-1 font-bold text-slate-700">
                        {hodisa.fromStage ? (
                          <>
                            <span>{t(`lid.stage.${hodisa.fromStage}`, { defaultValue: hodisa.fromStage })}</span>
                            <ArrowRight size={12} className="text-slate-400" />
                          </>
                        ) : (
                          <span className="text-slate-500">{t("lid.card.opened")} ·</span>
                        )}
                        <span>{t(`lid.stage.${hodisa.toStage}`, { defaultValue: hodisa.toStage })}</span>
                      </p>
                      <p className="font-medium text-slate-400">
                        {t(`lid.actor.${hodisa.actor}`, { defaultValue: hodisa.actor })} · {vaqtMatni(hodisa.createdAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>,
    document.body
  );
}

function Malumot({ sarlavha, qiymat, izoh }: { sarlavha: string; qiymat: string; izoh?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2" title={izoh}>
      <dt className="text-[11px] font-bold text-slate-400">{sarlavha}</dt>
      <dd className="mt-0.5 truncate font-bold text-slate-800">{qiymat || "—"}</dd>
    </div>
  );
}
