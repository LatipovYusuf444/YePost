import { useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { useTranslation } from "react-i18next";

export type SkanNatijasi = { xato: boolean; matn: string } | null;

type Props = {
  // Kod to'liq yozilgach (Enter) chaqiriladi; natija maydon ostida ko'rsatiladi.
  onSkan: (kod: string) => SkanNatijasi;
  // Matn maydonining sinflari (sahifadagi boshqa maydonlar bilan bir xil ko'rinish uchun).
  inputClassName: string;
};

// Shtrix-kod skaneri uchun maydon: skaner kod + Enter yuboradi. Enter hech qachon boshqa amalni ishga tushirmaydi,
// muvaffaqiyatda maydon tozalanadi va fokus qoladi (keyingi skanga tayyor), xatoda kod belgilanadi (keyingi skan uni almashtiradi).
export default function ShtrixKodMaydoni({ onSkan, inputClassName }: Props) {
  const { t } = useTranslation("ombor_kichik");
  const [qiymat, setQiymat] = useState("");
  const [xabar, setXabar] = useState<SkanNatijasi>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function yuborish() {
    const kod = qiymat.trim();
    if (!kod) return;
    const natija = onSkan(kod);
    setXabar(natija);
    if (natija?.xato) inputRef.current?.select();
    else setQiymat("");
    inputRef.current?.focus();
  }

  return (
    <div>
      <div className="relative">
        <ScanLine size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          value={qiymat}
          onChange={(event) => setQiymat(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            event.stopPropagation();
            if (!event.nativeEvent.isComposing) yuborish();
          }}
          autoComplete="off"
          placeholder={t("shtrixKod.placeholder")}
          aria-label={t("shtrixKod.ariaLabel")}
          className={`${inputClassName} pl-10`}
        />
      </div>
      {xabar && (
        <p role="status" className={`mt-2 text-xs font-bold ${xabar.xato ? "text-red-600" : "text-emerald-600"}`}>
          {xabar.matn}
        </p>
      )}
    </div>
  );
}
