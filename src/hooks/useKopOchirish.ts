import { useMemo, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { tasdiqSorash } from "@/lib/tasdiqSorovi";
import { muvaffaqiyatXabari, xatolikXabari } from "@/lib/toast";
import { hammasiHolati, ochirilganSoni, tanlovniOzgartirish, tanlovniQisqartirish, topilmaganIdlar } from "@/lib/kopTanlov";

type Sozlama = {
  /** Ro'yxatdagi (filtrdan o'tgan) yozuvlar id'lari: belgi faqat shular orasida amal qiladi. */
  mavjudIds: readonly string[];
  /** POST .../bulk-delete. */
  api: (ids: string[]) => Promise<unknown>;
  /** Ro'yxatni serverdan qayta yuklash. */
  yangilash: () => Promise<unknown> | void;
  /** Tasdiq matni ("3 ta xaridor o'chiriladi..."). */
  tasdiqMatni: (soni: number) => string;
};

/**
 * Ro'yxatda belgilash va belgilanganlarni birdaniga o'chirish: tasdiq so'raladi; 200 — xabar, belgilar tozalanadi, ro'yxat yangilanadi;
 * 404 — hech narsa o'chmagan, topilmaganlar belgidan olinadi va ro'yxat yangilanadi (qayta urinish kifoya).
 */
export function useKopOchirish({ mavjudIds, api, yangilash, tasdiqMatni }: Sozlama) {
  const { t } = useTranslation("common");
  const [tanlanganXom, setTanlanganXom] = useState<ReadonlySet<string>>(() => new Set());
  const [kesildi, setKesildi] = useState(false);
  const [band, setBand] = useState(false);
  // Ro'yxatda endi yo'q (o'chirilgan yoki filtrdan chiqqan) yozuvlar belgisi hisobga olinmaydi.
  const tanlangan = useMemo(() => tanlovniQisqartirish(tanlanganXom, mavjudIds), [tanlanganXom, mavjudIds]);

  function ozgartirish(ids: readonly string[], belgilansin: boolean) {
    const natija = tanlovniOzgartirish(tanlangan, ids, belgilansin);
    setTanlanganXom(natija.tanlangan);
    setKesildi(natija.kesildi);
  }

  function tozalash() {
    setTanlanganXom(new Set());
    setKesildi(false);
  }

  async function ochirish() {
    const ids = [...tanlangan];
    if (!ids.length || band) return;
    if (!(await tasdiqSorash(tasdiqMatni(ids.length), { ochirish: true })).rozi) return;
    setBand(true);
    try {
      const javob = await api(ids);
      muvaffaqiyatXabari(t("bulkDelete.deleted", { count: ochirilganSoni(javob, ids.length) }));
      tozalash();
      await yangilash();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const topilmagan = topilmaganIdlar(error.response.data);
        xatolikXabari(t("bulkDelete.notFound", { count: topilmagan.length || ids.length }));
        setTanlanganXom((joriy) => tanlovniOzgartirish(joriy, topilmagan, false).tanlangan);
        await yangilash();
      } else {
        xatolikXabari(getApiErrorMessage(error));
      }
    } finally {
      setBand(false);
    }
  }

  return {
    tanlangan,
    band,
    kesildi,
    ozgartirish,
    tozalash,
    ochirish,
    /** Katak holati ko'rinib turgan qatorlar uchun. */
    holat: (korinadigan: readonly string[]) => {
      const h = hammasiHolati(tanlangan, korinadigan);
      return h === "hammasi" ? true : h === "qisman" ? ("qisman" as const) : false;
    },
  };
}
