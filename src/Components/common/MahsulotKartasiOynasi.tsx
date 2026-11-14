import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ModalYuklanmoqda from "@/Components/common/ModalYuklanmoqda";
import { mahsulotlarApi, modifikatsiyalarApi } from "@/api/catalogApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { sahifagaRuxsatBormi } from "@/lib/roles";
import { xatolikXabari } from "@/lib/toast";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useMahsulotlarStore } from "@/store/mahsulotlarStore";
import type { Mahsulot } from "@/types/catalog";

// Mahsulotlar bo'limidagi oynaning o'zi: alohida bo'lak bo'lib yuklanadi.
const MahsulotModalKeng = lazy(() => import("@/Pages/Mahsulotlar").then((modul) => ({ default: modul.MahsulotModalKeng })));

/**
 * Hujjat qatoridagi mahsulot nomi bosilganda mahsulot kartasi: Mahsulotlar bo'limiga ruxsat bo'lsa tahrirlanadi, aks holda faqat ko'rish.
 * `productId` bo'lmasa variant (`modificationId`) orqali aniqlanadi.
 */
export default function MahsulotKartasiOynasi({ modificationId, productId, onYopish }: { modificationId: string; productId?: string | null; onYopish: () => void }) {
  const { t } = useTranslation("bosh_sahifa");
  const profil = useAuthProfileStore((state) => state.profil);
  const tahrirRuxsati = sahifagaRuxsatBormi(profil, "/mahsulotlar");
  const [mahsulot, setMahsulot] = useState<Mahsulot | null>(null);
  const yopish = useRef(onYopish);
  yopish.current = onYopish;

  useEffect(() => {
    let faol = true;
    (async () => {
      try {
        const id = productId || (await modifikatsiyalarApi.olish(modificationId)).productId;
        if (!id) throw new Error(t("productEdit.notFound"));
        const store = useMahsulotlarStore.getState();
        const [toliq, variantlar] = await Promise.all([mahsulotlarApi.olish(id), store.modifikatsiyalarniYuklash(id), store.malumotnomalarniYuklash()]);
        if (variantlar === null) throw new Error(useMahsulotlarStore.getState().xatolik || t("productEdit.loadFailed"));
        if (faol) setMahsulot(toliq);
      } catch (error) {
        if (!faol) return;
        xatolikXabari(getApiErrorMessage(error) || t("productEdit.loadFailed"));
        yopish.current();
      }
    })();
    return () => { faol = false; };
  }, [modificationId, productId, t]);

  if (!mahsulot) return <ModalYuklanmoqda onClose={onYopish} />;
  return (
    <Suspense fallback={<ModalYuklanmoqda onClose={onYopish} />}>
      <MahsulotModalKeng item={mahsulot} boshlangichTahrir={false} faqatKorish={!tahrirRuxsati} onClose={onYopish} />
    </Suspense>
  );
}
