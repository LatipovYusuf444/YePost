import { useEffect, useState } from "react";
import { eskiYozuvSanasi } from "@/lib/kassaTahriri";
import { Banknote, Info, Landmark, LoaderCircle, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import SummaMaydoni from "@/Components/common/SummaMaydoni";
import HujjatSanasiMaydoni from "@/Components/common/HujjatSanasi";
import XatoliMaydon from "@/Components/common/XatoliMaydon";
import { useMaydonXatolari } from "@/hooks/useMaydonXatolari";
import { useOzgarishBormi } from "@/hooks/useOzgarishBormi";
import { bugungiToshkentKuni, toshkentKuni } from "@/lib/hujjatSanasi";
import type { XatoMaydonQoidasi } from "@/lib/maydonXatolari";
import type { KassaAmaliyoti, KassaKanali } from "./types";
import { maydonKlass } from "./yordamchilar";

// `date` — to'liq ISO vaqt, faqat kun o'zgarganda; `note` — faqat o'zgarganda (bo'sh satr — izoh o'chiriladi).
export type EskiTahrirMalumoti = { amount: number; date?: string; paymentMethod: "CASH" | "CARD" | "BANK"; note?: string };

const KANALLAR: { kalit: KassaKanali; kod: EskiTahrirMalumoti["paymentMethod"]; Ikonka: typeof Banknote }[] = [
  { kalit: "naqd", kod: "CASH", Ikonka: Banknote },
  { kalit: "bank", kod: "BANK", Ikonka: Landmark },
  { kalit: "ilova", kod: "CARD", Ikonka: Smartphone },
];

const XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  amount: { maydonlar: ["amount"], kodlar: ["amount"], sozlar: ["summa", "сумм"] },
  date: { maydonlar: ["date"], kodlar: ["date_in_future", "period_closed", "date"], sozlar: ["sana", "дат"] },
  note: { maydonlar: ["note"], kodlar: ["note"], sozlar: ["izoh", "комментар"] },
};

/**
 * Eski kassa yozuvi (PATCH /finance/expenses/:id yoki /finance/cash-ins/:id): backend shu yozuvlarda summa, sana, to'lov turi va izohni
 * qabul qiladi (valyuta va kontragent yo'q). Saqlash ota komponentda; server xatosi maydon ostiga tushadi.
 */
export default function KassaEskiTahrir({
  amaliyot,
  onSaqlash,
  onBekor,
  onOzgarish,
}: {
  amaliyot: KassaAmaliyoti;
  onSaqlash: (malumot: EskiTahrirMalumoti) => Promise<unknown>;
  onBekor: () => void;
  /** Saqlanmagan o'zgarish bormi — oyna yopilishidan oldin so'rash uchun (AppModal). */
  onOzgarish?: (bor: boolean) => void;
}) {
  const { t } = useTranslation(["kassa_uchot", "common"]);
  const fx = useMaydonXatolari(XATO_QOIDALARI);
  const [summa, setSumma] = useState(String(amaliyot.summa));
  const [sana, setSana] = useState(() => toshkentKuni(amaliyot.sana) || bugungiToshkentKuni());
  const [kanal, setKanal] = useState<KassaKanali>(amaliyot.kanal);
  const [izoh, setIzoh] = useState(amaliyot.izoh);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const boshlangichKun = toshkentKuni(amaliyot.sana) || bugungiToshkentKuni();
  const ozgarishBor = useOzgarishBormi({ summa, sana, kanal, izoh }, true);
  useEffect(() => { onOzgarish?.(ozgarishBor); }, [ozgarishBor, onOzgarish]);
  const tushum = amaliyot.yonalish === "tushum";

  async function saqlash() {
    const son = Number(summa);
    if (!(son > 0)) {
      fx.ornat({ amount: t("modal.errors.invalidAmount") });
      return;
    }
    fx.ornat({});
    setSaqlanmoqda(true);
    try {
      // Xato maydon ostiga (yoki tepaga) tushadi va toast chiqadi; oyna ochiq qoladi.
      await fx.kuzat(() =>
        onSaqlash({
          amount: son,
          // Backend bu yozuvlarda sanani o'zgartirmasdan saqlaydi: faqat kun emas, to'liq vaqt yuboriladi (kun o'zgarmasa — yuborilmaydi).
          date: eskiYozuvSanasi(sana, boshlangichKun, bugungiToshkentKuni()),
          paymentMethod: KANALLAR.find((item) => item.kalit === kanal)?.kod ?? "CASH",
          // Izoh o'zgargan bo'lsa yuboriladi — o'chirilgan izoh bo'sh satr bo'lib ketadi (yuborilmasa eskisi qolardi).
          note: izoh.trim() !== (amaliyot.izoh ?? "").trim() ? izoh.trim() : undefined,
        })
      );
    } catch {
      // fx.kuzat xatoni maydonga bog'lab bo'ldi.
    } finally {
      setSaqlanmoqda(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm sm:p-6" data-testid="kassa-eski-tahrir">
      <h3 className="text-lg font-black text-slate-900">{t("amallar.legacyTitle")}</h3>
      <p className="mt-1 flex items-start gap-1.5 text-xs font-semibold leading-5 text-slate-500">
        <Info size={13} aria-hidden className="mt-0.5 shrink-0 text-slate-400" /> {t("amallar.legacyHint")}
      </p>
      {fx.tepadagi && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{fx.tepadagi}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <XatoliMaydon xato={fx.xato("amount")}>
          <label className="grid gap-1.5 text-xs font-bold text-slate-500">
            {t("table.summa")}
            <SummaMaydoni kasr={amaliyot.valyuta === "USD" ? 2 : 0} value={summa} onChange={(qiymat) => { fx.tozala("amount"); setSumma(qiymat); }} className={maydonKlass} />
          </label>
        </XatoliMaydon>
        <XatoliMaydon xato={fx.xato("date")}>
          <label className="grid gap-1.5 text-xs font-bold text-slate-500">
            {tushum ? t("modal.incomeDateLabel") : t("modal.expenseDateLabel")}
            <HujjatSanasiMaydoni value={sana} onChange={(kun) => { fx.tozala("date"); setSana(kun); }} className={maydonKlass} />
          </label>
        </XatoliMaydon>
        <div className="grid gap-1.5 text-xs font-bold text-slate-500 sm:col-span-2">
          {t("modal.paymentTypeLabel")}
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("modal.paymentTypeLabel")}>
            {KANALLAR.map(({ kalit, Ikonka }) => (
              <button
                key={kalit}
                type="button"
                role="radio"
                aria-checked={kanal === kalit}
                onClick={() => setKanal(kalit)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-bold transition ${
                  kanal === kalit ? "bg-orange-500 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:text-orange-600"
                }`}
              >
                <Ikonka size={15} aria-hidden /> {t(`channels.${kalit}`)}
              </button>
            ))}
          </div>
        </div>
        <XatoliMaydon xato={fx.xato("note")} className="sm:col-span-2">
          <label className="grid gap-1.5 text-xs font-bold text-slate-500">
            {t("modal.commentTitle")}
            <textarea value={izoh} onChange={(event) => { fx.tozala("note"); setIzoh(event.target.value); }} rows={3} className={`${maydonKlass} h-auto py-2.5`} />
          </label>
        </XatoliMaydon>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onBekor} disabled={saqlanmoqda} className="h-12 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-600 hover:bg-slate-50 disabled:opacity-60">
          {t("common:actions.cancel")}
        </button>
        <button type="button" onClick={() => void saqlash()} disabled={saqlanmoqda} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-7 text-sm font-black text-white shadow-lg shadow-orange-100 hover:bg-orange-600 disabled:opacity-60">
          {saqlanmoqda && <LoaderCircle size={16} className="animate-spin" aria-hidden />}
          {t("common:actions.save")}
        </button>
      </div>
    </section>
  );
}
