import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { pulMatni } from "@/lib/valyuta";
import type { ChiqimHujjati, KirimHujjati, KochirishHujjati } from "@/types/ombor";
import type { Sotuv } from "@/types/savdo";
import BoshqaruvXulosasi from "./BoshqaruvXulosasi";
import EtiborMarkazi from "./EtiborMarkazi";
import MoliyaGrafigi from "./MoliyaGrafigi";
import {
  buyurtmaKorsatkichlariniOlish,
  moliyaQiymatlari,
  ogohlantirishlarniHisoblash,
  type BuyurtmaKorsatkichlari,
  type MoliyaJavobi,
} from "./boshqaruvMalumotlari";

type Props = {
  dateFrom: string;
  dateTo: string;
  yangilanish: number;
  // Monitoring sahifasi allaqachon yuklagan ma'lumotlar (qayta so'ralmaydi).
  moliyaJavobi: MoliyaJavobi | null;
  moliyaYuklanmoqda: boolean;
  moliyaXato: string;
  sotuvlar: Sotuv[];
  sotuvYuklanmoqda: boolean;
  sotuvXato: string;
  omborKamQolgan: number;
  omborManfiy: number;
  omborYuklanmoqda: boolean;
  omborXato: string;
  kirimHujjatlari: KirimHujjati[];
  chiqimHujjatlari: ChiqimHujjati[];
  kochirishHujjatlari: KochirishHujjati[];
  hujjatlarYuklanmoqda: boolean;
  hujjatlarXato: string;
};

const MANBALAR_SONI = 5;

// Monitoring → Savdo va moliya: boshqaruv xulosasi, e'tibor talab qiladigan holatlar va moliyaviy grafik.
// Hammasi real ma'lumotlardan hisoblanadi; ma'lumot yo'q bo'lsa bo'sh holat ko'rsatiladi (namuna ma'lumot yo'q).
export default function BoshqaruvPaneli(props: Props) {
  const { t } = useTranslation("monitoring");
  const {
    yangilanish,
    moliyaJavobi,
    sotuvlar,
    sotuvXato,
    moliyaXato,
    omborKamQolgan,
    omborManfiy,
    omborXato,
    kirimHujjatlari,
    chiqimHujjatlari,
    kochirishHujjatlari,
    hujjatlarXato,
  } = props;
  const [buyurtma, setBuyurtma] = useState<BuyurtmaKorsatkichlari | null>(null);
  const [buyurtmaYuklanmoqda, setBuyurtmaYuklanmoqda] = useState(true);
  const [buyurtmaXato, setBuyurtmaXato] = useState("");
  const [buyurtmaQayta, setBuyurtmaQayta] = useState(0);

  useEffect(() => {
    let faol = true;
    setBuyurtmaYuklanmoqda(true);
    setBuyurtmaXato("");
    buyurtmaKorsatkichlariniOlish()
      .then((natija) => {
        if (faol) setBuyurtma(natija);
      })
      .catch((error) => {
        if (faol) setBuyurtmaXato(getApiErrorMessage(error));
      })
      .finally(() => {
        if (faol) setBuyurtmaYuklanmoqda(false);
      });
    return () => {
      faol = false;
    };
  }, [yangilanish, buyurtmaQayta]);

  const moliya = useMemo(() => moliyaQiymatlari(moliyaJavobi), [moliyaJavobi]);

  const ogohlantirishNatijasi = useMemo(() => {
    const qoralama = (royxat: Array<{ status?: string }>) =>
      royxat.filter((hujjat) => String(hujjat.status ?? "").toUpperCase() === "DRAFT").length;
    return ogohlantirishlarniHisoblash({
      sotuvlar: sotuvXato ? [] : sotuvlar,
      buyurtma: buyurtmaXato ? null : buyurtma,
      sofFoyda: moliyaXato || !moliya ? null : moliya.sofFoyda,
      omborKamQolgan: omborXato ? 0 : omborKamQolgan,
      omborManfiy: omborXato ? 0 : omborManfiy,
      qoralamaHujjatlari: hujjatlarXato
        ? 0
        : qoralama(kirimHujjatlari) + qoralama(chiqimHujjatlari) + qoralama(kochirishHujjatlari),
      mavjud: {
        moliya: !moliyaXato && moliya != null,
        ombor: !omborXato,
        buyurtma: !buyurtmaXato && buyurtma != null,
        sotuv: !sotuvXato,
        hujjat: !hujjatlarXato,
      },
      pul: (summa) => pulMatni(summa, "UZS", true, t("dynamics.currency")),
    });
  }, [
    sotuvlar,
    sotuvXato,
    buyurtma,
    buyurtmaXato,
    moliya,
    moliyaXato,
    omborKamQolgan,
    omborManfiy,
    omborXato,
    kirimHujjatlari,
    chiqimHujjatlari,
    kochirishHujjatlari,
    hujjatlarXato,
    t,
  ]);

  const xatolar = [props.sotuvXato, props.omborXato, buyurtmaXato, props.moliyaXato, props.hujjatlarXato].filter(Boolean);
  const alertYuklanmoqda =
    props.sotuvYuklanmoqda || props.omborYuklanmoqda || buyurtmaYuklanmoqda || props.moliyaYuklanmoqda || props.hujjatlarYuklanmoqda;

  return (
    <div className="space-y-6">
      <BoshqaruvXulosasi
        buyurtma={{ malumot: buyurtma, yuklanmoqda: buyurtmaYuklanmoqda, xato: buyurtmaXato }}
        onBuyurtmaQayta={() => setBuyurtmaQayta((son) => son + 1)}
        moliya={moliya}
        moliyaYuklanmoqda={props.moliyaYuklanmoqda}
        moliyaXato={props.moliyaXato}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:items-stretch">
        {/* Telefon va planshetda avval e'tibor talab qiladigan holatlar, keyin grafik ko'rsatiladi. */}
        <div className="order-2 grid min-w-0 xl:order-1">
          <MoliyaGrafigi dateFrom={props.dateFrom} dateTo={props.dateTo} yangilanish={yangilanish} />
        </div>
        <div className="order-1 flex min-w-0 xl:order-2">
          <EtiborMarkazi
            className="w-full"
            ogohlantirishlar={ogohlantirishNatijasi.ogohlantirishlar}
            otganTekshiruvlar={ogohlantirishNatijasi.otganTekshiruvlar}
            yuklanmoqda={alertYuklanmoqda}
            xato={xatolar.length >= MANBALAR_SONI ? xatolar[0] : ""}
            qismanXato={xatolar.length > 0 && xatolar.length < MANBALAR_SONI}
          />
        </div>
      </div>
    </div>
  );
}
