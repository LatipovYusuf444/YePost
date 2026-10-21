import { useLayoutEffect, useReducer, useRef, type ChangeEvent, type FocusEvent, type InputHTMLAttributes } from "react";
import { kursorOrni, maydonOzgarishi, nolmi, sonniGuruhlash, sonniTozalash } from "@/lib/sonFormatlash";

// "12." va "12" bir xil son: ota komponent qiymatni songa aylantirib qaytarsa ham, yozilayotgan nuqta/nol yo'qolmaydi.
const birXilSon = (a: string, b: string) => a === b || (a !== "" && b !== "" && Number(a) === Number(b));

type SummaMaydoniProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "inputMode" | "min" | "max" | "step"> & {
  /** Toza raqam matni ("30000000", "1234.5") yoki son; ko'rinishda "30 000 000" bo'lib guruhlanadi. */
  value: string | number | null | undefined;
  /** Toza raqam matni (guruh bo'shliqlarisiz) qaytadi — holatga to'g'ridan-to'g'ri yozish mumkin. */
  onChange: (qiymat: string) => void;
  /** Kasr xonalari (standart 2); 0 — faqat butun son. */
  kasr?: number;
};

// Summa kiritish maydoni: yozayotganda raqamlar uchtadan guruhlanadi (30 000 000), kursor joyida qoladi, holatda esa toza raqam saqlanadi.
export default function SummaMaydoni({ value, onChange, onBlur, kasr = 2, ...boshqa }: SummaMaydoniProps) {
  const maydon = useRef<HTMLInputElement | null>(null);
  const kursorSoni = useRef<number | null>(null);
  const yozilgan = useRef<string | null>(null);
  const [, qaytaChizish] = useReducer((son: number) => son + 1, 0);
  const ota = sonniTozalash(value === null || value === undefined ? "" : String(value), kasr);
  // Foydalanuvchi yozayotgan matn (masalan "12." yoki "0.5") ota qiymat bilan bir xil son bo'lsa, o'sha ko'rinadi.
  // Aks holda boshlang'ich yoki o'chirilgan nol ("0") ko'rsatilmaydi: maydon bo'sh turadi va faqat placeholder ko'rinadi.
  const yozgan = yozilgan.current;
  const joriyToza = yozgan !== null && yozgan !== "" && birXilSon(yozgan, ota) ? yozgan : nolmi(ota) ? "" : ota;
  const korinish = sonniGuruhlash(joriyToza);

  // Qiymat yangilangach kursor foydalanuvchi yozgan joyda qoladi (guruh bo'shliqlari qo'shilsa-da, siljimaydi).
  useLayoutEffect(() => {
    const element = maydon.current;
    const soni = kursorSoni.current;
    kursorSoni.current = null;
    if (!element || soni === null || document.activeElement !== element) return;
    const joy = kursorOrni(element.value, soni);
    element.setSelectionRange(joy, joy);
  });

  function ozgardi(event: ChangeEvent<HTMLInputElement>) {
    const element = event.currentTarget;
    const natija = maydonOzgarishi({
      yozilgan: element.value,
      kursor: element.selectionStart ?? element.value.length,
      joriyToza,
      joriyKorinish: korinish,
      kasr,
    });
    // Maydon bo'shatilsa kursor oxirida qoladi (ota qiymat bo'shni "0" ga aylantirsa ham, yangi raqamlar "0" dan keyin yoziladi).
    kursorSoni.current = natija.toza === "" ? null : natija.kursordanOldin;
    yozilgan.current = natija.toza;
    onChange(natija.toza);
    // Ota qiymat o'zgarmasa ("12." → son 12) qayta chizilmaydi va brauzer yozilgan nuqtani qaytarib olardi: o'zimiz qayta chizamiz.
    qaytaChizish();
  }

  // Maydondan chiqilganda yozilayotgan shakl ("12.") tashlanadi — ota qiymat ko'rinadi.
  function fokusYoqoldi(event: FocusEvent<HTMLInputElement>) {
    if (yozilgan.current !== null) {
      yozilgan.current = null;
      qaytaChizish();
    }
    onBlur?.(event);
  }

  return (
    <input
      {...boshqa}
      ref={maydon}
      type="text"
      inputMode={kasr > 0 ? "decimal" : "numeric"}
      autoComplete="off"
      value={korinish}
      onChange={ozgardi}
      onBlur={fokusYoqoldi}
    />
  );
}
