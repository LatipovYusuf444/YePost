import { useState, type ClipboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { OZBEKISTON, TELEFON_DAVLATLARI, davlatKodBilan, kiritilganTelefon, kodBilanBoshlanadi, kodYozilmoqda, milliyKorinish, telefonQiymati, telefonniAjratish, toliqRaqamShakli, type TelefonDavlati } from "@/lib/telefon";

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
  // Raqam maydonining nomi (ekran o'quvchi uchun): o'rab turgan <label> birinchi bo'lib davlat tanlovini nomlaydi.
  ariaLabel?: string;
};

// Har davlat uchun namuna (placeholder): kod tanlanganda raqam uzunligi va ko'rinishi shunga mos.
const NAMUNALAR: Record<string, string> = { "998": "90 123 45 67", "7": "912 345 67 89", "993": "61 234567", "992": "93 123 4567", "93": "70 123 4567", "996": "555 123 456" };

/**
 * Xalqaro telefon maydoni (backend 18.11 / 19.11): davlat kodi tanlanadi — +998, +7, +993, +992, +93, +996; raqam uzunligi va ko'rinishi
 * tanlangan davlatga mos. Mijoz, yetkazib beruvchi, mijoz kompaniyasi, xodim, filial, kompaniya va profil telefonlarida.
 * Qiymat "+<kod><raqam>" (bo'shliqsiz).
 */
export default function XalqaroTelefon({ value, onChange, id, className = "", disabled = false, invalid = false, ariaLabel }: Props) {
  const { t } = useTranslation("common");
  const ajratilgan = telefonniAjratish(value);
  // Tanlangan davlat: qiymatdan (to'ldirilgan bo'lsa), bo'sh maydonda — foydalanuvchi tanlagani.
  const [tanlanganKod, setTanlanganKod] = useState(ajratilgan.davlat.kod);
  const davlat = value ? ajratilgan.davlat : davlatKodBilan(tanlanganKod);
  const milliy = value ? ajratilgan.milliy : "";
  // "+", "+9", "+99" qo'lda yozilayotganda (kod hali to'liq emas) maydonda ko'rinib turadi; kod to'lganda davlat tanloviga o'tadi.
  const [qoralama, setQoralama] = useState<string | null>(null);

  function saqlash(yangi: TelefonDavlati, raqam: string) {
    setQoralama(null);
    setTanlanganKod(yangi.kod);
    onChange(telefonQiymati(yangi, raqam));
  }

  function raqamOzgardi(event: React.ChangeEvent<HTMLInputElement>) {
    const matn = event.target.value;
    const raqamlar = matn.replace(/\D/g, "");
    if (matn.trim().startsWith("+")) {
      // "+7 912 …" — kod to'liq: davlat shundan.
      if (kodBilanBoshlanadi(raqamlar)) {
        const toliq = telefonniAjratish(matn);
        saqlash(toliq.davlat, toliq.milliy);
        return;
      }
      // "+99" — kod yozilmoqda: davlat va qiymat hali o'zgarmaydi, "+" yo'qolmaydi.
      if (kodYozilmoqda(matn)) {
        setQoralama(matn.trim());
        if (value) onChange("");
        return;
      }
      // Hech bir kodga mos kelmaydi ("+90…") — "+" e'tiborsiz, raqamlar tanlangan davlatda.
    }
    if (raqamlar.length > davlat.uzunlik) {
      // Avto-to'ldirish yoki bir yo'la kiritilgan to'liq raqam ("998901234567", "79123456789"), O'zbekistonda "0" + 9 ta raqam.
      // Bitta ortiqcha raqam yozilganda raqam boshqa davlatga "sakrab" ketmasligi uchun faqat shu holatlarda.
      const toliq = toliqRaqamShakli(raqamlar);
      const birYola = raqamlar.length - milliy.length >= 2;
      const nolBilan = davlat === OZBEKISTON && raqamlar.length === 10 && raqamlar.startsWith("0");
      if (toliq && (birYola || nolBilan)) {
        saqlash(toliq.davlat, toliq.milliy);
        return;
      }
    }
    saqlash(davlat, raqamlar.slice(0, davlat.uzunlik));
  }

  function yopishtirildi(event: ClipboardEvent<HTMLInputElement>) {
    const matn = event.clipboardData.getData("text");
    const raqamlar = matn.replace(/\D/g, "");
    // Butun raqam yopishtirilsa ("+7 912…", "998 90 …", "0901234567") — maydon shu raqam bilan almashadi; qisqa bo'lak — oddiy yopishtirish.
    if (!raqamlar || (!matn.trim().startsWith("+") && raqamlar.length < davlat.uzunlik)) return;
    event.preventDefault();
    const natija = kiritilganTelefon(matn, davlat);
    saqlash(natija.davlat, natija.milliy);
  }

  function davlatOzgardi(kod: string) {
    const yangi = davlatKodBilan(kod);
    saqlash(yangi, milliy.slice(0, yangi.uzunlik));
  }

  return (
    <div
      data-telefon-xalqaro
      className={`flex items-stretch overflow-hidden rounded-xl border bg-white transition-colors ${
        invalid
          ? "border-red-400 ring-4 ring-red-100"
          : "border-slate-200 focus-within:border-[#2563EB] focus-within:ring-4 focus-within:ring-orange-100"
      } ${disabled ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-70" : ""} ${className}`}
    >
      <select
        value={davlat.kod}
        disabled={disabled}
        aria-label={t("phone.countryCode")}
        onChange={(event) => davlatOzgardi(event.target.value)}
        className={`shrink-0 cursor-pointer border-r bg-slate-50 pl-2.5 pr-1 text-sm font-bold tabular-nums text-slate-600 outline-none ${disabled ? "border-slate-100 text-slate-400" : "border-slate-200"}`}
      >
        {TELEFON_DAVLATLARI.map((item) => <option key={item.kod} value={item.kod}>{`+${item.kod} ${item.qisqa}`}</option>)}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={qoralama ?? milliyKorinish(davlat, milliy)}
        onChange={raqamOzgardi}
        onPaste={yopishtirildi}
        onBlur={() => setQoralama(null)}
        aria-label={ariaLabel}
        disabled={disabled}
        aria-invalid={invalid}
        placeholder={NAMUNALAR[davlat.kod]}
        className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold tabular-nums text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
      />
    </div>
  );
}
