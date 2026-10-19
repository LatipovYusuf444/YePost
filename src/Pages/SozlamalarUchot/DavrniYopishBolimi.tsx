import { useEffect, useState } from "react";
import { CircleCheck, Info, LoaderCircle, Lock, LockOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { davrniYopishApi, type DavrniYopishHolati } from "@/api/davrniYopishApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { bugungiToshkentKuni, kelajakKunmi, kunMatni, vaqtMatni } from "@/lib/hujjatSanasi";
import { foydalanuvchiDirektormi } from "@/lib/roles";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useDavrStore } from "@/store/davrStore";
import { BolimKarta, Maydon } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

type Amal = { tur: "yopish"; kun: string } | { tur: "ochish" };

// Sozlamalar → Davrni yopish: GET/PUT /settings/period-close { closedUntil }.
// Yopilgan kun (o'sha kun ham) va undan oldingi sanadagi hujjatlarni yaratish, tahrirlash, tasdiqlash, bekor qilish,
// tiklash va o'chirish backendda rad etiladi. O'zgartirish faqat DIREKTOR uchun (boshqalarga 403).
export default function DavrniYopishBolimi() {
  const { t } = useTranslation("sozlamalar_uchot");
  const profil = useAuthProfileStore((holat) => holat.profil);
  const tahrirlaydi = foydalanuvchiDirektormi(profil);
  const davrniYangilash = useDavrStore((holat) => holat.belgilash);

  const [holat, setHolat] = useState<DavrniYopishHolati | null>(null);
  const [kun, setKun] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState("");
  const [xabar, setXabar] = useState("");
  const [amal, setAmal] = useState<Amal | null>(null);

  const bugun = bugungiToshkentKuni();

  useEffect(() => {
    let faol = true;
    davrniYopishApi
      .olish()
      .then((javob) => {
        if (!faol) return;
        setHolat(javob);
        setKun(javob.closedUntil ?? "");
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

  const yopilganKun = holat?.closedUntil ?? null;
  const kelajakda = kelajakKunmi(kun, bugun);
  const yopishMumkin = tahrirlaydi && !yuklanmoqda && Boolean(kun) && !kelajakda && kun !== yopilganKun;

  // Tasdiqlash oynasi yopilganda xatoni ko'rsatish uchun: `false` qaytsa oyna baribir yopiladi, xato esa shu bo'limda qoladi.
  async function bajarish(tanlangan: Amal) {
    setXato("");
    setXabar("");
    try {
      const yangi = await davrniYopishApi.yangilash(tanlangan.tur === "yopish" ? tanlangan.kun : null);
      setHolat(yangi);
      setKun(yangi.closedUntil ?? "");
      davrniYangilash(yangi);
      setXabar(tanlangan.tur === "yopish" ? t("davrniYopish.closedMessage") : t("davrniYopish.openedMessage"));
      return true;
    } catch (error) {
      setXato(getApiErrorMessage(error));
      return false;
    }
  }

  return (
    <BolimKarta
      sarlavha={t("davrniYopish.title")}
      izoh={t("davrniYopish.subtitle")}
      amal={xabar ? <span className="text-sm font-bold text-emerald-600">{xabar}</span> : undefined}
    >
      {xato && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
      {!tahrirlaydi && !yuklanmoqda && (
        <p className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">{t("davrniYopish.readOnlyNotice")}</p>
      )}

      {yuklanmoqda ? (
        <div className="flex h-40 items-center justify-center gap-2 text-sm font-bold text-slate-400">
          <LoaderCircle className="animate-spin" size={20} />
          {t("loadingGeneric")}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Joriy holat */}
          {yopilganKun ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
              <Lock size={20} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-black text-amber-800">{t("davrniYopish.statusClosed", { sana: kunMatni(yopilganKun) })}</p>
                {holat?.changedBy && holat.changedAt && (
                  <p className="mt-0.5 text-xs font-semibold text-amber-700">
                    {t("davrniYopish.changedBy", {
                      kim: holat.changedBy.fullName || holat.changedBy.username || "—",
                      vaqt: vaqtMatni(holat.changedAt),
                    })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
              <CircleCheck size={20} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-black text-emerald-800">{t("davrniYopish.statusOpen")}</p>
                {holat?.changedBy && holat.changedAt && (
                  <p className="mt-0.5 text-xs font-semibold text-emerald-700">
                    {t("davrniYopish.changedBy", {
                      kim: holat.changedBy.fullName || holat.changedBy.username || "—",
                      vaqt: vaqtMatni(holat.changedAt),
                    })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tushuntirish */}
          <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3.5 text-xs font-semibold leading-5 text-slate-500">
            <Info size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
            <ul className="space-y-1">
              <li>{t("davrniYopish.rules.blocked")}</li>
              <li>{t("davrniYopish.rules.allowed")}</li>
              <li>{t("davrniYopish.rules.transfers")}</li>
            </ul>
          </div>

          {/* Tahrirlash (faqat direktor) */}
          {tahrirlaydi && (
            <div className="grid gap-4 sm:max-w-md">
              <Maydon label={t("davrniYopish.dateLabel")}>
                <input
                  type="date"
                  value={kun}
                  max={bugun}
                  onChange={(event) => {
                    setKun(event.target.value);
                    setXato("");
                    setXabar("");
                  }}
                  aria-invalid={kelajakda || undefined}
                  className={maydonKlass}
                />
              </Maydon>
              <p className="-mt-2 text-xs font-semibold text-slate-400">
                {kelajakda ? <span className="font-bold text-red-600">{t("davrniYopish.futureError")}</span> : t("davrniYopish.dateHint")}
              </p>
            </div>
          )}

          {tahrirlaydi && (
            <div className="flex flex-wrap justify-end gap-3">
              {yopilganKun && (
                <button
                  type="button"
                  onClick={() => setAmal({ tur: "ochish" })}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  <LockOpen size={16} />
                  {t("davrniYopish.openAction")}
                </button>
              )}
              <button
                type="button"
                disabled={!yopishMumkin}
                onClick={() => setAmal({ tur: "yopish", kun })}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#2563EB] px-6 text-sm font-black text-white shadow-[0_14px_32px_rgba(37,99,235,.24)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Lock size={16} />
                {t("davrniYopish.closeAction")}
              </button>
            </div>
          )}
        </div>
      )}

      {amal && (
        <TasdiqlashOynasi
          ikonka={amal.tur === "yopish" ? <Lock size={24} /> : <LockOpen size={24} />}
          ohang="sariq"
          sarlavha={amal.tur === "yopish" ? t("davrniYopish.confirmClose.title") : t("davrniYopish.confirmOpen.title")}
          nom={amal.tur === "yopish" ? kunMatni(amal.kun) : kunMatni(yopilganKun)}
          tavsif={amal.tur === "yopish" ? t("davrniYopish.confirmClose.description") : t("davrniYopish.confirmOpen.description")}
          ortgaMatni={t("davrniYopish.back")}
          tasdiqMatni={amal.tur === "yopish" ? t("davrniYopish.confirmClose.yes") : t("davrniYopish.confirmOpen.yes")}
          jarayonMatni={t("davrniYopish.working")}
          onTasdiq={() => bajarish(amal)}
          onYopish={() => setAmal(null)}
        />
      )}
    </BolimKarta>
  );
}
