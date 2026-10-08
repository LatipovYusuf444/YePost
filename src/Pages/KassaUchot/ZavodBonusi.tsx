import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Ban, CircleCheck, Gift, Plus, RotateCcw, Search, Trash2, type LucideIcon } from "lucide-react";
import AppSelect from "@/Components/ui/AppSelect";
import DateRangePicker from "@/Components/ui/DateRangePicker";
import LoadingState from "@/Components/common/LoadingState";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { zavodBonusiApi } from "@/api/zavodBonusiApi";
import type { ZavodBonusi as ZavodBonusiHujjati, ZavodBonusiHolati } from "@/types/zavodBonusi";
import KengaytiriladiganJadval, { type Ustun } from "../HisobotUchot/KengaytiriladiganJadval";
import ZavodBonusiModal from "./ZavodBonusiModal";
import { maydonKlass, sanaFormat, summaFormat } from "./yordamchilar";
import { zavodBonusiXatosi } from "./zavodBonusiXato";

type Amal = "tasdiqlash" | "bekorQilish" | "tiklash" | "ochirish";

const HOLAT_USLUBI: Record<ZavodBonusiHolati, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-rose-50 text-rose-600",
};

const AMAL_USLUBI: Record<Amal, { icon: LucideIcon; tugma: string; ohang: "yashil" | "sariq" | "qizil" }> = {
  tasdiqlash: { icon: CircleCheck, tugma: "text-emerald-600 hover:bg-emerald-50", ohang: "yashil" },
  bekorQilish: { icon: Ban, tugma: "text-amber-600 hover:bg-amber-50", ohang: "sariq" },
  tiklash: { icon: RotateCcw, tugma: "text-sky-600 hover:bg-sky-50", ohang: "yashil" },
  ochirish: { icon: Trash2, tugma: "text-red-500 hover:bg-red-50", ohang: "qizil" },
};

// Holatga qarab qaysi amallar mumkin (backend: tasdiqlash/tahrirlash — qoralama, bekor qilish — tasdiqlangan,
// tiklash — bekor qilingan, o'chirish — qoralama yoki bekor qilingan).
function amallar(bonus: ZavodBonusiHujjati, ochirishMumkin: boolean): Amal[] {
  if (bonus.status === "DRAFT") return ochirishMumkin ? ["tasdiqlash", "ochirish"] : ["tasdiqlash"];
  if (bonus.status === "CONFIRMED") return ["bekorQilish"];
  return ochirishMumkin ? ["tiklash", "ochirish"] : ["tiklash"];
}

type Props = {
  // Yaratish/tasdiqlash — direktor yoki CASH_IN huquqi; o'chirish — DELETE huquqi (direktor ham).
  ochirishMumkin: boolean;
};

export default function ZavodBonusi({ ochirishMumkin }: Props) {
  const { t } = useTranslation("kassa_uchot");
  const [qidiruv, setQidiruv] = useState("");
  const [qidiruvSoz, setQidiruvSoz] = useState("");
  const [holat, setHolat] = useState<"ALL" | ZavodBonusiHolati>("ALL");
  const [sanaDan, setSanaDan] = useState("");
  const [sanaGacha, setSanaGacha] = useState("");
  const [royxat, setRoyxat] = useState<ZavodBonusiHujjati[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xatolik, setXatolik] = useState("");
  const [modal, setModal] = useState<{ bonus: ZavodBonusiHujjati | null } | null>(null);
  const [tasdiq, setTasdiq] = useState<{ amal: Amal; bonus: ZavodBonusiHujjati } | null>(null);

  useEffect(() => {
    const taymer = window.setTimeout(() => setQidiruvSoz(qidiruv.trim()), 400);
    return () => window.clearTimeout(taymer);
  }, [qidiruv]);

  const yuklash = useCallback(async () => {
    setYuklanmoqda(true);
    try {
      const natija = await zavodBonusiApi.barchasi({
        status: holat === "ALL" ? undefined : holat,
        search: qidiruvSoz || undefined,
        // Sana oralig'i mahalliy kunlar bo'yicha (UTC siljishi bo'lmasligi uchun kun boshi/oxiri ISO'ga o'giriladi).
        dateFrom: sanaDan ? new Date(`${sanaDan}T00:00:00`).toISOString() : undefined,
        dateTo: sanaGacha ? new Date(`${sanaGacha}T23:59:59.999`).toISOString() : undefined,
      });
      setRoyxat(natija);
      setXatolik("");
    } catch (error) {
      setXatolik(zavodBonusiXatosi(error, t));
    } finally {
      setYuklanmoqda(false);
    }
  }, [holat, qidiruvSoz, sanaDan, sanaGacha, t]);

  useEffect(() => {
    void yuklash();
  }, [yuklash]);

  async function amalniBajarish(amal: Amal, bonus: ZavodBonusiHujjati) {
    try {
      if (amal === "tasdiqlash") await zavodBonusiApi.tasdiqlash(bonus.id);
      else if (amal === "bekorQilish") await zavodBonusiApi.bekorQilish(bonus.id);
      else if (amal === "tiklash") await zavodBonusiApi.tiklash(bonus.id);
      else await zavodBonusiApi.ochirish(bonus.id);
      setXatolik("");
      // Hisobotlar (kontragent balansi, foyda, chegirmalar) shu hujjatga bog'liq: ochiq sahifalar yangilansin.
      window.dispatchEvent(new CustomEvent("savdo:yangilandi", { detail: { zavodBonusiId: bonus.id } }));
      await yuklash();
      return true;
    } catch (error) {
      setXatolik(zavodBonusiXatosi(error, t));
      // Hujjat boshqa joyda o'zgargan bo'lishi mumkin — ro'yxatni backend holatiga moslaymiz.
      await yuklash();
      return false;
    }
  }

  // Tasdiqlangan bonuslar yig'indisi (bekor qilingan va qoralamalar hisobga kirmaydi).
  const tasdiqlanganJami = useMemo(
    () => royxat.reduce((yigindi, bonus) => yigindi + (bonus.status === "CONFIRMED" ? Number(bonus.amount ?? 0) : 0), 0),
    [royxat],
  );

  // Eng kerakli ustunlar (raqam, holat, zavod, sana, summa, amallar) birinchi ekranga sig'adi; qolganlari o'ngda.
  const ustunlar: Ustun<ZavodBonusiHujjati>[] = [
    { id: "raqam", nom: t("zavodBonusi.columns.number"), kenglik: 125, katak: (b) => <span className="font-black text-slate-900">{b.docNumber || b.id.slice(0, 8).toUpperCase()}</span> },
    {
      id: "holat",
      nom: t("zavodBonusi.columns.status"),
      kenglik: 145,
      katak: (b) => <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${HOLAT_USLUBI[b.status]}`}>{t(`zavodBonusi.holatlar.${b.status}`)}</span>,
    },
    { id: "zavod", nom: t("zavodBonusi.columns.supplier"), kenglik: 170, katak: (b) => <span className="font-semibold text-slate-700">{b.supplier?.name ?? "—"}</span> },
    { id: "sana", nom: t("zavodBonusi.columns.date"), kenglik: 125, katak: (b) => <span className="text-slate-500">{b.date ? sanaFormat(b.date) : "—"}</span> },
    {
      id: "summa",
      nom: t("zavodBonusi.columns.amount"),
      kenglik: 150,
      hizalash: "right",
      katak: (b) => <span className={`font-black ${b.status === "CANCELLED" ? "text-slate-400 line-through" : "text-emerald-600"}`}>+ {summaFormat(Number(b.amount ?? 0))}</span>,
      jami: () => <span className="text-emerald-600">{summaFormat(tasdiqlanganJami)}</span>,
    },
    {
      id: "amallar",
      nom: t("zavodBonusi.columns.actions"),
      kenglik: 115,
      hizalash: "right",
      katak: (b) => (
        <span className="inline-flex items-center justify-end gap-1">
          {amallar(b, ochirishMumkin).map((amal) => {
            const { icon: Ikona, tugma } = AMAL_USLUBI[amal];
            return (
              <ChiziqliTugma
                key={amal}
                nom={t(`zavodBonusi.amallar.${amal}`)}
                onBos={(event) => {
                  event.stopPropagation();
                  setTasdiq({ amal, bonus: b });
                }}
                klass={tugma}
              >
                <Ikona size={16} />
              </ChiziqliTugma>
            );
          })}
        </span>
      ),
    },
    { id: "filial", nom: t("zavodBonusi.columns.branch"), kenglik: 130, katak: (b) => <span className="text-slate-500">{b.branch?.name ?? "—"}</span> },
    { id: "masul", nom: t("zavodBonusi.columns.createdBy"), kenglik: 150, katak: (b) => <span className="text-slate-500">{b.createdBy?.fullName ?? "—"}</span> },
    { id: "izoh", nom: t("zavodBonusi.columns.note"), kenglik: 190, katak: (b) => <span className="text-slate-500">{b.note || "—"}</span> },
  ];

  const dastlabkiYuklanish = yuklanmoqda && royxat.length === 0 && !xatolik;
  const filtrFaol = holat !== "ALL" || qidiruvSoz !== "" || sanaDan !== "" || sanaGacha !== "";
  const tasdiqSozlamasi = tasdiq ? AMAL_USLUBI[tasdiq.amal] : null;
  const TasdiqIkonasi = tasdiqSozlamasi?.icon;

  return (
    <section className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm font-medium leading-6 text-emerald-900">
        <Gift size={18} className="mt-1 shrink-0" aria-hidden />
        <p>{t("zavodBonusi.subtitle")}</p>
      </div>

      {xatolik && (
        <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xatolik}</div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex h-11 w-full min-w-0 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 shadow-sm sm:max-w-sm sm:flex-1">
            <Search size={17} className="shrink-0 text-gray-400" />
            <input
              value={qidiruv}
              onChange={(event) => setQidiruv(event.target.value)}
              className="min-w-0 flex-1 text-sm font-semibold outline-none"
              placeholder={t("zavodBonusi.searchPlaceholder")}
            />
          </label>
          <AppSelect
            value={holat}
            onChange={(event) => setHolat(event.target.value as "ALL" | ZavodBonusiHolati)}
            aria-label={t("zavodBonusi.statusFilter")}
            className={`${maydonKlass} sm:w-52`}
          >
            <option value="ALL">{t("zavodBonusi.statusAll")}</option>
            {(["DRAFT", "CONFIRMED", "CANCELLED"] as const).map((kod) => (
              <option key={kod} value={kod}>{t(`zavodBonusi.holatlar.${kod}`)}</option>
            ))}
          </AppSelect>
          <DateRangePicker
            from={sanaDan}
            to={sanaGacha}
            onChange={(from, to) => {
              setSanaDan(from);
              setSanaGacha(to);
            }}
            compact
            className="sm:w-60"
          />
          {!dastlabkiYuklanish && !xatolik && (
            <div className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-emerald-50 px-4 text-sm font-black text-emerald-700">
              <Gift size={16} aria-hidden /> {t("zavodBonusi.confirmedTotal", { value: summaFormat(tasdiqlanganJami) })}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setModal({ bonus: null })}
          className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white"
        >
          <Plus size={17} /> {t("zavodBonusi.createButton")}
        </button>
      </div>

      {dastlabkiYuklanish ? (
        <LoadingState matn={t("zavodBonusi.loading")} ikonka={<Gift size={24} />} />
      ) : royxat.length === 0 && !xatolik ? (
        <div className="rounded-2xl border border-dashed border-orange-200 bg-white p-12 text-center">
          <p className="font-bold text-gray-500">{filtrFaol ? t("zavodBonusi.emptyFiltered") : t("zavodBonusi.empty")}</p>
          {!filtrFaol && <p className="mt-1 text-sm font-medium text-gray-400">{t("zavodBonusi.emptyHint")}</p>}
        </div>
      ) : royxat.length > 0 ? (
        <KengaytiriladiganJadval
          ustunlar={ustunlar}
          qatorlar={royxat}
          jamiBor
          kengaytir
          onQatorBosildi={(bonus) => setModal({ bonus })}
          qatorKlass={(b) => (b.status === "CANCELLED" ? "opacity-60" : "")}
        />
      ) : null}

      {modal && <ZavodBonusiModal bonus={modal.bonus} onYopish={() => setModal(null)} onYangilash={yuklash} />}

      {tasdiq && tasdiqSozlamasi && TasdiqIkonasi && (
        <TasdiqlashOynasi
          ikonka={<TasdiqIkonasi size={24} />}
          ohang={tasdiqSozlamasi.ohang}
          sarlavha={t(`zavodBonusi.dialog.${tasdiq.amal}.title`)}
          nom={`${tasdiq.bonus.docNumber ?? ""} · ${tasdiq.bonus.supplier?.name ?? ""} · ${summaFormat(Number(tasdiq.bonus.amount ?? 0))}`}
          tavsif={t(`zavodBonusi.dialog.${tasdiq.amal}.description`)}
          ortgaMatni={t("zavodBonusi.dialog.no")}
          tasdiqMatni={t(`zavodBonusi.dialog.${tasdiq.amal}.yes`)}
          jarayonMatni={t("zavodBonusi.dialog.working")}
          onTasdiq={() => amalniBajarish(tasdiq.amal, tasdiq.bonus)}
          onYopish={() => setTasdiq(null)}
        />
      )}
    </section>
  );
}

function ChiziqliTugma({ nom, onBos, klass, children }: { nom: string; onBos: (event: MouseEvent<HTMLButtonElement>) => void; klass: string; children: ReactNode }) {
  return (
    <button
      type="button"
      title={nom}
      aria-label={nom}
      onClick={onBos}
      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition ${klass}`}
    >
      {children}
    </button>
  );
}
