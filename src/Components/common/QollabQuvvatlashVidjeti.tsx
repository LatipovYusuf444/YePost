import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
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
            id="support-chat-widget"
            role="dialog"
            aria-label="Qo'llab-quvvatlash suhbati"
            className="fixed bottom-5 right-5 z-[9998] h-[min(640px,calc(100dvh-2.5rem))] w-[400px] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,.18)]"
          >
            <SupportChatOynasi compact onClose={() => setOchiq(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!ochiq && (
          <motion.button
            type="button"
            onClick={() => setOchiq(true)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            aria-label="Qo'llab-quvvatlash"
            aria-expanded={false}
            aria-controls="support-chat-widget"
            className={`fixed bottom-5 right-5 z-[9999] flex h-14 w-14 items-center justify-center rounded-[18px] text-white shadow-[0_14px_34px_rgba(37,99,235,.3)] ${QOLLAB_QUVVATLASH_GRADIENT}`}
          >
            <MessageCircle size={24} />
            {oqilmaganSoni > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
                {oqilmaganSoni > 9 ? "9+" : oqilmaganSoni}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
