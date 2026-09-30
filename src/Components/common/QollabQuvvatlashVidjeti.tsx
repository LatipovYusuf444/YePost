import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X } from "lucide-react";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useSupportStore } from "@/store/supportStore";
import { sahifagaRuxsatBormi } from "@/lib/roles";
import SupportChatOynasi, { QOLLAB_QUVVATLASH_GRADIENT } from "@/Pages/Support/SupportChatOynasi";

const SAHIFA_YOLI = "/qollab-quvvatlash";

// Loyihaning har bir sahifasida (dedikatsiya qilingan Qo'llab-quvvatlash
// sahifasidan tashqari) o'ng-pastki burchakda suzuvchi chat tugmasi — bosilganda
// o'sha yerning o'zida suhbat oynasi ochiladi, sahifani tark etish shart emas.
export default function QollabQuvvatlashVidjeti() {
  const { pathname } = useLocation();
  const profil = useAuthProfileStore((state) => state.profil);
  const oqilmaganSoni = useSupportStore((state) => state.oqilmaganSoni);
  const [ochiq, setOchiq] = useState(false);

  useEffect(() => {
    if (pathname === SAHIFA_YOLI) setOchiq(false);
  }, [pathname]);

  if (pathname === SAHIFA_YOLI) return null;
  if (profil && !sahifagaRuxsatBormi(profil, SAHIFA_YOLI)) return null;

  return (
    <>
      <AnimatePresence>
        {ochiq && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-5 z-[9998] h-[min(600px,calc(100vh-140px))] w-[380px] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-[26px] border border-white/10 bg-black shadow-[0_24px_70px_rgba(0,0,0,.55)]"
          >
            <SupportChatOynasi compact onClose={() => setOchiq(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOchiq((joriy) => !joriy)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        aria-label="Qo'llab-quvvatlash"
        className={`fixed bottom-5 right-5 z-[9999] flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_14px_34px_rgba(79,70,229,.4)] ${QOLLAB_QUVVATLASH_GRADIENT}`}
      >
        {ochiq ? <X size={24} /> : <MessageCircle size={24} />}
        {!ochiq && oqilmaganSoni > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
            {oqilmaganSoni > 9 ? "9+" : oqilmaganSoni}
          </span>
        )}
      </motion.button>
    </>
  );
}
