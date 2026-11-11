import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, CalendarDays, CheckCircle2, ChevronDown, CreditCard, FileText, Landmark, PenLine, UserCheck, UserRound, Wallet } from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useTolovTahririRuxsati } from "@/hooks/useTolovTahririRuxsati";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import { bugungiToshkentKuni, kunMatni, toshkentKuni, vaqtMatni } from "@/lib/hujjatSanasi";
import { qaytimMatni, qaytimValyutasi, tolovlarQaytimi } from "@/lib/tolovOrtiqchasi";
import { useValyutaStore, type Valyuta } from "@/lib/valyuta";
import type { Sotuv, SotuvTolovi, TolovTuri } from "@/types/savdo";
import TolovTahriri from "./TolovTahriri";
import {
  masulNomi,
  pulniFormatlash,
  sotuvRaqami,
  sotuvSummasi,
  sotuvValyutasi,
  tolovFoizi,
  tolovSotuvValyutasida,
  tolovTuriMatni,
  tolovValyutasi,
} from "./savdoYordamchilari";

type TolovQatori = {
  tolov: SotuvTolovi;
  raqam: string;
  sana?: string;
};

// Backend to'lov sanasini qaysi nom bilan qaytarishidan qat'i nazar o'qiymiz: kassir yozgan sana (date/paidAt) bo'lsa shu, aks holda kiritilgan vaqt.
// Bir valyutali rejim valyutasi (`useYagonaValyuta()` bilan bir xil): ikki valyuta rejimida yoki rejim noma'lum bo'lsa — null.
function useRejimValyutasi(): Valyuta | null {
  return useValyutaStore((holat): Valyuta | null =>
    holat.rejimYoniq ? null : holat.rejim === "USD_ONLY" ? "USD" : holat.rejim === "UZS_ONLY" ? "UZS" : null
  );
}

function tolovSanasi(tolov: SotuvTolovi) {
  return tolov.date ?? tolov.paidAt ?? tolov.createdAt;
}

// To'lov kuni Toshkent vaqti bo'yicha olinadi. O'tgan kunga yozilgan to'lov o'sha kunning 23:59:59 bilan saqlanadi (vaqti ma'nosiz),
// shuning uchun faqat kun ko'rsatiladi; bugungi to'lovda kiritilgan vaqt ham ko'rsatiladi.
function tolovSanasiMatni(value?: string) {
  const kun = kunMatni(value);
  if (!kun) return "";
  return toshkentKuni(value) === bugungiToshkentKuni() ? vaqtMatni(value) || kun : kun;
}

function qatorlarniYigish(sotuv: Sotuv): TolovQatori[] {
  return (sotuv.payments ?? [])
    .filter((tolov) => Number(tolov.amount) > 0)
    .map((tolov, index) => ({ tolov, raqam: `${sotuvRaqami(sotuv)}/${index + 1}`, sana: tolovSanasi(tolov) }));
}

// Kelishuv kartasidagi "To'lov" qatorlari: havola + amallar + holat belgisi.
// Havola bosilsa shu to'lovning ma'lumotlari ochiladi.
export default function SotuvTolovlari({ sotuv, mijoz }: { sotuv: Sotuv; mijoz: string }) {
  const { t } = useTranslation("savdo_tafsilot");
  const [tanlangan, setTanlangan] = useState<(TolovQatori & { tahrir?: boolean }) | null>(null);
  const tahrirCheklovi = useTolovTahririRuxsati();
  const qatorlar = qatorlarniYigish(sotuv);
  // Qaytim odatda so'mda; bir valyutali rejimda sotuv rejim valyutasida bo'lsa — shu valyutada.
  const qaytimVal = qaytimValyutasi(sotuvValyutasi(sotuv), useRejimValyutasi());

  // Tahrirlash zanjiri (bekor qilish → tiklash → qayta tasdiqlash) paytida to'lovlar ro'yxati vaqtincha bo'sh ko'rinishi mumkin: ochiq oyna yo'qolmasligi kerak.
  if (qatorlar.length === 0 && !tanlangan) return null;

  return (
    <>
      {qatorlar.length > 0 && (
      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">{t("tolovQatori.sarlavha")}</p>
        <div className="space-y-2">
        {qatorlar.map((qator) => {
          const sanaMatni = kunMatni(qator.sana);
          const qarz = qator.tolov.paymentType === "DEBT";
          const cheklov = tahrirCheklovi(sotuv, qator.tolov);
          const qaytim = tolovlarQaytimi([qator.tolov]);
          return (
            <div
              key={qator.tolov.id ?? qator.raqam}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl bg-white px-3.5 py-3 ring-1 ring-slate-100"
            >
              <button
                type="button"
                onClick={() => setTanlangan(qator)}
                className="min-w-0 text-left text-sm font-medium text-[#2563EB] transition hover:text-[#1D4ED8] hover:underline"
              >
                {t("tolovQatori.nomi", { raqam: qator.raqam })}
                {sanaMatni ? ` — ${sanaMatni}` : ""} ({t("tolovQatori.summa", { summa: pulniFormatlash(qator.tolov.amount, tolovValyutasi(qator.tolov, sotuv)) })})
              </button>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {qaytim.qaytim > 0 && (
                  <span className="inline-flex h-6 items-center gap-1 rounded-full bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                    <Banknote size={12} />
                    {t("tolovQatori.qaytim", { summa: qaytimMatni(qaytim.qaytim, qaytimVal, t("tolovModal.somBelgisi")) })}
                  </span>
                )}
                {qaytim.hisobga > 0 && (
                  <span className="inline-flex h-6 items-center gap-1 rounded-full bg-sky-50 px-2.5 text-[11px] font-bold text-sky-700 ring-1 ring-sky-100">
                    <Wallet size={12} />
                    {t("tolovQatori.hisobga", { summa: pulniFormatlash(qaytim.hisobga, sotuvValyutasi(sotuv)) })}
                  </span>
                )}
                {(qator.tolov.fromAccount || qator.tolov.cashOperationId) && (
                  <span className="inline-flex h-6 items-center gap-1 rounded-full bg-violet-50 px-2.5 text-[11px] font-bold text-violet-700 ring-1 ring-violet-100">
                    <Wallet size={12} />
                    {t(qator.tolov.fromAccount ? "tolovQatori.hisobdanAvto" : "tolovQatori.kassadan")}
                  </span>
                )}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-6 items-center gap-1 rounded-full bg-slate-100 px-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200"
                    >
                      {t("tolovQatori.amallar")}
                      <ChevronDown size={12} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" collisionPadding={12} className="z-[10000] w-[220px] max-w-[calc(100vw-24px)] rounded-2xl bg-white p-2">
                    <DropdownMenuItem onSelect={() => setTanlangan(qator)}>{t("tolovQatori.ochish")}</DropdownMenuItem>
                    <div title={cheklov ? t(cheklov) : undefined}>
                      <DropdownMenuItem disabled={Boolean(cheklov)} onSelect={() => setTanlangan({ ...qator, tahrir: true })}>
                        <PenLine size={15} />{t("tolovTahriri.tugma")}
                      </DropdownMenuItem>
                      {cheklov && <p className="px-2 pb-1 text-[11px] leading-4 text-slate-500">{t(cheklov)}</p>}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                <span
                  className={`inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold ${
                    qarz ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {!qarz && <CheckCircle2 size={12} />}
                  {qarz ? t("tolovQatori.qarz") : t("tolovQatori.tolangan")}
                </span>
              </div>
            </div>
          );
        })}
        </div>
      </div>
      )}

      {tanlangan && <TolovTafsilotModal sotuv={sotuv} mijoz={mijoz} qator={tanlangan} boshlangichTahrir={tanlangan.tahrir} onYopish={() => setTanlangan(null)} />}
    </>
  );
}

function tolovTuriIkonkasi(turi: TolovTuri) {
  switch (turi) {
    case "CARD":
      return <CreditCard size={17} />;
    case "BANK":
      return <Landmark size={17} />;
    case "BALANCE":
      return <Wallet size={17} />;
    default:
      return <Banknote size={17} />;
  }
}

function TolovTafsilotModal({ sotuv, mijoz, qator, boshlangichTahrir = false, onYopish }: { sotuv: Sotuv; mijoz: string; qator: TolovQatori; boshlangichTahrir?: boolean; onYopish: () => void }) {
  const { t } = useTranslation("savdo_tafsilot");
  const { tolov } = qator;
  const qarz = tolov.paymentType === "DEBT";
  const sotuvJami = sotuvSummasi(sotuv);
  const tolovVal = tolovValyutasi(tolov, sotuv);
  const sotuvVal = sotuvValyutasi(sotuv);
  const sotuvUlushi = tolovFoizi(tolovSotuvValyutasida(tolov, sotuv), sotuvJami);
  const qaytim = tolovlarQaytimi([tolov]);
  const qaytimVal = qaytimValyutasi(sotuvVal, useRejimValyutasi());
  const tahrirCheklovi = useTolovTahririRuxsati();
  const cheklov = tahrirCheklovi(sotuv, tolov);
  const [tahrir, setTahrir] = useState(boshlangichTahrir && !cheklov);
  const [band, setBand] = useState(false);

  return (
    <AppModal
      onClose={() => {
        // Zanjir ishlayotganda oynani yopib bo'lmaydi: sotuv yarim holatda qolmasin.
        if (!band) onYopish();
      }}
    >
      <div className={`flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_30px_90px_rgba(15,23,42,.24)] ${tahrir ? "max-w-4xl" : "max-w-xl"}`}>
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-linear-to-r from-orange-50 to-white px-7 py-5">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm ring-1 ring-orange-100">
              {tahrir ? <PenLine size={22} /> : <CreditCard size={24} />}
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">{tahrir ? t("tolovTahriri.sarlavha") : t("tolovTafsilot.belgisi")}</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">№{qator.raqam}</h2>
            </div>
          </div>
          {!tahrir && (
            <button
              type="button"
              disabled={Boolean(cheklov)}
              title={cheklov ? t(cheklov) : undefined}
              onClick={() => setTahrir(true)}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,.22)] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PenLine size={15} aria-hidden />
              {t("tolovTahriri.tugma")}
            </button>
          )}
        </div>

        {tahrir ? (
          <TolovTahriri sotuv={sotuv} tolov={tolov} raqam={qator.raqam} onBand={setBand} onOrqaga={() => setTahrir(false)} onYopish={onYopish} />
        ) : (
        <div className="min-h-0 space-y-5 overflow-y-auto px-7 py-6">
          {cheklov && <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{t(cheklov)}</p>}
          <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">{t("tolovTafsilot.summa")}</p>
                <p className="mt-1 text-4xl font-light tracking-wide text-slate-800">{pulniFormatlash(tolov.amount, tolovVal)}</p>
                {tolovVal !== sotuvVal && (
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {t("tolovTafsilot.sotuvValyutasidagiQiymat", {
                      summa: pulniFormatlash(tolovSotuvValyutasida(tolov, sotuv), sotuvVal),
                      kurs: Number(tolov.rate ?? 0) > 0 ? ` · ${t("tolovTafsilot.kurs", { kurs: Number(tolov.rate).toLocaleString("uz-UZ", { maximumFractionDigits: 2 }) })}` : "",
                    })}
                  </p>
                )}
              </div>
              <span
                className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-bold ${
                  qarz ? "bg-amber-50 text-amber-600 ring-1 ring-amber-100" : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
                }`}
              >
                {!qarz && <CheckCircle2 size={13} />}
                {qarz ? t("tolovQatori.qarz") : t("tolovQatori.tolangan")}
              </span>
            </div>

            {sotuvJami > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-slate-600">{t("tolovTafsilot.sotuvUlushi", { foiz: sotuvUlushi })}</span>
                  <span className="text-slate-400">
                    {t("tolovTafsilot.sotuvJami")} {pulniFormatlash(sotuvJami, sotuvVal)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={sotuvUlushi}>
                  <div className="h-full rounded-full bg-[#2563EB] transition-all duration-500" style={{ width: `${sotuvUlushi}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white">
            <TafsilotQatori icon={<FileText size={17} />} label={t("tolovTafsilot.sotuv")} value={sotuvRaqami(sotuv)} />
            <TafsilotQatori icon={<UserRound size={17} />} label={t("tolovTafsilot.mijoz")} value={mijoz} />
            <TafsilotQatori
              icon={tolovTuriIkonkasi(tolov.paymentType)}
              label={t("tolovTafsilot.tolovTuri")}
              value={tolovTuriMatni[tolov.paymentType] ?? tolov.paymentType}
            />
            {(tolov.fromAccount || tolov.cashOperationId) && (
              <TafsilotQatori icon={<Wallet size={17} />} label={t("tolovTafsilot.manba")} value={t(tolov.fromAccount ? "tolovTafsilot.manbaHisob" : "tolovTafsilot.manbaKassa")} />
            )}
            {qaytim.qaytim > 0 && (
              <TafsilotQatori icon={<Banknote size={17} />} label={t("tolovTafsilot.qaytim")} value={qaytimMatni(qaytim.qaytim, qaytimVal, t("tolovModal.somBelgisi"))} />
            )}
            {qaytim.hisobga > 0 && (
              <TafsilotQatori icon={<Wallet size={17} />} label={t("tolovTafsilot.hisobga")} value={pulniFormatlash(qaytim.hisobga, sotuvVal)} />
            )}
            <TafsilotQatori icon={<CalendarDays size={17} />} label={t("tolovTafsilot.sana")} value={tolovSanasiMatni(qator.sana)} />
            {tolov.note && <TafsilotQatori icon={<FileText size={17} />} label={t("tolovTafsilot.izoh")} value={tolov.note} />}
            <TafsilotQatori icon={<UserCheck size={17} />} label={t("tolovTafsilot.masulShaxs")} value={masulNomi(sotuv)} />
          </div>
        </div>
        )}
      </div>
    </AppModal>
  );
}

function TafsilotQatori({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  const bosh = !value || value === "-" || value === "—";
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#2563EB] ring-1 ring-orange-100">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        <p className={`mt-0.5 break-words text-sm font-semibold ${bosh ? "text-slate-300" : "text-slate-800"}`}>{bosh ? "—" : value}</p>
      </div>
    </div>
  );
}
