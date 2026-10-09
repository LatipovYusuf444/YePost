import { Fragment, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import YonPanel from "./YonPanel";
import YuqoriPanel from "./YuqoriPanel";
import QollabQuvvatlashVidjeti from "@/Components/common/QollabQuvvatlashVidjeti";
import { useValyutaStore } from "@/lib/valyuta";

const sahifaVariantlari = {
  initial: { opacity: 0, y: 16, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.99 },
};

export default function AsosiyLayout() {
  const location = useLocation();
  // Valyuta yoki kurs o'zgarganda sahifa qayta yig'iladi — barcha narxlar yangi valyutada qayta hisoblanadi.
  const valyutaKaliti = useValyutaStore((holat) => `${holat.rejimYoniq}:${holat.valyuta}:${holat.kursBor ? holat.kurs : 0}`);
  // Yon panel faqat navbar tugmasi bilan ochiladi/yopiladi (hover emas); holat shu yerda bitta joyda.
  const [sidebarAcik, setSidebarAcik] = useState(false);

  return (
    <div className="app-shell min-h-screen bg-gradient-to-br from-cream-50 via-cream-200 to-gold-150">
      <YonPanel acik={sidebarAcik} onAcikChange={setSidebarAcik} />

      {/* Telefonda chetlar torroq, katta ekranda kontent markazlashgan holda keng tarqalib ketmaydi.
          Yon panel faqat katta ekranda (lg+) kontentni suradi; planshetda uning ustiga chiqadi. */}
      <main
        className={`min-h-screen w-full min-w-0 max-w-full overflow-x-clip px-3 pt-3 transition-[padding-left] duration-200 ease-in-out sm:pl-4 sm:pr-5 md:pl-[92px] lg:pr-6 ${
          sidebarAcik ? "lg:pl-[308px]" : ""
        }`}
      >
        <div className="mx-auto w-full max-w-[1880px]">
          <YuqoriPanel sidebarAcik={sidebarAcik} onSidebarToggle={() => setSidebarAcik((joriy) => !joriy)} />
          <div className="app-main-surface @container min-h-[calc(100vh-48px)] min-w-0 max-w-full rounded-[22px] border border-gold-200/60 bg-white/80 p-3 shadow-gold-medium backdrop-blur-xl sm:rounded-[28px] sm:p-5 lg:rounded-[34px] lg:p-7">
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
