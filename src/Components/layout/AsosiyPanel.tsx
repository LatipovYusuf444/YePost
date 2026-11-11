import { Fragment, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import YonPanel from "./YonPanel";
import { useYonPanelHolati } from "./yonPanelHolati";
import YuqoriPanel from "./YuqoriPanel";
import QollabQuvvatlashVidjeti from "@/Components/common/QollabQuvvatlashVidjeti";
import { useValyutaRejiminiKuzatish, useValyutaStore } from "@/lib/valyuta";
import { useInventorySettingsStore } from "@/store/inventorySettingsStore";
import { useIshlabChiqarishStore } from "@/store/ishlabChiqarishStore";

const sahifaVariantlari = {
  initial: { opacity: 0, y: 16, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.99 },
};

export default function AsosiyLayout() {
  const location = useLocation();
  const loadInventorySettings = useInventorySettingsStore((state) => state.load);
  useEffect(() => { void loadInventorySettings(); }, [loadInventorySettings, location.pathname]);
  // Menyu modul holatiga bog'liq; 5 daqiqada bir yangilanadi, har sahifaga so'rov ketmaydi.
  const loadIshlabChiqarish = useIshlabChiqarishStore((state) => state.load);
  useEffect(() => { void loadIshlabChiqarish(); }, [loadIshlabChiqarish, location.pathname]);
  // Valyuta rejimi (ikki valyuta / faqat so'm / faqat dollar), hisobot valyutasi yoki kurs o'zgarganda sahifa qayta yig'iladi — barcha
  // narxlar va valyuta maydonlari yangi rejimda qayta hisoblanadi.
  useValyutaRejiminiKuzatish();
  const valyutaKaliti = useValyutaStore((holat) => `${holat.rejim}:${holat.hisobotValyutasi}:${holat.kursBor ? holat.kurs : 0}`);
  // Yon panel faqat navbar tugmasi bilan ochiladi/yopiladi (hover emas); holat shu yerda bitta joyda.
  // Keng ekranda (>= 1280px) tanlov localStorage'da saqlanadi; planshetda panel kontent ustiga chiqadi.
  const { acik: sidebarAcik, rejim: sidebarRejimi, almashtirish: sidebarniAlmashtirish, yopish: sidebarniYopish } = useYonPanelHolati();

  return (
    <div className="app-shell mobile-app-shell min-h-screen bg-gradient-to-br from-cream-50 via-cream-200 to-gold-150">
      <YonPanel acik={sidebarAcik} rejim={sidebarRejimi} onYopish={sidebarniYopish} />

      {/* Telefonda chetlar torroq, katta ekranda kontent markazlashgan holda keng tarqalib ketmaydi.
          Yon panel (12px chet + 76/288px) faqat keng ekranda (xl+) kontentni suradi; planshetda uning ustiga chiqadi. */}
      <main
        className={`min-h-screen w-full min-w-0 max-w-full overflow-x-clip px-2.5 pt-3 sm:px-3 transition-[padding-left] duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none sm:pl-4 sm:pr-5 md:pl-[104px] lg:pr-6 ${
          sidebarAcik ? "xl:pl-[316px]" : ""
        }`}
      >
        <div className="mx-auto w-full max-w-[1880px]">
          <YuqoriPanel sidebarAcik={sidebarAcik} onSidebarToggle={sidebarniAlmashtirish} />
          <div className="app-main-surface @container min-h-[calc(100vh-48px)] min-w-0 max-w-full rounded-[20px] border border-gold-200/60 bg-white/80 p-3 shadow-gold-medium backdrop-blur-xl sm:rounded-[28px] sm:p-5 lg:rounded-[34px] lg:p-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={sahifaVariantlari}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                <Fragment key={valyutaKaliti}>
                  <Outlet />
                </Fragment>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      <QollabQuvvatlashVidjeti />
    </div>
  );
}
