import type { ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  Banknote,
  CalendarDays,
  CheckCircle2,
  FileText,
  Hash,
  Info,
  Landmark,
  Link2,
  MessageSquare,
  PencilLine,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { KassaAmaliyoti, KassaHolati, KassaKanali } from "./types";
import { partiyaTuri, sanaFormat, summaFormat } from "./yordamchilar";

const kanalIkonlari: Record<KassaKanali, typeof Banknote> = {
  naqd: Banknote,
  bank: Landmark,
  ilova: Smartphone,
};

const holatUslublari: Record<
  KassaHolati,
  { ikonka: typeof CheckCircle2; karta: string; nishon: string; matn: string }
> = {
  tasdiqlangan: {
    ikonka: CheckCircle2,
    karta: "border-emerald-200 bg-emerald-50/60",
    nishon: "bg-emerald-500 text-white shadow-emerald-200",
    matn: "text-emerald-700",
  },
  qoralama: {
    ikonka: PencilLine,
    karta: "border-amber-200 bg-amber-50/60",
    nishon: "bg-amber-500 text-white shadow-amber-200",
    matn: "text-amber-700",
  },
  bekor_qilingan: {
    ikonka: Ban,
    karta: "border-red-200 bg-red-50/60",
    nishon: "bg-red-500 text-white shadow-red-200",
    matn: "text-red-700",
  },
};

function boshHarflar(nom: string) {
  const sozlar = nom.trim().split(/\s+/).filter(Boolean);
  return (sozlar[0]?.[0] ?? "") + (sozlar[1]?.[0] ?? "");
}

type Props = { amaliyot: KassaAmaliyoti };

// Mavjud kassa amaliyotini ko'rish (faqat o'qish): summa, tur, kontragent, mas'ul, holat va izoh bir qarashda.
// Yangi amaliyot yaratish va qoralamani tahrirlash formasi alohida (KassaAmaliyotModal) — bu yerda hech narsa o'zgartirilmaydi.
export default function KassaAmaliyotKorinishi({ amaliyot }: Props) {
  const { t } = useTranslation("kassa_uchot");
  const tushum = amaliyot.yonalish === "tushum";
  const holat: KassaHolati = amaliyot.holat ?? "tasdiqlangan";
  const holatUslubi = holatUslublari[holat];
  const HolatIkonka = holatUslubi.ikonka;
  const KanalIkonka = kanalIkonlari[amaliyot.kanal];
  const partiya = partiyaTuri(amaliyot.turi);
  const kontragentNomi =
    partiya === "xaridor" || amaliyot.turi === "donalik_savdo"
      ? t("view.customer")
      : partiya === "xodim"
        ? t("view.employee")
        : partiya === "yetkazib"
          ? t("view.supplier")
          : tushum
            ? t("table.kontragentFrom")
            : t("table.kontragentTo");
  const kontragent = amaliyot.kontragent.trim();
  const manba = amaliyot.backendSource;
  const manbaIzohi = manba === "SALE" || manba === "RETURN" ? t(`view.sourceHint.${manba}`) : "";
  const nomKorsatilsinmi = Boolean(amaliyot.nomi.trim()) && amaliyot.nomi.trim() !== amaliyot.raqam.trim();
  const izoh = amaliyot.izoh.trim();

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
      {/* Chap: summa va ma'lumotlar */}
      <div className="min-w-0 space-y-5">
        <section
          className={`overflow-hidden rounded-[26px] border p-5 shadow-sm sm:p-6 ${
            tushum
              ? "border-emerald-100 bg-linear-to-br from-emerald-50 via-white to-white"
              : "border-red-100 bg-linear-to-br from-red-50 via-white to-white"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2.5">
              <span
                aria-hidden
                className={`flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md ${
                  tushum ? "bg-emerald-500 shadow-emerald-200" : "bg-red-500 shadow-red-200"
                }`}
              >
                {tushum ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
              </span>
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                {tushum ? t("view.amountIncome") : t("view.amountExpense")}
              </span>
            </span>
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-black tabular-nums text-slate-700 ring-1 ring-slate-200">
              <Hash size={13} aria-hidden className="shrink-0 text-slate-400" />
              <span className="truncate">{amaliyot.raqam}</span>
            </span>
          </div>

          <p
            className={`mt-4 break-words text-3xl font-black tabular-nums tracking-tight sm:text-[40px] sm:leading-tight ${
              tushum ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {tushum ? "+" : "−"} {summaFormat(amaliyot.summa)}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-xs font-extrabold text-[#2563EB] ring-1 ring-orange-100">
              {t(`types.${amaliyot.turi}`)}
            </span>
          </div>
        </section>

        <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
          <KartaSarlavhasi ikonka={<FileText size={18} />} matn={t("view.detailsTitle")} />
          <div className="grid gap-3 sm:grid-cols-2">
            {nomKorsatilsinmi && (
              <Qator ikonka={<FileText size={17} />} nom={t("view.name")}>
                {amaliyot.nomi}
              </Qator>
            )}
            <Qator ikonka={<UserRound size={17} />} nom={kontragentNomi}>
              {kontragent ? (
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-black uppercase text-[#2563EB]"
                  >
                    {boshHarflar(kontragent)}
                  </span>
                  <span className="min-w-0 break-words">{kontragent}</span>
                </span>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </Qator>
            <Qator ikonka={<ShieldCheck size={17} />} nom={t("modal.responsibleLabel")}>
              {amaliyot.masul || <span className="text-slate-400">—</span>}
            </Qator>
            <Qator ikonka={<CalendarDays size={17} />} nom={tushum ? t("modal.incomeDateLabel") : t("modal.expenseDateLabel")}>
              <span className="tabular-nums">{sanaFormat(amaliyot.sana)}</span>
            </Qator>
            <Qator ikonka={<KanalIkonka size={17} />} nom={t("modal.paymentTypeLabel")}>
              {t(`channels.${amaliyot.kanal}`)}
            </Qator>
          </div>
        </section>
      </div>

      {/* O'ng: holat, izoh */}
      <div className="min-w-0 space-y-5">
        <section className={`rounded-[26px] border p-5 shadow-sm ${holatUslubi.karta}`}>
          <div className="flex items-center gap-3.5">
            <span
              aria-hidden
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-md ${holatUslubi.nishon}`}
            >
              <HolatIkonka size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{t("view.statusTitle")}</p>
              <p className={`text-lg font-black ${holatUslubi.matn}`}>{t(`view.status.${holat}`)}</p>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{t(`view.statusHint.${holat}`)}</p>

          {manba && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-white/80 p-3.5 ring-1 ring-white">
              <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#2563EB] shadow-sm ring-1 ring-orange-100">
                <Link2 size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{t("view.sourceTitle")}</p>
                <p className="mt-0.5 text-sm font-extrabold text-slate-900">{t(`view.source.${manba}`)}</p>
                {manbaIzohi && (
                  <p className="mt-1 flex items-start gap-1.5 text-xs font-semibold leading-5 text-slate-500">
                    <Info size={13} aria-hidden className="mt-0.5 shrink-0 text-slate-400" />
                    {manbaIzohi}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
          <KartaSarlavhasi ikonka={<MessageSquare size={18} />} matn={t("modal.commentTitle")} />
          {izoh ? (
            <p className="whitespace-pre-wrap break-words rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-slate-100">
              {izoh}
            </p>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm font-semibold text-slate-400">
              {t("view.noComment")}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function KartaSarlavhasi({ ikonka, matn }: { ikonka: ReactNode; matn: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-orange-100 pb-3">
      <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[#2563EB]">
        {ikonka}
      </span>
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">{matn}</h3>
    </div>
  );
}

function Qator({ ikonka, nom, children }: { ikonka: ReactNode; nom: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-slate-50/70 p-3.5 ring-1 ring-slate-100">
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#2563EB] shadow-sm ring-1 ring-orange-100">
        {ikonka}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{nom}</p>
        <div className="mt-0.5 break-words text-sm font-extrabold text-slate-900">{children}</div>
      </div>
    </div>
  );
}
