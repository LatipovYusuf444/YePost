import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, CheckCheck, Headset, LifeBuoy, Send, UserRound, X } from "lucide-react";
import { useSupportStore } from "@/store/supportStore";
import { useAuthProfileStore } from "@/store/authProfileStore";
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

function sanaSarlavhasiKaliti(iso: string) {
  const sana = new Date(iso);
  if (Number.isNaN(sana.getTime())) return iso;
  return String(kunBoshi(sana));
}

export default function QollabQuvvatlash() {
  const { t } = useTranslation("support");
  const { xabarlar, yuklanmoqda, yuborilmoqda, xatolik, ulanmagan, xabarlarniYuklash, xabarYuborish, xatolikniTozalash } =
    useSupportStore();
  const profil = useAuthProfileStore((state) => state.profil);
  const [matn, setMatn] = useState("");
  const oxirigaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void xabarlarniYuklash();
  }, [xabarlarniYuklash]);

  useEffect(() => {
    oxirigaRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [xabarlar.length]);

  const kunlarBoyicha = useMemo(() => guruhlash(xabarlar), [xabarlar]);
  const oxirgiOutXabar = [...xabarlar].reverse().find((item) => item.direction === "OUT");

  const ism = profil?.fullName?.trim() || profil?.username || "";
  const bosHarf = ism ? ism.charAt(0).toUpperCase() : "";

  async function yuborish() {
    if (!matn.trim() || yuborilmoqda) return;
    const yuborilganMatn = matn;
    setMatn("");
    const ok = await xabarYuborish(yuborilganMatn);
    if (!ok) setMatn(yuborilganMatn);
  }

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[560px] flex-col overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
      <header className="flex shrink-0 items-center gap-3 border-b border-gray-100 bg-gray-50/60 px-6 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Headset size={20} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-base font-black text-slate-900">{t("supportTeamName")}</h1>
          <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-slate-400">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            {t("onlineStatus")}
          </p>
        </div>
      </header>

      {ulanmagan && (
        <div className="shrink-0 border-b border-blue-100 bg-blue-50/70 px-6 py-2.5 text-center text-xs font-bold text-blue-700">
          {t("notConnectedBanner")}
        </div>
      )}

      {xatolik && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-6 py-2.5 text-sm font-bold text-red-600">
          <span>{xatolik}</span>
          <button type="button" onClick={xatolikniTozalash} aria-label={t("closeErrorAria")} className="shrink-0 text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
        {yuklanmoqda ? (
          <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">{t("loading")}</div>
        ) : xabarlar.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
              <LifeBuoy size={28} />
            </span>
            <p className="text-sm font-black text-slate-700">{t("emptyTitle")}</p>
            <p className="max-w-xs text-sm font-medium text-slate-400">{t("emptyText")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {kunlarBoyicha.map((kun) => (
              <div key={kun.sana} className="space-y-4">
                <div className="flex items-center justify-center">
                  <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {sanaSarlavhasi(kun.xabarlar[0][0].createdAt, t)}
                  </span>
                </div>
                {kun.xabarlar.map((guruh, guruhIndex) => {
                  const own = guruh[0].direction === "OUT";
                  return (
                    <div key={guruhIndex} className={`flex items-end gap-2.5 ${own ? "flex-row-reverse" : ""}`}>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold ${
                          own ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {own ? (
                          bosHarf || <UserRound size={15} />
                        ) : guruh[0].senderAvatarUrl ? (
                          <img src={guruh[0].senderAvatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Headset size={15} />
                        )}
                      </span>
                      <div className={`flex min-w-0 max-w-[75%] flex-col gap-1 ${own ? "items-end" : "items-start"}`}>
                        {guruh.map((xabar) => (
                          <span
                            key={xabar.id}
                            className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm font-medium leading-6 shadow-sm ${
                              own
                                ? "rounded-br-md bg-primary text-primary-foreground"
                                : "rounded-bl-md bg-muted text-foreground"
                            }`}
                          >
                            {xabar.text}
                          </span>
                        ))}
                        <span className="px-1 text-[11px] font-semibold text-slate-400">
                          {vaqtMatni(guruh.at(-1)!.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {oxirgiOutXabar?.status && (
              <p className="pr-11 text-right text-[11px] font-bold text-slate-400">
                {oxirgiOutXabar.status === "READ" ? (
                  <span className="inline-flex items-center gap-1 text-primary">
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

      <div className="shrink-0 border-t border-gray-100 bg-white p-4 sm:p-5">
        <div className="flex items-end gap-2.5 rounded-2xl border border-gray-200 bg-gray-50/70 p-2 transition focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
          <textarea
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
            className="min-h-9 max-h-32 min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => void yuborish()}
            disabled={!matn.trim() || yuborilmoqda}
            aria-label={t("sendAria")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
