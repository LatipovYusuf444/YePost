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

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-cream-200 to-gold-150">
      <YonPanel />

      <main className="min-h-screen pl-20 pr-6 pt-6 transition-[padding-left] duration-200 ease-in-out peer-hover/sidebar:pl-[270px]">
        <YuqoriPanel />
        <div className="min-h-[calc(100vh-48px)] rounded-[34px] border border-gold-200/60 bg-white/80 p-7 shadow-gold-medium backdrop-blur-xl">
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
