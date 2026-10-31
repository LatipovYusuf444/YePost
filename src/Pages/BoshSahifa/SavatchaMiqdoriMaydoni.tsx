import { useInventorySettingsStore } from "@/store/inventorySettingsStore";
import { useState } from "react";
import { savatchaMiqdoriniOqish } from "./savatchaMiqdori";

export default function SavatchaMiqdoriMaydoni({
  soni, qoldiq, label, onChange, nolMumkin = false, className,
}: {
  soni: number;
  qoldiq: number;
  label: string;
  onChange: (soni: number) => void;
  nolMumkin?: boolean;
  className?: string;
}) {
  const canSellNegative = useInventorySettingsStore((s) => s.canSellNegative);
  // Bo'sh/"0," kabi tugallanmagan matn savatchadagi oxirgi to'g'ri miqdorni o'zgartirmaydi.
  const [draft, setDraft] = useState<{ soni: number; matn: string } | null>(null);
  const matn = draft?.soni === soni ? draft.matn : String(soni);

  function ozgardi(value: string) {
    const natija = savatchaMiqdoriniOqish(value, qoldiq, nolMumkin, canSellNegative);
    if (!natija) return;
    setDraft({ soni: natija.soni ?? soni, matn: natija.matn });
    if (natija.soni !== undefined) onChange(natija.soni);
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      disabled={!canSellNegative && qoldiq <= 0}
      value={matn}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => ozgardi(event.target.value)}
      onBlur={() => setDraft(null)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className={className ?? "h-7 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 text-center text-sm font-bold tabular-nums text-[#0F172A] outline-none transition hover:border-gold-200 focus:border-gold-400 focus:bg-gold-50 focus:ring-2 focus:ring-gold-100"}
    />
  );
}
