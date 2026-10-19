import { useSyncExternalStore } from "react";
import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { joriyOgohlantirish, ogohlantirishgaJavob, ogohlantirishgaObuna } from "@/lib/ogohlantirishSorovi";

// Tasdiqlash vaqtidagi backend ogohlantirishi (hujjat sanasi tasdiqlangan inventarizatsiyadan oldin) uchun
// "Davom etasizmi?" oynasi. Ilova ildizida bir marta ulanadi; so'rovni API qatlami (ogohlantirishBilanBajarish) yuboradi.
export default function HujjatOgohlantirishOynasi() {
  const { t } = useTranslation("common");
  const sorov = useSyncExternalStore(ogohlantirishgaObuna, joriyOgohlantirish, joriyOgohlantirish);
  if (!sorov) return null;

  return (
    <TasdiqlashOynasi
      key={sorov.id}
      ikonka={<TriangleAlert size={24} />}
      ohang="sariq"
      sarlavha={t("hujjatOgohlantirish.title")}
      nom={sorov.nom || t("hujjatOgohlantirish.defaultName")}
      tavsif={sorov.matn}
      izoh={t("hujjatOgohlantirish.question")}
      ortgaMatni={t("hujjatOgohlantirish.no")}
      tasdiqMatni={t("hujjatOgohlantirish.yes")}
      jarayonMatni={t("hujjatOgohlantirish.continuing")}
      onTasdiq={async () => ogohlantirishgaJavob(sorov.id, true)}
      onYopish={() => ogohlantirishgaJavob(sorov.id, false)}
    />
  );
}
