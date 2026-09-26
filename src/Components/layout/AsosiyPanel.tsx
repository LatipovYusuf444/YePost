import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import YonPanel from "./YonPanel";
import YuqoriPanel from "./YuqoriPanel";

const sahifaVariantlari = {
  initial: { opacity: 0, y: 16, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.99 },
};

export default function AsosiyLayout() {
  const location = useLocation();
  // Yon panel faqat navbar tugmasi bilan ochiladi/yopiladi (hover emas); holat shu yerda bitta joyda.
  const [sidebarAcik, setSidebarAcik] = useState(false);

  return (
    <div className="app-shell min-h-screen bg-gradient-to-br from-cream-50 via-cream-200 to-gold-150">
      <YonPanel acik={sidebarAcik} />

      <main
        className={`min-h-screen w-full min-w-0 max-w-full overflow-x-clip pl-20 pr-6 pt-6 transition-[padding-left] duration-200 ease-in-out ${
          sidebarAcik ? "md:pl-74" : ""
        }`}
      >
        <YuqoriPanel sidebarAcik={sidebarAcik} onSidebarToggle={() => setSidebarAcik((joriy) => !joriy)} />
        <div className="app-main-surface @container min-h-[calc(100vh-48px)] min-w-0 max-w-full rounded-[34px] border border-gold-200/60 bg-white/80 p-7 shadow-gold-medium backdrop-blur-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={sahifaVariantlari}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
