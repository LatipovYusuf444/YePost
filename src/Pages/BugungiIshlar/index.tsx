import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import axios from "axios";
import {
  CalendarCheck,
  CalendarRange,
  CircleAlert,
  ClipboardCheck,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Sun,
  Sunrise,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { xodimNomi as umumiyXodimNomi } from "@/lib/mijozMasuli";
import { useTranslation } from "react-i18next";
import AppSelect from "@/Components/ui/AppSelect";
import { crmApi } from "@/api/crmApi";
import { xodimlar as xodimlarniOlish } from "@/api/omborApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useJonliYangilash } from "@/hooks/useJonliYangilash";
import { toshkentHozir } from "@/lib/crmNatija";
import { foydalanuvchiAdminmi } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useAuthProfileStore } from "@/store/authProfileStore";
import type { Activity, KunTartibi } from "@/types/crm";
import VazifaYakunlashOynasi from "@/Pages/XaridorUchot/crm/VazifaYakunlashOynasi";
import VazifaBekorOynasi from "@/Pages/XaridorUchot/crm/VazifaBekorOynasi";
import type { NatijaXodimi } from "@/Pages/XaridorUchot/crm/useNatijaFormasi";
import VazifaKartasi, { type KunTartibiBolimi } from "./VazifaKartasi";
import {
  KUN_VARIANTLARI,
  STANDART_KUNLAR,
  ertagagaSurish,
  jamiVazifalar,
  kunQismlari,
  kunlarBoyichaGuruhlash,
  muddatBoyichaSaralash,
  vazifaniOlibTashlash,
} from "./bugungiIshlar";

// "Bugungi ishlar": sotuvchining kunlik vazifalari (GET /crm/activities/agenda) — muddati o'tgan, bugun, ertaga, keyinroq.
// Oddiy xodim — doim o'z vazifalari; admin/direktor boshqa xodimni tanlaydi (assigneeId).

const BOLIMLAR: KunTartibiBolimi[] = ["overdue", "today", "tomorrow", "later"];
const YANGILASH_MS = 60_000;
const KUNLAR_KALITI = "bugungiIshlar:kunlar";

const BOLIM_KORINISHI: Record<KunTartibiBolimi, { ikonka: LucideIcon; tile: string; soni: string; faolTile: string }> = {
  overdue: {
    ikonka: TriangleAlert,
    tile: "bg-rose-50 text-rose-600 ring-rose-100",
    soni: "bg-rose-500 text-white",
    faolTile: "border-rose-200 bg-rose-50/70",
  },
  today: {
    ikonka: Sun,
    tile: "bg-blue-50 text-[#2563EB] ring-blue-100",
    soni: "bg-[#2563EB] text-white",
    faolTile: "border-blue-200 bg-blue-50/60",
  },
  tomorrow: {
    ikonka: Sunrise,
    tile: "bg-sky-50 text-sky-600 ring-sky-100",
    soni: "bg-sky-500 text-white",
    faolTile: "border-sky-200 bg-sky-50/60",
  },
  later: {
    ikonka: CalendarRange,
    tile: "bg-violet-50 text-violet-600 ring-violet-100",
    soni: "bg-violet-500 text-white",
    faolTile: "border-violet-200 bg-violet-50/60",
  },
};

function saqlanganKunlar(): number {
  try {
    const qiymat = Number(window.localStorage.getItem(KUNLAR_KALITI));
    return (KUN_VARIANTLARI as readonly number[]).includes(qiymat) ? qiymat : STANDART_KUNLAR;
  } catch {
    return STANDART_KUNLAR;
  }
}

// /accounts/users ism-familiyani alohida (firstName/lastName) beradi — umumiy yordamchi hammasini hisobga oladi.
function xodimNomi(x: Parameters<typeof umumiyXodimNomi>[0] & { id: string }) {
  return umumiyXodimNomi(x) || x.id;
}

export default function BugungiIshlar() {
  const { t } = useTranslation("crm");
  const profil = useAuthProfileStore((state) => state.profil);
  const rahbar = foydalanuvchiAdminmi(profil);
  const menId = profil?.id ?? "";

  // "" — men (backend standarti).
  const [xodimId, setXodimId] = useState("");
  const [kunlar, setKunlar] = useState(saqlanganKunlar);
  const [tartib, setTartib] = useState<KunTartibi | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState("");
  const [hozir, setHozir] = useState(() => new Date());
  const [xodimlar, setXodimlar] = useState<NatijaXodimi[]>([]);
  const [yakunlanayotgan, setYakunlanayotgan] = useState<Activity | null>(null);
  const [bekorQilinayotgan, setBekorQilinayotgan] = useState<Activity | null>(null);
  const [surilayotganlar, setSurilayotganlar] = useState<ReadonlySet<string>>(() => new Set());

  const sorovRef = useRef<AbortController | null>(null);
  const oxirgiYuklashRef = useRef(0);

  // Har yangi so'rov eskisini bekor qiladi: filtr almashganda eski javob yangisini bosib ketmaydi.
  const yuklash = useCallback(
    async (fon = false) => {
      sorovRef.current?.abort();
      const boshqaruv = new AbortController();
      sorovRef.current = boshqaruv;
      if (!fon) setYuklanmoqda(true);
      try {
        const javob = await crmApi.kunTartibi({ assigneeId: xodimId || undefined, days: kunlar }, boshqaruv.signal);
        if (boshqaruv.signal.aborted) return;
        setTartib(javob);
        setXato("");
        setHozir(new Date());
        oxirgiYuklashRef.current = Date.now();
      } catch (error) {
        if (boshqaruv.signal.aborted || axios.isCancel(error)) return;
        setXato(getApiErrorMessage(error) || t("kunTartibi.xato"));
      } finally {
        if (sorovRef.current === boshqaruv) {
          sorovRef.current = null;
          setYuklanmoqda(false);
        }
      }
    },
    [kunlar, t, xodimId]
  );

  useEffect(() => {
    void yuklash();
  }, [yuklash]);

  useEffect(() => () => sorovRef.current?.abort(), []);

  // SSE "notification" (yangi/ko'chirilgan vazifa eslatmasi) + oqim ishlamasa 60 s polling.
  const oqimHolati = useJonliYangilash({ hodisalar: ["notification"], yangilash: () => yuklash(true), zaxiraMs: YANGILASH_MS });

  // Oqim ulangan bo'lsa ham har daqiqada: vazifa vaqti o'tib "Muddati o'tgan"ga o'tishi hodisasiz bo'ladi.
  useEffect(() => {
    if (oqimHolati !== "ulangan") return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void yuklash(true);
    }, YANGILASH_MS);
    return () => window.clearInterval(id);
  }, [oqimHolati, yuklash]);

  // Uzoq yashirin turgan tab qaytganda darhol yangilanadi.
  useEffect(() => {
    const koringanda = () => {
      if (document.visibilityState === "visible" && Date.now() - oxirgiYuklashRef.current > YANGILASH_MS) void yuklash(true);
    };
    document.addEventListener("visibilitychange", koringanda);
    return () => document.removeEventListener("visibilitychange", koringanda);
  }, [yuklash]);

  // Xodim tanlovi faqat admin/direktorga (boshqalarga backend ro'yxat bermaydi).
  useEffect(() => {
    if (!rahbar) return;
    let faol = true;
    xodimlarniOlish()
      .then((royxat) => {
        if (!faol) return;
        setXodimlar(
          (royxat as Array<{ id: string; firstName?: string; lastName?: string; fullName?: string; name?: string; username?: string; isActive?: boolean }>)
            .filter((x) => Boolean(x.id) && x.isActive !== false)
            .map((x) => ({ id: x.id, nom: xodimNomi(x) }))
        );
      })
      .catch(() => {});
    return () => {
      faol = false;
    };
  }, [rahbar]);

  const xodimNomlari = useMemo(() => new Map(xodimlar.map((x) => [x.id, x.nom])), [xodimlar]);
  const boshqaXodimlar = useMemo(() => xodimlar.filter((x) => x.id !== menId), [menId, xodimlar]);

  const haftaKunlari = t("kunTartibi.haftaKunlari", { returnObjects: true }) as unknown as string[];
  const oylar = t("kunTartibi.oylar", { returnObjects: true }) as unknown as string[];
  const sanaMatni = useCallback(
    (kun: string) => {
      const q = kunQismlari(kun);
      if (!q) return t("kunTartibi.muddatsiz");
      return t("kunTartibi.sanaFormati", { hafta: haftaKunlari?.[q.haftaKuni] ?? "", kun: q.kun, oy: oylar?.[q.oy] ?? "" });
    },
    [haftaKunlari, oylar, t]
  );

  const saralangan = useMemo(
    () =>
      tartib
        ? {
            overdue: muddatBoyichaSaralash(tartib.overdue),
            today: muddatBoyichaSaralash(tartib.today),
            tomorrow: muddatBoyichaSaralash(tartib.tomorrow),
            later: muddatBoyichaSaralash(tartib.later),
          }
        : null,
    [tartib]
  );
  const keyinroqGuruhlari = useMemo(() => kunlarBoyichaGuruhlash(tartib?.later ?? []), [tartib]);
  const jami = jamiVazifalar(tartib);

  const masulNomi = useCallback(
    (vazifa: Activity) => {
      // O'z vazifalarida mas'ul nomi ortiqcha.
      if (!rahbar || (vazifa.assigneeId && vazifa.assigneeId === menId)) return undefined;
      const a = vazifa.assignee;
      return (a && umumiyXodimNomi(a)) || (vazifa.assigneeId ? xodimNomlari.get(vazifa.assigneeId) : undefined) || undefined;
    },
    [menId, rahbar, xodimNomlari]
  );

  // Natija yozilgan/bekor qilingan vazifa darhol ro'yxatdan ketadi, keyin server bilan solishtiriladi.
  const vazifaYopildi = useCallback(
    (id: string) => {
      setTartib((joriy) => (joriy ? vazifaniOlibTashlash(joriy, id) : joriy));
      void yuklash(true);
    },
    [yuklash]
  );

  const surish = useCallback(
    async (vazifa: Activity) => {
      if (surilayotganlar.has(vazifa.id)) return;
      setSurilayotganlar((joriy) => new Set(joriy).add(vazifa.id));
      try {
        // Eslatma vaqti backendda muddat bilan birga suriladi.
        await crmApi.activityYangilash(vazifa.id, { dueAt: ertagagaSurish(vazifa.dueAt) });
        await yuklash(true);
      } catch {
        // Xato matni global toastda.
      } finally {
        setSurilayotganlar((joriy) => {
          const yangi = new Set(joriy);
          yangi.delete(vazifa.id);
          return yangi;
        });
      }
    },
    [surilayotganlar, yuklash]
  );

  const ochYakunlash = useCallback((vazifa: Activity) => setYakunlanayotgan(vazifa), []);
  const ochBekor = useCallback((vazifa: Activity) => setBekorQilinayotgan(vazifa), []);
  const surishniBoshlash = useCallback((vazifa: Activity) => void surish(vazifa), [surish]);

  function kunlarniTanlash(qiymat: number) {
    setKunlar(qiymat);
    try {
      window.localStorage.setItem(KUNLAR_KALITI, String(qiymat));
    } catch {
      // xotira yopiq — tanlov faqat shu sessiyada
    }
  }

  function xodimniTanlash(id: string) {
    // Boshqa xodimning vazifalari aralashib ko'rinmasin.
    setTartib(null);
    setXodimId(id);
  }

  function bolimgaOtish(bolim: KunTartibiBolimi) {
    document.getElementById(`bugungi-ishlar-${bolim}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function kartalar(vazifalar: Activity[], bolim: KunTartibiBolimi) {
    return (
      <ul className="space-y-2.5">
        {vazifalar.map((vazifa) => (
          <VazifaKartasi
            key={vazifa.id}
            vazifa={vazifa}
            bolim={bolim}
            hozir={hozir}
            masulNomi={masulNomi(vazifa)}
            surilmoqda={surilayotganlar.has(vazifa.id)}
            bandmi={surilayotganlar.has(vazifa.id)}
            onBajarildi={ochYakunlash}
            onBekor={ochBekor}
            onSurish={surishniBoshlash}
          />
        ))}
      </ul>
    );
  }

  const bugun = toshkentHozir(hozir).kun;
  const birinchiYuklash = tartib === null && yuklanmoqda;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 pb-6" data-testid="bugungi-ishlar">
      {/* Sarlavha va filtrlar */}
      <header className="flex flex-col gap-4 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-md shadow-blue-200">
            <CalendarCheck size={24} aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-black leading-7 text-slate-900">{t("kunTartibi.sarlavha")}</h1>
            <p className="text-sm font-semibold text-slate-500">
              <span className="text-slate-700">{sanaMatni(bugun)}</span>
              <span className="hidden sm:inline"> · {t("kunTartibi.tavsif")}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {rahbar && (
            <AppSelect
              value={xodimId}
              onChange={(event) => xodimniTanlash(event.target.value)}
              aria-label={t("kunTartibi.xodim")}
              className="h-10 min-w-[180px] flex-1 rounded-xl sm:flex-none"
            >
              <option value="">{t("kunTartibi.men")}</option>
              {boshqaXodimlar.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nom}
                </option>
              ))}
            </AppSelect>
          )}
          <AppSelect
            value={String(kunlar)}
            onChange={(event) => kunlarniTanlash(Number(event.target.value))}
            aria-label={t("kunTartibi.davr")}
            className="h-10 min-w-[110px] flex-1 rounded-xl sm:flex-none"
          >
            {KUN_VARIANTLARI.map((kun) => (
              <option key={kun} value={kun}>
                {t("kunTartibi.kunSoni", { count: kun })}
              </option>
            ))}
          </AppSelect>
          <button
            type="button"
            onClick={() => void yuklash()}
            disabled={yuklanmoqda}
            aria-label={t("kunTartibi.yangilash")}
            title={t("kunTartibi.yangilash")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={17} className={yuklanmoqda ? "animate-spin" : undefined} aria-hidden />
          </button>
        </div>
      </header>

      {/* Bo'limlar soni: bosilsa o'sha bo'limga o'tadi */}
      <nav aria-label={t("kunTartibi.sarlavha")} className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {BOLIMLAR.map((bolim) => {
          const korinish = BOLIM_KORINISHI[bolim];
          const Ikonka = korinish.ikonka;
          const soni = saralangan?.[bolim].length ?? 0;
          const urgu = soni > 0 && bolim === "overdue";
          return (
            <button
              key={bolim}
              type="button"
              onClick={() => bolimgaOtish(bolim)}
              data-bolim-soni={bolim}
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-white px-3.5 py-3 text-left shadow-sm transition hover:-translate-y-px hover:shadow-md",
                urgu ? korinish.faolTile : "border-slate-200"
              )}
            >
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1", korinish.tile)}>
                <Ikonka size={17} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className={cn("block text-xl font-black leading-6", urgu ? "text-rose-600" : "text-slate-900")}>
                  {birinchiYuklash ? <span className="inline-block h-5 w-6 animate-pulse rounded bg-slate-100 align-middle" /> : soni}
                </span>
                <span className="block truncate text-xs font-bold text-slate-500">{t(`kunTartibi.bolimlar.${bolim}`)}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {xato && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          <span className="inline-flex min-w-0 items-center gap-2">
            <CircleAlert size={17} className="shrink-0" aria-hidden />
            <span className="break-words">{xato}</span>
          </span>
          <button
            type="button"
            onClick={() => void yuklash()}
            disabled={yuklanmoqda}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100 disabled:opacity-60"
          >
            {yuklanmoqda ? <LoaderCircle size={15} className="animate-spin" aria-hidden /> : <RefreshCw size={15} aria-hidden />}
            {t("kunTartibi.qaytaUrinish")}
          </button>
        </div>
      )}

      {birinchiYuklash ? (
        <div className="grid gap-4 lg:grid-cols-2" role="status" aria-label={t("kunTartibi.yuklanmoqda")}>
          {BOLIMLAR.map((bolim) => (
            <div key={bolim} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="h-5 w-32 animate-pulse rounded-lg bg-slate-100" />
              <div className="mt-4 space-y-2.5">
                {[0, 1].map((i) => (
                  <div key={i} className="h-[76px] animate-pulse rounded-2xl bg-slate-50" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : saralangan && jami === 0 && !xato ? (
        <div className="flex flex-col items-center rounded-[26px] border border-emerald-100 bg-gradient-to-b from-emerald-50/70 to-white px-6 py-12 text-center shadow-sm">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500 text-white shadow-[0_14px_30px_rgba(16,185,129,.3)]">
            <Sparkles size={30} aria-hidden />
          </span>
          <h2 className="mt-4 text-lg font-black text-slate-900">{t("kunTartibi.hammasiJoyida")}</h2>
          <p className="mt-1 max-w-md text-sm font-medium leading-6 text-slate-500">{t("kunTartibi.hammasiJoyidaTavsif")}</p>
        </div>
      ) : saralangan ? (
        <div className={cn("grid items-start gap-4 lg:grid-cols-2", yuklanmoqda && "opacity-70 transition-opacity")}>
          {BOLIMLAR.map((bolim) => (
            <Bolim key={bolim} bolim={bolim} soni={saralangan[bolim].length} sarlavha={t(`kunTartibi.bolimlar.${bolim}`)} bosh={t(`kunTartibi.boshBolim.${bolim}`)}>
              {bolim === "later" ? (
                <div className="space-y-4">
                  {keyinroqGuruhlari.map((guruh) => (
                    <div key={guruh.kun || "muddatsiz"}>
                      <h3 className="mb-2 flex items-center gap-2 px-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                        <span>{sanaMatni(guruh.kun)}</span>
                        <span className="h-px flex-1 bg-slate-100" />
                        <span className="font-bold normal-case tracking-normal text-slate-400">{t("kunTartibi.vazifaSoni", { count: guruh.vazifalar.length })}</span>
                      </h3>
                      {kartalar(guruh.vazifalar, bolim)}
                    </div>
                  ))}
                </div>
              ) : (
                kartalar(saralangan[bolim], bolim)
              )}
            </Bolim>
          ))}
        </div>
      ) : null}

      {yakunlanayotgan && (
        <VazifaYakunlashOynasi
          vazifa={yakunlanayotgan}
          xodimlar={rahbar ? xodimlar : undefined}
          masulTanlashMumkin={rahbar}
          onYopish={() => setYakunlanayotgan(null)}
          onBajarildi={() => {
            const id = yakunlanayotgan.id;
            setYakunlanayotgan((joriy) => (joriy?.id === id ? null : joriy));
            vazifaYopildi(id);
          }}
          onEskirdi={() => {
            const id = yakunlanayotgan.id;
            setYakunlanayotgan((joriy) => (joriy?.id === id ? null : joriy));
            vazifaYopildi(id);
          }}
        />
      )}

      {bekorQilinayotgan && (
        <VazifaBekorOynasi
          vazifa={bekorQilinayotgan}
          onYopish={() => setBekorQilinayotgan(null)}
          onBekorQilindi={() => {
            const id = bekorQilinayotgan.id;
            setBekorQilinayotgan((joriy) => (joriy?.id === id ? null : joriy));
            vazifaYopildi(id);
          }}
          onEskirdi={() => {
            const id = bekorQilinayotgan.id;
            setBekorQilinayotgan((joriy) => (joriy?.id === id ? null : joriy));
            vazifaYopildi(id);
          }}
        />
      )}
    </div>
  );
}

function Bolim({ bolim, soni, sarlavha, bosh, children }: { bolim: KunTartibiBolimi; soni: number; sarlavha: string; bosh: string; children: ReactNode }) {
  const korinish = BOLIM_KORINISHI[bolim];
  const Ikonka = korinish.ikonka;
  const urgu = bolim === "overdue" && soni > 0;
  return (
    <section
      id={`bugungi-ishlar-${bolim}`}
      aria-labelledby={`bugungi-ishlar-${bolim}-sarlavha`}
      className={cn("scroll-mt-4 overflow-hidden rounded-[24px] border bg-white shadow-sm", urgu ? "border-rose-200" : "border-slate-200")}
    >
      <header
        className={cn(
          "flex items-center gap-2.5 border-b px-4 py-3 sm:px-5",
          urgu ? "border-rose-100 bg-gradient-to-r from-rose-50 to-white" : "border-slate-100"
        )}
      >
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1", korinish.tile)}>
          <Ikonka size={16} aria-hidden />
        </span>
        <h2 id={`bugungi-ishlar-${bolim}-sarlavha`} className={cn("text-base font-black", urgu ? "text-rose-700" : "text-slate-900")}>
          {sarlavha}
        </h2>
        <span className={cn("ml-auto min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-black", soni > 0 ? korinish.soni : "bg-slate-100 text-slate-400")}>{soni}</span>
      </header>
      {/* Karta joylashuvi bo'lim kengligiga qarab (@container): tor ustunda amallar pastga tushadi. */}
      <div className="@container p-3 sm:p-4">
        {soni > 0 ? (
          children
        ) : (
          <p className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm font-semibold text-slate-400">
            <ClipboardCheck size={17} className="shrink-0 text-slate-300" aria-hidden />
            {bosh}
          </p>
        )}
      </div>
    </section>
  );
}
