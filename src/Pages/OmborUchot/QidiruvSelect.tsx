import { useEffect, useMemo, useState, type ReactNode } from "react";

export type QidiruvVariant = { id: string; label: string; qoshimcha?: string };

type Props = {
  boshlangichMatn: string;
  variantlar: QidiruvVariant[];
  onTanlash: (variant: QidiruvVariant) => void;
  onErkinMatnOzgarishi?: (matn: string) => void;
  placeholder?: string;
  ikonka?: ReactNode;
  className?: string;
  inputClassName?: string;
};

export default function QidiruvSelect({
  boshlangichMatn,
  variantlar,
  onTanlash,
  onErkinMatnOzgarishi,
  placeholder,
  ikonka,
  className = "",
  inputClassName = "",
}: Props) {
  const [matn, setMatn] = useState(boshlangichMatn);
  const [ochiq, setOchiq] = useState(false);
  const erkinMatn = Boolean(onErkinMatnOzgarishi);

  useEffect(() => {
    setMatn(boshlangichMatn);
  }, [boshlangichMatn]);

  const natijalar = useMemo(() => {
    const soz = matn.trim().toLowerCase();
    if (!soz) return [];
    return variantlar.filter((variant) => variant.label.toLowerCase().includes(soz)).slice(0, 8);
  }, [variantlar, matn]);

  return (
    <div className={`relative ${className}`}>
      {ikonka && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {ikonka}
        </span>
      )}
      <input
        value={matn}
        onChange={(event) => {
          setMatn(event.target.value);
          onErkinMatnOzgarishi?.(event.target.value);
          setOchiq(true);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setOchiq(false);
            if (!erkinMatn) setMatn(boshlangichMatn);
          }, 150);
        }}
        placeholder={placeholder}
        className={`h-10 w-full rounded-lg border border-slate-200 bg-white text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100 ${
          ikonka ? "pl-9 pr-3" : "px-3"
        } ${inputClassName}`}
      />
      {ochiq && natijalar.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full min-w-[220px] overflow-y-auto rounded-xl border border-orange-100 bg-white shadow-xl">
          {natijalar.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setMatn(variant.label);
                onTanlash(variant);
                setOchiq(false);
              }}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm hover:bg-orange-50"
            >
              <span className="truncate font-bold text-gray-800">{variant.label}</span>
              {variant.qoshimcha && (
                <span className="shrink-0 text-xs text-gray-400">{variant.qoshimcha}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
