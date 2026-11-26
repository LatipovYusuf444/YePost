import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { Clock3, GripVertical, LoaderCircle, UserRound } from "lucide-react";
import { lidlarApi, type LidFiltri } from "@/api/crmApi";
import { vaqtMatni } from "@/lib/hujjatSanasi";
import { suhbatNomi } from "@/lib/savdoAgenti";
import { cn } from "@/lib/utils";
import { LID_BOSQICHLARI, type Lid, type LidBosqichi } from "@/types/crm";
import KanalBelgisi from "./KanalBelgisi";
import YoqotishSababiOynasi from "./YoqotishSababiOynasi";
import { BOSQICH_NUQTALARI, nisbiyVaqtMatni } from "./lidYordamchilari";

// Har ustunga backend bir so'rovda ko'pi bilan 100 ta beradi; kanbanda 50 tasi ko'rsatiladi, qolgani jadvalda.
const USTUN_HAJMI = 50;

type Ustun = { items: Lid[]; total: number };
type Ustunlar = Record<string, Ustun>;
type Sudrash = { lid: Lid; dan: string; x: number; y: number; faol: boolean; pointerId: number; dx: number; dy: number; kenglik: number };

function lidNomi(lid: Lid) {
  return lid.thread ? suhbatNomi(lid.thread) : `#${lid.threadId.slice(0, 8)}`;
}

/**
 * Lidlar kanbani: 6 ustun (Yangi · Qiziqdi · Buyurtma · Qayta bog'lanish · Sotildi · Yo'qotildi). Kartochka sudrab boshqa ustunga
 * qo'yiladi (sichqonchada butun kartochka, barmoqda ⋮⋮ tutqich), "Yo'qotildi"ga tashlansa sabab so'raladi. Bosilsa lid paneli ochiladi.
 */
export default function LidlarKanban({
  filtr,
  yangilashKaliti,
  ochiqLidId,
  onOchish,
  onOzgardi,
  onKoproq,
}: {
  filtr: Omit<LidFiltri, "stage" | "page" | "pageSize">;
  yangilashKaliti: number;
  ochiqLidId: string | null;
  onOchish: (id: string) => void;
  onOzgardi: () => void;
  onKoproq: (stage: string) => void;
}) {
  const { t } = useTranslation("savdo_agenti");
  const [ustunlar, setUstunlar] = useState<Ustunlar | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [sudralayotgan, setSudralayotgan] = useState<{ lid: Lid; x: number; y: number; dx: number; dy: number; kenglik: number } | null>(null);
  const [nishonUstun, setNishonUstun] = useState<string | null>(null);
  const [sababSorovi, setSababSorovi] = useState<{ lid: Lid; dan: string } | null>(null);
  const sudrash = useRef<Sudrash | null>(null);
  const sudraldi = useRef(false);
  const doskaRef = useRef<HTMLDivElement | null>(null);
  const sorovRaqami = useRef(0);
  const filtrKaliti = JSON.stringify(filtr);

  const yuklash = useCallback(async () => {
    const raqam = ++sorovRaqami.current;
    setYuklanmoqda(true);
    try {
      const asosiy = JSON.parse(filtrKaliti) as LidFiltri;
      const natijalar = await Promise.all(
        LID_BOSQICHLARI.map((stage) => lidlarApi.royxat({ ...asosiy, stage, page: 1, pageSize: USTUN_HAJMI }))
      );
      if (raqam !== sorovRaqami.current) return;
      setUstunlar(Object.fromEntries(LID_BOSQICHLARI.map((stage, i) => [stage, { items: natijalar[i].items, total: natijalar[i].total }])));
    } catch {
      if (raqam === sorovRaqami.current) setUstunlar((joriy) => joriy ?? Object.fromEntries(LID_BOSQICHLARI.map((s) => [s, { items: [], total: 0 }])));
    } finally {
      if (raqam === sorovRaqami.current) setYuklanmoqda(false);
    }
  }, [filtrKaliti]);

  useEffect(() => {
    void yuklash();
  }, [yuklash, yangilashKaliti]);

  /** Kartochkani boshqa ustunga ko'chirish: avval ekranda (darhol), keyin PATCH; xato bo'lsa qayta yuklanadi (xato toasti global). */
  async function kochirish(lid: Lid, dan: string, ga: string, lostReason?: string) {
    setUstunlar((joriy) => {
      if (!joriy) return joriy;
      const yangiLid = { ...lid, stage: ga, lostReason: ga === "LOST" ? (lostReason ?? null) : null };
      return {
        ...joriy,
        [dan]: { items: joriy[dan].items.filter((l) => l.id !== lid.id), total: Math.max(0, joriy[dan].total - 1) },
        [ga]: { items: [yangiLid, ...joriy[ga].items], total: joriy[ga].total + 1 },
      };
    });
    try {
      const yangi = await lidlarApi.yangilash(lid.id, ga === "LOST" ? { stage: ga, lostReason } : { stage: ga });
      if (yangi && typeof yangi === "object") {
        setUstunlar((joriy) =>
          joriy ? { ...joriy, [ga]: { ...joriy[ga], items: joriy[ga].items.map((l) => (l.id === lid.id ? { ...l, ...yangi } : l)) } } : joriy
        );
      }
      onOzgardi();
    } catch {
      void yuklash();
    }
  }

  // Sudrash: doska chetiga yaqinlashganda gorizontal aylantirish.
  useEffect(() => {
    if (!sudralayotgan) return;
    let kadr = 0;
    const qadam = () => {
      const doska = doskaRef.current;
      const joriy = sudrash.current;
      if (doska && joriy) {
        const r = doska.getBoundingClientRect();
        const tezlik = joriy.x < r.left + 60 ? -16 : joriy.x > r.right - 60 ? 16 : 0;
        if (tezlik) doska.scrollLeft += tezlik;
      }
      kadr = requestAnimationFrame(qadam);
    };
    kadr = requestAnimationFrame(qadam);
    return () => cancelAnimationFrame(kadr);
  }, [sudralayotgan]);

  function bosildi(lid: Lid, dan: string, event: ReactPointerEvent<HTMLElement>, tutqichdan: boolean) {
    // Barmoqda faqat tutqichdan sudraladi (kartochka ustida ustun aylanishi ishlashi uchun).
    if (event.pointerType !== "mouse" && !tutqichdan) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const karta = (event.currentTarget.closest("[data-kanban-karta]") as HTMLElement | null) ?? event.currentTarget;
    const r = karta.getBoundingClientRect();
    sudraldi.current = false;
    sudrash.current = { lid, dan, x: event.clientX, y: event.clientY, faol: false, pointerId: event.pointerId, dx: event.clientX - r.left, dy: event.clientY - r.top, kenglik: r.width };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // capture bo'lmasa ham ishlaydi
    }
  }

  function surildi(event: ReactPointerEvent<HTMLElement>) {
    const joriy = sudrash.current;
    if (!joriy || joriy.pointerId !== event.pointerId) return;
    if (!joriy.faol && Math.hypot(event.clientX - joriy.x, event.clientY - joriy.y) < 6) return;
    joriy.faol = true;
    sudraldi.current = true;
    joriy.x = event.clientX;
    joriy.y = event.clientY;
    event.preventDefault();
    setSudralayotgan({ lid: joriy.lid, x: event.clientX, y: event.clientY, dx: joriy.dx, dy: joriy.dy, kenglik: joriy.kenglik });
    const ustun = (document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-kanban-ustun]") as HTMLElement | null)?.dataset.kanbanUstun ?? null;
    setNishonUstun(ustun);
  }

  function qoyildi(event: ReactPointerEvent<HTMLElement>, bekor = false) {
    const joriy = sudrash.current;
    if (!joriy || joriy.pointerId !== event.pointerId) return;
    sudrash.current = null;
    const ga = nishonUstun;
    setSudralayotgan(null);
    setNishonUstun(null);
    if (!joriy.faol || bekor || !ga || ga === joriy.dan) return;
    if (ga === "LOST") setSababSorovi({ lid: joriy.lid, dan: joriy.dan });
    else void kochirish(joriy.lid, joriy.dan, ga);
  }

  // Tutqich hodisalari kartochkaga ko'tarilmaydi (aks holda bitta harakat ikki marta ishlanadi).
  const sudrashHodisalari = (lid: Lid, dan: string, tutqichdan: boolean) => {
    const toxtat = (event: ReactPointerEvent<HTMLElement>) => {
      if (tutqichdan) event.stopPropagation();
    };
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        toxtat(event);
        bosildi(lid, dan, event, tutqichdan);
      },
      onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
        toxtat(event);
        surildi(event);
      },
      onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
        toxtat(event);
        qoyildi(event);
      },
      onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => {
        toxtat(event);
        qoyildi(event, true);
      },
    };
  };

  return (
    <div className="relative">
      {yuklanmoqda && ustunlar && <LoaderCircle size={18} className="absolute -top-7 right-1 animate-spin text-blue-600" />}
      <div ref={doskaRef} data-kanban-doska className="flex gap-3 overflow-x-auto pb-3 [scrollbar-width:thin]">
        {LID_BOSQICHLARI.map((stage: LidBosqichi) => {
          const ustun = ustunlar?.[stage];
          const nishon = nishonUstun === stage && sudralayotgan && sudrash.current?.dan !== stage;
          return (
            <section
              key={stage}
              data-kanban-ustun={stage}
              className={cn(
                // Keng ekranda 6 ustun joyni teng bo'lishadi, tor ekranda 220px dan torayishmaydi (doska gorizontal aylanadi).
                "flex min-w-[220px] flex-1 basis-0 flex-col rounded-[22px] border bg-slate-50/80 transition",
                nishon ? "border-[#2563EB] bg-blue-50/70 ring-4 ring-blue-100" : "border-slate-200"
              )}
            >
              <header className="flex items-center gap-2 px-3.5 pb-2 pt-3">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", BOSQICH_NUQTALARI[stage])} />
                <h3 className="min-w-0 flex-1 truncate text-sm font-black text-slate-800">{t(`lid.stage.${stage}`)}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black tabular-nums text-slate-600 ring-1 ring-slate-200">
                  {ustun ? ustun.total : "…"}
                </span>
              </header>
              <div className="max-h-[calc(100dvh-380px)] min-h-[180px] flex-1 space-y-2 overflow-y-auto px-2.5 pb-2.5">
                {!ustun ? (
                  <p className="flex items-center justify-center gap-2 py-10 text-xs font-semibold text-slate-400">
                    <LoaderCircle size={15} className="animate-spin text-blue-600" />
                  </p>
                ) : ustun.items.length === 0 ? (
                  <p
                    className={cn(
                      "flex h-24 items-center justify-center rounded-2xl border-2 border-dashed text-xs font-bold",
                      nishon ? "border-blue-300 text-[#2563EB]" : "border-slate-200 text-slate-400"
                    )}
                  >
                    {nishon ? t("lid.kanban.drop") : t("lid.kanban.empty")}
                  </p>
                ) : (
                  ustun.items.map((lid) => (
                    <KanbanKarta
                      key={lid.id}
                      lid={lid}
                      faol={lid.id === ochiqLidId}
                      xira={sudralayotgan?.lid.id === lid.id}
                      onBos={() => {
                        if (sudraldi.current) {
                          sudraldi.current = false;
                          return;
                        }
                        onOchish(lid.id);
                      }}
                      kartaHodisalari={sudrashHodisalari(lid, stage, false)}
                      tutqichHodisalari={sudrashHodisalari(lid, stage, true)}
                    />
                  ))
                )}
                {ustun && ustun.total > ustun.items.length && (
                  <button
                    type="button"
                    onClick={() => onKoproq(stage)}
                    className="w-full rounded-xl px-2 py-2 text-xs font-bold text-[#2563EB] transition hover:bg-blue-50"
                  >
                    {t("lid.kanban.more", { n: ustun.total - ustun.items.length })}
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-1 hidden text-[11px] font-semibold text-slate-400 sm:block">{t("lid.kanban.dragHint")}</p>

      {sudralayotgan && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[99996] rotate-2 opacity-95"
          style={{ left: sudralayotgan.x - sudralayotgan.dx, top: sudralayotgan.y - sudralayotgan.dy, width: sudralayotgan.kenglik }}
        >
          <KanbanKarta lid={sudralayotgan.lid} faol={false} xira={false} soya />
        </div>
      )}

      {sababSorovi && (
        <YoqotishSababiOynasi
          nom={lidNomi(sababSorovi.lid)}
          onYopish={() => setSababSorovi(null)}
          onSaqlash={async (sabab) => {
            const { lid, dan } = sababSorovi;
            setSababSorovi(null);
            await kochirish(lid, dan, "LOST", sabab);
          }}
        />
      )}
    </div>
  );
}

type Hodisalar = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
};

function KanbanKarta({
  lid,
  faol,
  xira,
  soya = false,
  onBos,
  kartaHodisalari,
  tutqichHodisalari,
}: {
  lid: Lid;
  faol: boolean;
  xira: boolean;
  soya?: boolean;
  onBos?: () => void;
  kartaHodisalari?: Hodisalar;
  tutqichHodisalari?: Hodisalar;
}) {
  const { t } = useTranslation("savdo_agenti");
  return (
    <article
      data-kanban-karta={lid.id}
      {...kartaHodisalari}
      onClick={onBos}
      className={cn(
        "group relative cursor-pointer select-none rounded-2xl border bg-white p-3 transition",
        faol ? "border-[#2563EB] ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-200 hover:shadow-sm",
        xira && "opacity-35",
        soya && "shadow-[0_18px_40px_rgba(15,23,42,.22)]"
      )}
    >
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-slate-800">{lidNomi(lid)}</span>
          {lid.thread?.telegramUsername && lid.thread.displayName && (
            <span className="block truncate text-[11px] font-medium text-slate-400">@{lid.thread.telegramUsername.replace(/^@/, "")}</span>
          )}
        </span>
        <button
          type="button"
          aria-label={t("lid.kanban.handle")}
          {...tutqichHodisalari}
          onClick={(event) => {
            event.stopPropagation();
            onBos?.();
          }}
          // index.css dagi `button { touch-action: manipulation }` dan ustun bo'lishi uchun inline.
          style={{ touchAction: "none" }}
          className="-mr-1 -mt-1 flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-slate-500"
        >
          <GripVertical size={15} />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <KanalBelgisi kanal={lid.source} ixcham />
        {lid.thread && lid.thread.partnerId === null && (
          <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-100">{t("suhbat.unassigned")}</span>
        )}
        {lid.stage === "LOST" && lid.lostReason && (
          <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-100">
            {t(`lid.reason.${lid.lostReason}`, { defaultValue: lid.lostReason })}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-400">
        <span className="inline-flex min-w-0 items-center gap-1 truncate">
          <UserRound size={12} className="shrink-0" />
          <span className="truncate">{lid.owner?.fullName || t("lid.noOwner")}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1" title={vaqtMatni(lid.lastActivityAt)}>
          <Clock3 size={12} />
          {nisbiyVaqtMatni(lid.lastActivityAt, t)}
        </span>
      </div>
    </article>
  );
}
