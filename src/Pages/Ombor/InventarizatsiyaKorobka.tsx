import { useTranslation } from "react-i18next";
import { Boxes, X } from "lucide-react";
import { korobkaNatijasi, type KorobkaBirligi, type KorobkaSanogi } from "@/lib/inventarizatsiyaKorobka";

// 3 xonagacha, ortiqcha nollarsiz ("12", "2.5", "0.125").
const sonKorinishi = (son: number) => String(Number(son.toFixed(3)));

type TugmaProps = {
  faol: boolean;
  onYoqish: () => void;
  onOchirish: () => void;
};

/** Mahsulot nomi ostidagi "Korobkada sanash" tugmasi (faqat tovarda qo'shimcha birlik bo'lsa ko'rsatiladi). */
export function KorobkaTugmasi({ faol, onYoqish, onOchirish }: TugmaProps) {
  const { t } = useTranslation("ombor_harakat");
  return faol ? (
    <button
      type="button"
      data-korobka-tugma="ochirish"
      onClick={onOchirish}
      title={t("inventarizatsiya.createModal.box.turnOff")}
      className="inline-flex h-6 items-center gap-1 rounded-full bg-blue-600 pl-2 pr-1.5 text-[11px] font-bold tracking-normal text-white shadow-sm transition hover:bg-blue-700"
    >
      <Boxes size={12} aria-hidden />
      {t("inventarizatsiya.createModal.box.on")}
      <X size={12} aria-hidden />
      <span className="sr-only">{t("inventarizatsiya.createModal.box.turnOff")}</span>
    </button>
  ) : (
    <button
      type="button"
      data-korobka-tugma="yoqish"
      onClick={onYoqish}
      className="inline-flex h-6 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 text-[11px] font-bold tracking-normal text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
    >
      <Boxes size={12} aria-hidden />
      {t("inventarizatsiya.createModal.box.turnOn")}
    </button>
  );
}

type MaydonProps = {
  mahsulotNomi: string;
  birliklar: KorobkaBirligi[];
  asosiyNomi: string;
  /** Asosiy birlik kasr emas (dona): jami butun son bo'lishi shart. */
  butun?: boolean;
  sanoq: KorobkaSanogi;
  onChange: (sanoq: KorobkaSanogi) => void;
  xato?: boolean;
  /** Enter / ↑↓ bilan qatorlar orasida yurish (oddiy miqdor maydoni bilan bir xil). */
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

/**
 * Korobkada sanash paneli: [birlik] [yopiq korobkalar] + [ochiq qolgani, asosiy birlikda] = jami. Jami jadvaldagi "Miqdor" ustuniga
 * yoziladi; backendga closedUnitId / closedQuantity / openQuantity yuboriladi (u ham jamini xuddi shunday hisoblaydi).
 */
export function KorobkaMaydoni({ mahsulotNomi, birliklar, asosiyNomi, butun = false, sanoq, onChange, xato, onKeyDown }: MaydonProps) {
  const { t } = useTranslation("ombor_harakat");
  const birlik = birliklar.find((item) => item.unitId === sanoq.unitId) ?? birliklar[0];
  const natija = birlik ? korobkaNatijasi(sanoq, birlik.koeff, butun) : { holat: "xato" as const, sabab: "son" as const };
  const maydonXato = xato || natija.holat === "xato";
  const maydon = `h-10 w-full min-w-0 rounded-xl border px-3 text-[15px] font-bold tabular-nums text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-300 focus:ring-4 ${maydonXato ? "border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-100" : "border-blue-200 bg-white hover:border-slate-300 focus:border-blue-500 focus:ring-blue-100"}`;
  const birlikNomi = birlik?.nomi || t("inventarizatsiya.createModal.box.defaultUnit");

  return (
    <div data-korobka-panel className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)_auto_minmax(0,1fr)_auto]">
        {birliklar.length > 1 ? (
          <label className="col-span-3 grid gap-1 sm:col-span-1">
            <span className="text-[11px] font-semibold text-slate-500">{t("inventarizatsiya.createModal.box.unitLabel")}</span>
            <select
              value={birlik?.unitId ?? ""}
              onChange={(event) => onChange({ ...sanoq, unitId: event.target.value })}
              className="h-10 rounded-xl border border-blue-200 bg-white px-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              {birliklar.map((item) => (
                <option key={item.unitId} value={item.unitId}>{`${item.nomi} (${sonKorinishi(item.koeff)} ${asosiyNomi})`}</option>
              ))}
            </select>
          </label>
        ) : (
          <div className="col-span-3 grid gap-1 sm:col-span-1">
            <span className="text-[11px] font-semibold text-slate-500">{t("inventarizatsiya.createModal.box.unitLabel")}</span>
            <span className="flex h-10 items-center rounded-xl border border-blue-100 bg-white/70 px-3 text-sm font-bold text-slate-700">
              {birlik ? `${birlik.nomi} = ${sonKorinishi(birlik.koeff)} ${asosiyNomi}` : "—"}
            </span>
          </div>
        )}
        <label className="grid gap-1">
          <span className="truncate text-[11px] font-semibold text-slate-500">{t("inventarizatsiya.createModal.box.closedLabel", { unit: birlikNomi })}</span>
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            data-inventory-qty
            value={sanoq.yopiq}
            placeholder="0"
            onChange={(event) => onChange({ ...sanoq, unitId: birlik?.unitId ?? sanoq.unitId, yopiq: event.target.value })}
            onKeyDown={onKeyDown}
            aria-invalid={maydonXato || undefined}
            aria-label={t("inventarizatsiya.createModal.box.closedAria", { name: mahsulotNomi, unit: birlikNomi })}
            className={maydon}
          />
        </label>
        <span aria-hidden className="pb-2.5 text-lg font-black text-blue-300">+</span>
        <label className="grid gap-1">
          <span className="truncate text-[11px] font-semibold text-slate-500">{t("inventarizatsiya.createModal.box.openLabel", { base: asosiyNomi })}</span>
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            data-inventory-qty
            value={sanoq.ochiq}
            placeholder="0"
            onChange={(event) => onChange({ ...sanoq, unitId: birlik?.unitId ?? sanoq.unitId, ochiq: event.target.value })}
            onKeyDown={onKeyDown}
            aria-invalid={maydonXato || undefined}
            aria-label={t("inventarizatsiya.createModal.box.openAria", { name: mahsulotNomi, base: asosiyNomi })}
            className={maydon}
          />
        </label>
        <p data-korobka-jami className="col-span-3 flex h-10 items-center justify-end gap-1.5 whitespace-nowrap text-sm font-semibold text-slate-500 sm:col-span-1">
          =
          <b className={`tabular-nums ${natija.holat === "tayyor" ? "text-blue-700" : "text-slate-300"}`}>
            {natija.holat === "tayyor" ? sonKorinishi(natija.jami) : "—"}
          </b>
          {asosiyNomi}
        </p>
      </div>
      <p className="mt-2 text-[11px] font-medium text-slate-500">
        {natija.holat === "xato"
          ? <span className="font-bold text-amber-700">{t(natija.sabab === "butun" ? "inventarizatsiya.createModal.box.invalidWhole" : "inventarizatsiya.createModal.box.invalid", { base: asosiyNomi })}</span>
          : t("inventarizatsiya.createModal.box.hint", { unit: birlikNomi, koeff: birlik ? sonKorinishi(birlik.koeff) : "—", base: asosiyNomi })}
      </p>
    </div>
  );
}
