import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { savdoSozlamalariApi } from "@/api/savdoSozlamalariApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { BARCHA_NARX_TURLARI } from "@/lib/savdoNarxTurlari";
import { foydalanuvchiKursniOzgartiraOladimi } from "@/lib/roles";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useSavdoSozlamalariStore } from "@/store/savdoSozlamalariStore";
import type { SotuvNarxTuri } from "@/types/savdo";
import { BolimKarta, SaqlashTugma, Switch } from "./UmumiyUI";

// Sozlamalar → Sotuv narx turlari: savdoda qaysi narx turlari (tannarx / chakana / ulgurji) ishlatilishi.
// GET/PATCH /settings/sales { priceTypes } — kamida bittasi yoqilgan bo'ladi; o'chirilgan tur bilan sotuv yuborilsa backend rad etadi.
// Ro'yxat tartibi muhim: birinchisi standart tur (shu tartibda yuboriladi).
export default function NarxTurlariBolimi() {
  const { t } = useTranslation("sozlamalar_uchot");
  const profil = useAuthProfileStore((holat) => holat.profil);
  const tahrirlaydi = foydalanuvchiKursniOzgartiraOladimi(profil);
  const kassaniYangilash = useSavdoSozlamalariStore((holat) => holat.belgilash);

  const [yoqilgan, setYoqilgan] = useState<SotuvNarxTuri[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState("");
  const [xabar, setXabar] = useState("");

  useEffect(() => {
    let faol = true;
    savdoSozlamalariApi
      .narxTurlariniOlish()
      .then((turlar) => {
        if (faol) setYoqilgan(turlar ?? []);
      })
      .catch((error) => {
        if (faol) setXato(getApiErrorMessage(error));
      })
      .finally(() => {
        if (faol) setYuklanmoqda(false);
      });
    return () => {
      faol = false;
    };
  }, []);

  function almashtirish(tur: SotuvNarxTuri) {
    if (!tahrirlaydi) return;
    setXabar("");
    setYoqilgan((joriy) => {
      if (!joriy.includes(tur)) return [...joriy, tur];
      // Bo'sh ro'yxat bo'lmaydi: oxirgi yoqilgan turni o'chirib bo'lmaydi.
      return joriy.length > 1 ? joriy.filter((item) => item !== tur) : joriy;
    });
  }

  // Standart tur ro'yxatning boshida turadi.
  function standartQilish(tur: SotuvNarxTuri) {
    if (!tahrirlaydi) return;
    setXabar("");
    setYoqilgan((joriy) => (joriy.includes(tur) ? [tur, ...joriy.filter((item) => item !== tur)] : joriy));
  }

  async function saqlash() {
    if (!tahrirlaydi || saqlanmoqda || yoqilgan.length === 0) return;
    setSaqlanmoqda(true);
    setXato("");
    setXabar("");
    try {
      const saqlangan = await savdoSozlamalariApi.narxTurlariniYangilash(yoqilgan);
      const turlar = saqlangan ?? yoqilgan;
      setYoqilgan(turlar);
      // Kassa shu seansning o'zida yangi sozlamani ko'radi.
      kassaniYangilash(turlar);
      setXabar(t("narxTurlari.savedMessage"));
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setSaqlanmoqda(false);
    }
  }

  return (
    <BolimKarta
      sarlavha={t("narxTurlari.title")}
      izoh={t("narxTurlari.subtitle")}
      amal={xabar ? <span className="text-sm font-bold text-emerald-600">{t("saved")}</span> : undefined}
    >
      {xato && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
      {!tahrirlaydi && !yuklanmoqda && (
        <p className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">{t("narxTurlari.readOnlyNotice")}</p>
      )}
      {yuklanmoqda ? (
        <div className="flex h-40 items-center justify-center gap-2 text-sm font-bold text-slate-400">
          <LoaderCircle className="animate-spin" size={20} />
          {t("loadingGeneric")}
        </div>
      ) : (
        <div className="space-y-3">
          {BARCHA_NARX_TURLARI.map((tur) => {
            const yoniq = yoqilgan.includes(tur);
            return (
              <div key={tur} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-700">
                    {t(`narxTurlari.types.${tur}.label`)}
                    {yoniq && yoqilgan[0] === tur && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-black text-[#2563EB]">{t("narxTurlari.defaultBadge")}</span>}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-400">{t(`narxTurlari.types.${tur}.hint`)}</p>
                  {yoniq && yoqilgan[0] !== tur && tahrirlaydi && (
                    <button type="button" onClick={() => standartQilish(tur)} disabled={saqlanmoqda} className="mt-1 text-xs font-bold text-[#2563EB] hover:underline disabled:opacity-50">{t("narxTurlari.makeDefault")}</button>
                  )}
                </div>
                <Switch yoniq={yoniq} onChange={() => almashtirish(tur)} disabled={!tahrirlaydi || saqlanmoqda || (yoniq && yoqilgan.length <= 1)} />
              </div>
            );
          })}
          <p className="px-1 text-xs font-semibold text-slate-400">{t("narxTurlari.minOne")}</p>
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <SaqlashTugma disabled={!tahrirlaydi || saqlanmoqda || yuklanmoqda || yoqilgan.length === 0} onClick={() => void saqlash()} />
      </div>
    </BolimKarta>
  );
}
