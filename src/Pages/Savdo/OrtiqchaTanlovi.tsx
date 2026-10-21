import type { ReactNode } from "react";
import { Banknote, Info, TriangleAlert, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";

type TanlovKartasiProps = {
  tanlangan: boolean;
  nom: string;
  tavsif: string;
  ikonka: ReactNode;
  mumkin?: boolean;
  onTanlash: () => void;
};

// Bitta tanlov: radio tugma va tushuntirish. Karta to'liq bosiladi (label); tanlangani ko'k hoshiya bilan ajralib turadi.
function TanlovKartasi({ tanlangan, nom, tavsif, ikonka, mumkin = true, onTanlash }: TanlovKartasiProps) {
  return (
    <label
      className={`relative flex gap-3 rounded-2xl border p-4 transition ${
        !mumkin
          ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
          : tanlangan
            ? "cursor-pointer border-[#2563EB] bg-blue-50/70 shadow-[0_8px_22px_rgba(37,99,235,.12)] ring-2 ring-blue-100"
            : "cursor-pointer border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30"
      }`}
    >
      <input
        type="radio"
        name="ortiqcha-tolov"
        checked={tanlangan}
        disabled={!mumkin}
        onChange={onTanlash}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          tanlangan && mumkin ? "bg-[#2563EB] text-white shadow-sm" : "bg-slate-100 text-slate-500"
        }`}
      >
        {ikonka}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-black leading-5 text-slate-900">{nom}</span>
          <span
            aria-hidden
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
              tanlangan && mumkin ? "border-[#2563EB]" : "border-slate-300"
            }`}
          >
            {tanlangan && mumkin && <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" />}
          </span>
        </span>
        <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">{tavsif}</span>
      </span>
      <span className="pointer-events-none absolute inset-0 rounded-2xl peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#2563EB]" />
    </label>
  );
}

type OrtiqchaTanloviProps = {
  // "tasdiqlangan": tasdiqlangan sotuvga keyingi naqd to'lov (qarz yopiladi, ortgani qaytim yoki hisobga).
  // "qoralama": qoralamadagi mijozli sotuvda chekdan ortiq pul (eski qarzlar yopilgach qolgani).
  rejim: "tasdiqlangan" | "qoralama";
  hisobgaYozish: boolean;
  onOzgarish: (hisobgaYozish: boolean) => void;
  /** Sotuv valyutasidagi ortiqcha: "339 000 so'm" yoki "$12.5". */
  ortiqchaMatni: string;
  /** Mijozga beriladigan qaytim so'mda (taxminiy); hisoblab bo'lmasa bo'sh. Faqat tasdiqlangan sotuvda. */
  qaytimMatni?: string;
  /** Mijoz hisobiga yozish faqat mijozli sotuvda mumkin. */
  mijozBor: boolean;
  /** Dollar qatnashganda qaytimni mingtagacha yaxlitlash belgisi ko'rsatiladi. */
  yaxlitlashKorsatilsin?: boolean;
  yaxlitlash?: boolean;
  onYaxlitlash?: (qiymat: boolean) => void;
};

// Qarzdan ortiq to'lov: "Qaytimni kassadan berish" yoki "Qaytimni mijozning hisobiga o'tkazish" (backend `keepExcess: true`).
export default function OrtiqchaTanlovi({
  rejim,
  hisobgaYozish,
  onOzgarish,
  ortiqchaMatni,
  qaytimMatni,
  mijozBor,
  yaxlitlashKorsatilsin = false,
  yaxlitlash = true,
  onYaxlitlash,
}: OrtiqchaTanloviProps) {
  const { t } = useTranslation("savdo_tafsilot");
  const tasdiqlangan = rejim === "tasdiqlangan";
  const hisobga = hisobgaYozish && mijozBor;
  const qaytimSummasi = qaytimMatni || ortiqchaMatni;

  return (
    <fieldset className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 sm:p-5">
      <legend className="flex items-center gap-1.5 px-1.5 text-xs font-black uppercase tracking-wide text-slate-500">
        <Info size={14} aria-hidden className="text-[#2563EB]" />
        {t(tasdiqlangan ? "tolovModal.ortiqcha.sarlavha" : "tolovModal.ortiqchaSarlavha", { summa: ortiqchaMatni })}
      </legend>
      <p className="mb-3 text-xs font-semibold leading-5 text-slate-500">
        {t(tasdiqlangan ? "tolovModal.ortiqcha.savol" : "tolovModal.ortiqchaIzoh")}
      </p>

      <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
        <TanlovKartasi
          tanlangan={!hisobga}
          nom={t(tasdiqlangan ? "tolovModal.ortiqcha.qaytim.nom" : "tolovModal.ortiqchaQaytim")}
          tavsif={t(tasdiqlangan ? "tolovModal.ortiqcha.qaytim.tavsif" : "tolovModal.ortiqcha.qaytim.tavsifQoralama", { summa: qaytimSummasi })}
          ikonka={<Banknote size={19} />}
          onTanlash={() => onOzgarish(false)}
        />
        <TanlovKartasi
          tanlangan={hisobga}
          nom={t(tasdiqlangan ? "tolovModal.ortiqcha.hisobga.nom" : "tolovModal.ortiqchaHisobga")}
          tavsif={t(tasdiqlangan ? "tolovModal.ortiqcha.hisobga.tavsif" : "tolovModal.ortiqcha.hisobga.tavsifQoralama", { summa: ortiqchaMatni })}
          ikonka={<Wallet size={19} />}
          mumkin={mijozBor}
          onTanlash={() => onOzgarish(true)}
        />
      </div>

      {!mijozBor && (
        <p className="mt-3 flex items-start gap-1.5 text-xs font-semibold leading-5 text-amber-700">
          <TriangleAlert size={14} aria-hidden className="mt-0.5 shrink-0" />
          {t("tolovModal.ortiqcha.hisobgaMijozsiz")}
        </p>
      )}

      {yaxlitlashKorsatilsin && !hisobga && onYaxlitlash && (
        <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl bg-white/80 px-3.5 py-3 ring-1 ring-sky-100">
          <input
            type="checkbox"
            checked={yaxlitlash}
            onChange={(event) => onYaxlitlash(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#2563EB]"
          />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-slate-700">{t("tolovModal.ortiqcha.yaxlitlash")}</span>
            <span className="mt-0.5 block text-xs font-medium leading-5 text-slate-500">{t("tolovModal.ortiqcha.yaxlitlashIzoh")}</span>
          </span>
        </label>
      )}

      {tasdiqlangan && !hisobga && qaytimMatni && (
        <p className="mt-3 text-xs font-semibold leading-5 text-slate-400">{t("tolovModal.ortiqcha.taxminiy")}</p>
      )}
    </fieldset>
  );
}
