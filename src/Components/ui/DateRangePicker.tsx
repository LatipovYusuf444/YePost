import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ru, uz } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarDays, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/Components/ui/popover";
import { Calendar } from "@/Components/ui/calendar";
import { Button } from "@/Components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  className?: string;
  compact?: boolean;
};

function toKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromKey(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function shiftDay(amount: number) {
  const date = new Date();
  date.setDate(date.getDate() + amount);
  return toKey(date);
}

// Ombor va savdo sahifalaridagi barcha sana-oraliq filtrlari uchun yagona,
// shadcn/react-day-picker asosidagi haqiqiy kalendar. Backendda sana bo'yicha
// so'rov parametri yo'q — filtr to'liq client tomonda ishlaydi.
export default function DateRangePicker({ from, to, onChange, className = "", compact = false }: Props) {
  const { t, i18n } = useTranslation("common");
  const kalendarTili = i18n.resolvedLanguage === "ru" ? ru : uz;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>({ from: fromKey(from), to: fromKey(to) });

  useEffect(() => {
    if (open) setDraft({ from: fromKey(from), to: fromKey(to) });
  }, [open, from, to]);

  const tanlangan = Boolean(from || to);

  const label = useMemo(() => {
    const fromDate = fromKey(from);
    const toDate = fromKey(to);
    if (!fromDate && !toDate) return t("dateRange.placeholder");
    if (fromDate && toDate && from !== to) return `${format(fromDate, "dd.MM.yyyy")} – ${format(toDate, "dd.MM.yyyy")}`;
    return format(fromDate ?? toDate!, "dd.MM.yyyy");
  }, [from, to, t]);

  // Bitta kunni tanlash uchun shu kunni ikkinchi marta bosishadi, kalendar esa buni tanlovni bekor qilish deb
  // hisoblaydi (filtr butunlay tozalanib, barcha hujjatlar ko'rinib qolardi) — uni bir kunlik oraliq qilamiz.
  function kunniTanlash(range: DateRange | undefined, bosilganKun: Date) {
    const bittaKun = draft?.from && (!draft.to || toKey(draft.to) === toKey(draft.from));
    if (!range && bittaKun && toKey(bosilganKun) === toKey(draft.from!)) {
      setDraft({ from: bosilganKun, to: bosilganKun });
      return;
    }
    setDraft(range);
  }

  function qollash() {
    onChange(draft?.from ? toKey(draft.from) : "", draft?.to ? toKey(draft.to) : draft?.from ? toKey(draft.from) : "");
    setOpen(false);
  }

  function tezOraliq(startOffset: number) {
    setDraft({ from: fromKey(shiftDay(startOffset)), to: fromKey(shiftDay(0)) });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          aria-label={t("dateRange.ariaLabel")}
          className={cn(
            "w-full cursor-pointer justify-between rounded-xl bg-primary px-3 font-bold text-primary-foreground shadow-sm hover:bg-primary/90",
            compact ? "h-10 text-sm" : "h-11 text-sm",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarDays size={16} className="shrink-0" />
            <span className="truncate">{label}</span>
          </span>
          {tanlangan && (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                onChange("", "");
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.stopPropagation();
                event.preventDefault();
                onChange("", "");
              }}
              aria-label={t("dateRange.clearChip")}
              className="cursor-pointer rounded-full p-0.5 opacity-80 transition hover:bg-white/20 hover:opacity-100"
            >
              <X size={14} />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={draft}
          onSelect={(range, bosilganKun) => kunniTanlash(range, bosilganKun)}
          defaultMonth={draft?.to ?? draft?.from ?? new Date()}
          locale={kalendarTili}
          className="[--cell-size:--spacing(8)]"
        />
        <div className="flex flex-wrap gap-1.5 border-t border-border pt-3 text-xs font-bold">
          <button type="button" onClick={() => tezOraliq(0)} className="cursor-pointer rounded-lg bg-muted px-2.5 py-1.5 text-primary hover:bg-muted/70">
            {t("dateRange.today")}
          </button>
          <button type="button" onClick={() => tezOraliq(-6)} className="cursor-pointer rounded-lg bg-muted px-2.5 py-1.5 text-primary hover:bg-muted/70">
            {t("dateRange.last7Days")}
          </button>
          <button type="button" onClick={() => tezOraliq(-29)} className="cursor-pointer rounded-lg bg-muted px-2.5 py-1.5 text-primary hover:bg-muted/70">
            {t("dateRange.last30Days")}
          </button>
          <button
            type="button"
            onClick={() => setDraft(undefined)}
            disabled={!draft?.from && !draft?.to}
            className="ml-auto cursor-pointer rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("dateRange.clear")}
          </button>
        </div>
        <Button type="button" onClick={qollash} className="mt-3 w-full cursor-pointer">
          {t("dateRange.apply")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
