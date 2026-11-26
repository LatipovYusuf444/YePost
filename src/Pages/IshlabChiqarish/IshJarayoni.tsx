import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarClock, Check, ClipboardCheck, ClipboardList, Lock, PackageOpen, Plus, RefreshCw, Timer, Undo2, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ishlabChiqarishApi } from "@/api/ishlabChiqarishApi";
import { bugungiToshkentKuni, kunMatni, toshkentKuni } from "@/lib/hujjatSanasi";
import { OCHIQ_BUYURTMA, YOPILADIGAN_BUYURTMA, hujjatRaqami, joriyBosqich, qatorNomi, type BosqichKaliti } from "@/lib/ishlabChiqarish";
import { ishlabChiqarishRuxsati, type IshlabChiqarishBolimi } from "@/lib/roles";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useIshlabChiqarishStore } from "@/store/ishlabChiqarishStore";
import type { Buyurtma } from "@/types/ishlabChiqarish";
import { Jarayon, Sahifa, XatoQutisi, Yuklanmoqda, tugmaAsosiy, tugmaIkkinchi } from "./umumiy";
import { useAmal, useMalumot } from "./hooklar";

// "Bugungi ishlar": ishlab chiqarishning bosh ekrani. Har ochiq buyurtma bitta kartochka — qaysi bosqichda turgani va bitta katta tugma:
// hozir nima qilish kerak. Batafsil ishlar (jadval, filtrlar) eski bo'limlarda qoladi; bu ekran faqat yo'naltiradi.

const BOSQICHLAR: BosqichKaliti[] = ["order", "issue", "report", "acceptance", "close"];

/** Bosqich amalini kim bajaradi (menyu ruxsati bilan bir xil). */
const BOSQICH_BOLIMI: Record<Exclude<BosqichKaliti, "order">, IshlabChiqarishBolimi> = {
  issue: "sexga-berish",
  report: "smena",
  acceptance: "qabul",
  close: "buyurtmalar",
};

const BOSQICH_IKONKASI: Record<Exclude<BosqichKaliti, "order">, LucideIcon> = {
  issue: PackageOpen,
  report: Timer,
  acceptance: ClipboardCheck,
  close: Lock,
};

// Ko'rsatiladigan buyurtmalar: ishda turganlar va yopilishi kutilayotganlar.
const KORINADI = [...OCHIQ_BUYURTMA, ...YOPILADIGAN_BUYURTMA];

function muddatOtganmi(buyurtma: Buyurtma) {
  return Boolean(buyurtma.dueDate) && toshkentKuni(buyurtma.dueDate ?? undefined) < bugungiToshkentKuni();
}

export default function IshJarayoni() {
  const { t } = useTranslation("ishlab_chiqarish");
  const navigate = useNavigate();
  const profil = useAuthProfileStore((holat) => holat.profil);
  const berishYoq = useIshlabChiqarishStore((holat) => holat.sozlama?.issueStageEnabled === false);
  const royxat = useMalumot(() => ishlabChiqarishApi.buyurtmalar.royxat(), "orders-flow");
  const [tanlangan, setTanlangan] = useState<BosqichKaliti | "mine" | null>(null);

  const bosqichlar = useMemo(() => BOSQICHLAR.filter((kalit) => !(berishYoq && kalit === "issue")), [berishYoq]);
  const ruxsat = (kalit: BosqichKaliti | null) => (kalit && kalit !== "order" ? ishlabChiqarishRuxsati(profil, BOSQICH_BOLIMI[kalit]) : false);

  const kartalar = useMemo(() => {
    const qatorlar = (royxat.malumot ?? [])
      .filter((buyurtma) => KORINADI.includes(buyurtma.status))
      .map((buyurtma) => ({ buyurtma, bosqich: joriyBosqich(buyurtma.status, berishYoq) }))
      .filter((qator): qator is { buyurtma: Buyurtma; bosqich: BosqichKaliti } => qator.bosqich !== null);
    // Avval men bajaradigan ishlar, keyin muddati yaqinlari.
    return qatorlar.sort((a, b) => Number(ruxsat(b.bosqich)) - Number(ruxsat(a.bosqich)) || (a.buyurtma.dueDate ?? "9999").localeCompare(b.buyurtma.dueDate ?? "9999"));
    // `ruxsat` profilga bog'liq: profil o'zgarsa qayta saralanadi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [royxat.malumot, berishYoq, profil]);

  const soni = (kalit: BosqichKaliti | "mine") => kartalar.filter((qator) => (kalit === "mine" ? ruxsat(qator.bosqich) : qator.bosqich === kalit)).length;
  const korinadigan = tanlangan ? kartalar.filter((qator) => (tanlangan === "mine" ? ruxsat(qator.bosqich) : qator.bosqich === tanlangan)) : kartalar;
  const buyurtmaRuxsati = ishlabChiqarishRuxsati(profil, "buyurtmalar");

  return (
    <Sahifa
      sarlavha={t("flowBoard.title")}
      izoh={t("flowBoard.subtitle")}
      amal={<>
        <button type="button" onClick={royxat.qayta} aria-label={t("actions.refresh")} className={tugmaIkkinchi}><RefreshCw size={16} /></button>
        {buyurtmaRuxsati && <button type="button" onClick={() => navigate("/ishlab-chiqarish/buyurtmalar?yangi=1")} className={tugmaAsosiy}><Plus size={18} />{t("orders.create")}</button>}
      </>}
    >
      <div role="tablist" aria-label={t("flowBoard.filter")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip faol={tanlangan === null} onClick={() => setTanlangan(null)} matn={t("flowBoard.all")} soni={kartalar.length} />
        <Chip faol={tanlangan === "mine"} onClick={() => setTanlangan("mine")} matn={t("flowBoard.mine")} soni={soni("mine")} urgu />
        {bosqichlar.filter((kalit) => kalit !== "order").map((kalit) => (
          <Chip key={kalit} faol={tanlangan === kalit} onClick={() => setTanlangan(kalit)} matn={t(`orders.timeline.${kalit}`)} soni={soni(kalit)} />
        ))}
      </div>

      <XatoQutisi matn={royxat.xato} />
      {royxat.yuklanmoqda && !royxat.malumot ? <Yuklanmoqda /> : korinadigan.length === 0 ? (
        <div className="flex flex-col items-center rounded-[30px] border border-dashed border-orange-200 bg-white/70 px-6 py-12 text-center">
          <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-3xl bg-orange-50 text-[#2563EB] ring-1 ring-orange-100"><ClipboardList size={26} /></span>
          <p className="mt-4 text-lg font-black text-slate-800">{t(tanlangan ? "flowBoard.emptyFiltered" : "flowBoard.empty")}</p>
          <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">{t("flowBoard.emptyHint")}</p>
          {buyurtmaRuxsati && !tanlangan && <button type="button" onClick={() => navigate("/ishlab-chiqarish/buyurtmalar?yangi=1")} className={`${tugmaAsosiy} mt-5`}><Plus size={18} />{t("orders.create")}</button>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {korinadigan.map(({ buyurtma, bosqich }) => (
            <BuyurtmaKartasi key={buyurtma.id} buyurtma={buyurtma} bosqich={bosqich} bosqichlar={bosqichlar} ruxsat={ruxsat(bosqich)} onOzgardi={royxat.qayta} />
          ))}
        </div>
      )}
    </Sahifa>
  );
}

function Chip({ faol, onClick, matn, soni, urgu = false }: { faol: boolean; onClick: () => void; matn: string; soni: number; urgu?: boolean }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={faol}
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-black transition ${faol ? "bg-[#2563EB] text-white shadow-[0_8px_20px_rgba(37,99,235,.22)]" : urgu ? "bg-orange-50 text-[#2563EB] ring-1 ring-orange-200 hover:bg-orange-100" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}
    >
      {matn}
      <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${faol ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{soni}</span>
    </button>
  );
}

/** Bosqich chizig'i: o'tilganlar — belgi, hozirgisi — rangli, qolganlari — kulrang. */
function BosqichChizigi({ bosqichlar, joriy }: { bosqichlar: BosqichKaliti[]; joriy: BosqichKaliti }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const joriyIndeks = bosqichlar.indexOf(joriy);
  return (
    <ol className="flex items-start">
      {bosqichlar.map((kalit, indeks) => {
        const otdi = indeks < joriyIndeks;
        const hozir = indeks === joriyIndeks;
        return (
          <li key={kalit} className="flex min-w-0 flex-1 flex-col items-center text-center" aria-current={hozir ? "step" : undefined}>
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${indeks === 0 ? "opacity-0" : otdi || hozir ? "bg-[#2563EB]" : "bg-slate-200"}`} />
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${otdi ? "bg-[#2563EB] text-white" : hozir ? "bg-white text-[#2563EB] ring-[3px] ring-[#2563EB]" : "bg-slate-100 text-slate-400"}`}>
                {otdi ? <Check size={14} strokeWidth={3} /> : indeks + 1}
              </span>
              <span className={`h-0.5 flex-1 ${indeks === bosqichlar.length - 1 ? "opacity-0" : otdi ? "bg-[#2563EB]" : "bg-slate-200"}`} />
            </div>
            <span className={`mt-1.5 w-full truncate px-0.5 text-[11px] font-bold leading-4 ${hozir ? "text-[#2563EB]" : otdi ? "text-slate-600" : "text-slate-400"}`}>{t(`orders.timeline.${kalit}`)}</span>
          </li>
        );
      })}
    </ol>
  );
}

function BuyurtmaKartasi({ buyurtma, bosqich, bosqichlar, ruxsat, onOzgardi }: { buyurtma: Buyurtma; bosqich: BosqichKaliti; bosqichlar: BosqichKaliti[]; ruxsat: boolean; onOzgardi: () => void }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const navigate = useNavigate();
  const amal = useAmal();
  const qaytarilgan = buyurtma.status === "RETURNED";
  const muddatOtgan = muddatOtganmi(buyurtma) && !YOPILADIGAN_BUYURTMA.includes(buyurtma.status);
  const amalBosqichi = bosqich === "order" ? null : bosqich;
  const Ikonka = amalBosqichi ? BOSQICH_IKONKASI[amalBosqichi] : ArrowRight;

  function keyingiQadam() {
    if (!amalBosqichi) return;
    if (amalBosqichi === "issue") {
      // Buyurtmadan sexga berish hujjati tayyorlanadi (miqdorlar retseptdan) va o'sha hujjat ochiladi: omborchi faqat tasdiqlaydi.
      void amal.bajar(async () => {
        const berish = await ishlabChiqarishApi.berishlar.buyurtmadan(buyurtma.id);
        onOzgardi();
        navigate(`/ishlab-chiqarish/sexga-berish?hujjat=${berish.id}`);
      });
      return;
    }
    if (amalBosqichi === "report") navigate(`/ishlab-chiqarish/smena?buyurtma=${buyurtma.id}`);
    if (amalBosqichi === "acceptance") navigate(`/ishlab-chiqarish/qabul?buyurtma=${buyurtma.id}`);
    if (amalBosqichi === "close") navigate(`/ishlab-chiqarish/buyurtmalar?ochiq=${buyurtma.id}`);
  }

  return (
    <article className={`flex flex-col rounded-[26px] border bg-white p-5 shadow-sm ${qaytarilgan ? "border-rose-200" : ruxsat ? "border-orange-200" : "border-slate-200"}`}>
      <header className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => navigate(`/ishlab-chiqarish/buyurtmalar?ochiq=${buyurtma.id}`)} className="rounded-xl bg-orange-50 px-2.5 py-1 text-xs font-black text-[#2563EB] ring-1 ring-orange-100 hover:bg-orange-100">
          {hujjatRaqami(buyurtma) || t("status.DRAFT")}
        </button>
        {buyurtma.dueDate && (
          <span className={`inline-flex items-center gap-1 text-xs font-bold ${muddatOtgan ? "text-red-600" : "text-slate-400"}`}>
            <CalendarClock size={14} />{kunMatni(buyurtma.dueDate)}{muddatOtgan && ` · ${t("flowBoard.overdue")}`}
          </span>
        )}
      </header>
      <h3 className="mt-3 line-clamp-2 text-lg font-black leading-6 text-slate-900">{qatorNomi(buyurtma)}</h3>
      <div className="mt-3"><Jarayon bajarilgan={buyurtma.produced ?? 0} reja={buyurtma.quantity} /></div>
      <div className="mt-5"><BosqichChizigi bosqichlar={bosqichlar} joriy={bosqich} /></div>

      {qaytarilgan && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-rose-700 ring-1 ring-rose-100">
          <Undo2 size={14} className="mt-0.5 shrink-0" />{t("flowBoard.returned")}
        </p>
      )}
      <XatoQutisi matn={amal.xato} />

      <div className="mt-auto pt-5">
        {amalBosqichi && ruxsat ? (
          <button type="button" disabled={amal.band} onClick={keyingiQadam} className={`${tugmaAsosiy} w-full`}>
            <Ikonka size={18} />{t(`flowBoard.action.${amalBosqichi}`)}<ArrowRight size={16} />
          </button>
        ) : (
          <p className="flex h-12 items-center justify-center rounded-2xl bg-slate-50 px-4 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-200">
            {t("flowBoard.waiting", { bosqich: t(`orders.timeline.${bosqich}`) })}
          </p>
        )}
      </div>
    </article>
  );
}
