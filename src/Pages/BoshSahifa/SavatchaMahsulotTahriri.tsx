import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ModalYuklanmoqda from "@/Components/common/ModalYuklanmoqda";
import { mahsulotlarApi, modifikatsiyalarApi } from "@/api/catalogApi";
import { mahsulotlarniServerdanQidirish } from "@/api/savdoApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { dollarMalumoti, KATALOG_YANGILANDI_HODISASI, qoldiqNarxi, savatNomi } from "@/Components/layout/posMahsulotlari";
import { posNarxRejimi } from "@/Components/layout/usePosMahsulotlar";
import { sahifagaRuxsatBormi } from "@/lib/roles";
import { muvaffaqiyatXabari, xatolikXabari } from "@/lib/toast";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useMahsulotlarStore } from "@/store/mahsulotlarStore";
import { usePosStore, type CartItem, type KatalogYangilanishi } from "@/store/posStore";
import type { Mahsulot } from "@/types/catalog";

// Mahsulotlar bo'limidagi tahrirlash oynasining o'zi: alohida bo'lak bo'lib yuklanadi (Bosh sahifa ochilishini sekinlatmaydi).
const MahsulotModalKeng = lazy(() => import("@/Pages/Mahsulotlar").then((modul) => ({ default: modul.MahsulotModalKeng })));

type Props = {
  qator: CartItem;
  onYopish: () => void;
};

/**
 * Savatchadagi mahsulot nomi bosilganda ochiladigan tahrirlash oynasi. Tahrirlash huquqi (Mahsulotlar bo'limiga kirish) bo'lmasa
 * oyna faqat ko'rish rejimida ochiladi. Saqlangach katalog (mahsulotlar do'koni) yangilanadi va savatchadagi shu qatorning nomi
 * va narxi katalogdan qayta olinadi — miqdor, ombor, mijoz va chegirma joyida qoladi.
 */
export default function SavatchaMahsulotTahriri({ qator, onYopish }: Props) {
  const { t } = useTranslation("bosh_sahifa");
  const profil = useAuthProfileStore((state) => state.profil);
  const tahrirRuxsati = sahifagaRuxsatBormi(profil, "/mahsulotlar");
  const [mahsulot, setMahsulot] = useState<Mahsulot | null>(null);
  // Oyna ochilgan paytdagi qator (ochiq turganda savatcha o'zgarsa ham shu qator yangilanadi).
  const boshlangich = useRef(qator);
  const yopish = useRef(onYopish);
  yopish.current = onYopish;

  useEffect(() => {
    let faol = true;
    const q = boshlangich.current;
    (async () => {
      try {
        // Eski savatcha qatorlarida mahsulot id'si yo'q: variant orqali aniqlanadi.
        const productId = q.productId || (await modifikatsiyalarApi.olish(q.modificationId)).productId;
        if (!productId) throw new Error(t("productEdit.notFound"));
        const store = useMahsulotlarStore.getState();
        const [toliq, variantlar] = await Promise.all([
          mahsulotlarApi.olish(productId),
          store.modifikatsiyalarniYuklash(productId),
          store.malumotnomalarniYuklash(),
        ]);
        // Narxlar (variantlar) olinmasa bo'sh narxlar bilan oyna ochilmaydi (Mahsulotlar bo'limidagi kabi).
        if (variantlar === null) throw new Error(useMahsulotlarStore.getState().xatolik || t("productEdit.loadFailed"));
        if (faol) setMahsulot(toliq);
      } catch (error) {
        if (!faol) return;
        xatolikXabari(getApiErrorMessage(error) || t("productEdit.loadFailed"));
        yopish.current();
      }
    })();
    return () => {
      faol = false;
    };
  }, [t]);

  async function savatchaQatoriniYangilash(productId: string) {
    const q = boshlangich.current;
    // Header qidiruvining skaner keshi eski narxni bermasligi uchun.
    window.dispatchEvent(new Event(KATALOG_YANGILANDI_HODISASI));
    try {
      const variant = useMahsulotlarStore.getState().modifikatsiyalar[productId]?.find((item) => item.id === q.modificationId);
      const soz = variant?.barcode?.trim() || variant?.article?.trim() || mahsulot?.name || q.nom;
      const natijalar = await mahsulotlarniServerdanQidirish({
        search: soz,
        page: 1,
        pageSize: 20,
        warehouseIds: q.warehouseId ? [q.warehouseId] : [],
      });
      const item = natijalar.flatMap((natija) => natija.qatorlar).find((row) => row.modificationId === q.modificationId);
      // Narxlar joriy valyuta rejimida ("Faqat dollar"da — dollarda, o'girilmasdan).
      const rejim = posNarxRejimi();
      const chakanaNarx = item ? qoldiqNarxi(item, "chakana", rejim) : 0;
      if (!item || !(chakanaNarx > 0)) throw new Error(t("productEdit.cartNotUpdated"));
      const dollar: Partial<KatalogYangilanishi> = dollarMalumoti(item, rejim);
      // Savatchada shu qator hali bo'lsa yangilanadi (oyna ochiq turganda o'chirilgan bo'lishi mumkin).
      if (!usePosStore.getState().cart.some((row) => row.id === q.id)) return;
      usePosStore.getState().katalogdanYangilash(q.id, {
        nom: savatNomi(item) || q.nom,
        productId,
        chakanaNarx,
        ulgurjiNarx: qoldiqNarxi(item, "ulgurji", rejim),
        valyuta: dollar.valyuta,
        aslNarx: dollar.aslNarx,
        aslUlgurjiNarx: dollar.aslUlgurjiNarx,
        ulgurjiSomda: dollar.ulgurjiSomda,
        kurs: dollar.kurs,
        birliklar: item.birliklar,
      });
      muvaffaqiyatXabari(t("productEdit.cartUpdated"));
    } catch (error) {
      xatolikXabari(getApiErrorMessage(error) || t("productEdit.cartNotUpdated"));
    }
  }

  if (!mahsulot) return <ModalYuklanmoqda onClose={onYopish} />;

  return (
    <Suspense fallback={<ModalYuklanmoqda onClose={onYopish} />}>
      <MahsulotModalKeng
        item={mahsulot}
        boshlangichTahrir={tahrirRuxsati}
        faqatKorish={!tahrirRuxsati}
        onClose={onYopish}
        onSaqlandi={() => void savatchaQatoriniYangilash(mahsulot.id)}
      />
    </Suspense>
  );
}
