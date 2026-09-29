const KOD = "+998";

function raqamlarniAjratish(qiymat: string) {
  let raqamlar = (qiymat || "").replace(/\D/g, "");
  if (raqamlar.startsWith("998")) raqamlar = raqamlar.slice(3);
  return raqamlar.slice(0, 9);
}

function guruhlarGaBolish(raqamlar: string) {
  return [raqamlar.slice(0, 2), raqamlar.slice(2, 5), raqamlar.slice(5, 7), raqamlar.slice(7, 9)]
    .filter(Boolean)
    .join(" ");
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
};

// O'zbekiston telefon raqami uchun: doimiy "+998" kodi va "XX XXX XX XX"
// guruhlab formatlash bilan. Backendga esa har doim "+998XXXXXXXXX"
// (bo'shliqsiz) ko'rinishida, avvalgi input bilan bir xil formatda beriladi.
export default function PhoneInput({
  value,
  onChange,
  id,
  className = "",
  disabled = false,
  invalid = false,
  placeholder = "88 888 88 88",
}: Props) {
  const raqamlar = raqamlarniAjratish(value);
  const korinish = guruhlarGaBolish(raqamlar);

  function ozgarish(event: React.ChangeEvent<HTMLInputElement>) {
    const yangiRaqamlar = raqamlarniAjratish(event.target.value);
    onChange(yangiRaqamlar ? `${KOD}${yangiRaqamlar}` : "");
  }

  return (
    <div
      className={`flex items-stretch overflow-hidden rounded-xl border bg-white transition-colors ${
        invalid
          ? "border-red-400 ring-4 ring-red-100"
          : "border-slate-200 focus-within:border-[#2563EB] focus-within:ring-4 focus-within:ring-orange-100"
      } ${disabled ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-70" : ""} ${className}`}
    >
      <span
        className={`flex shrink-0 select-none items-center border-r px-3 text-sm font-bold tabular-nums ${
          disabled ? "border-slate-100 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"
        }`}
      >
        {KOD}
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={korinish}
        onChange={ozgarish}
        disabled={disabled}
        aria-invalid={invalid}
        placeholder={placeholder}
        className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold tabular-nums text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
      />
    </div>
  );
}
