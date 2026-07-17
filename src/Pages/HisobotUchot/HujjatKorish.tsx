import KirimKorishModal from "./omborModallari/KirimKorishModal";
import RealizatsiyaKorishModal from "./omborModallari/RealizatsiyaKorishModal";
import ChiqimKorishModal from "./omborModallari/ChiqimKorishModal";
import InventarizatsiyaKorishModal from "./omborModallari/InventarizatsiyaKorishModal";
import type { Mahsulot as OmborMahsulot, OmborItem } from "./omborModallari/types";
import {
  mockMaxsulotlar,
  mockMijozlar,
  mockOmborlar,
  mockYetkazibBeruvchilar,
} from "./mockData";
import type { TovarHarakati } from "./types";

// OmborUchot "Korish" modallarini HisobotUchot mock harakatidan qayta ishlatamiz.
// Har bir harakat qatoridan mos hujjat obyekti yasab beramiz (bitta satrli).

const MASUL_SHAXS = "Abdulaziz";

function nomTop(royxat: { id: string; nomi: string }[], id: string) {
  return royxat.find((item) => item.id === id)?.nomi ?? "";
}

// HisobotUchot mahsulotlarini OmborUchot Mahsulot ko'rinishiga o'tkazamiz.
const omborMahsulotlar: OmborMahsulot[] = mockMaxsulotlar.map((m) => ({
  id: m.id,
  nomi: m.nomi,
  birlik: m.birlik,
  narx: m.sotuvNarx,
  shtrixKod: m.barkod,
  tanNarx: m.tanNarx,
  sotuvNarx: m.sotuvNarx,
  ulgurjiNarx: m.ulgurjiNarx,
}));

const omborlar: OmborItem[] = mockOmborlar.map((o) => ({
  id: o.id,
  nomi: o.nomi,
  manzil: "—",
  faol: true,
}));

export default function HujjatKorish({
  harakat,
  onYopish,
}: {
  harakat: TovarHarakati;
  onYopish: () => void;
}) {
  const mahsulot = mockMaxsulotlar.find((m) => m.id === harakat.productId);
  const nomi = `${HUJJAT_PREFIX[harakat.hujjatTuri]} №${harakat.hujjatRaqam}`;
  const shtrixKod = mahsulot?.barkod ?? "";
  const tanNarx = mahsulot?.tanNarx ?? 0;

  // Report faqat ko'rish uchun — tahrirlash/tasdiqlash/bekor amallari yo'q.
  const yoq = () => {};

  if (harakat.hujjatTuri === "kirim") {
    return (
      <KirimKorishModal
        hujjat={{
          id: harakat.id,
          nomi,
          yetkazibBeruvchi: nomTop(mockYetkazibBeruvchilar, harakat.supplierId),
          sana: harakat.sana,
          masulShaxs: MASUL_SHAXS,
          holati: "tasdiqlangan",
          satrlar: [
            {
              id: `${harakat.id}-1`,
              mahsulotId: harakat.productId,
              shtrixKod,
              omborId: harakat.warehouseId,
              soni: harakat.miqdor,
              tanNarx,
              sotuvNarx: mahsulot?.sotuvNarx ?? 0,
              ulgurjiNarx: mahsulot?.ulgurjiNarx ?? 0,
            },
          ],
        }}
        mahsulotlar={omborMahsulotlar}
        omborlar={omborlar}
        onYopish={onYopish}
        onTahrirlash={yoq}
        onBekorQilish={yoq}
        onTasdiqlash={yoq}
      />
    );
  }

  if (harakat.hujjatTuri === "realizatsiya") {
    return (
      <RealizatsiyaKorishModal
        hujjat={{
          id: harakat.id,
          nomi,
          mijoz: nomTop(mockMijozlar, harakat.customerId),
          kompaniya: "",
          sana: harakat.sana,
          masulShaxs: MASUL_SHAXS,
          holati: "tasdiqlangan",
          satrlar: [
            {
              id: `${harakat.id}-1`,
              mahsulotId: harakat.productId,
              shtrixKod,
              omborId: harakat.warehouseId,
              soni: harakat.miqdor,
              tanNarx,
              sotuvNarx: mahsulot?.sotuvNarx ?? 0,
              ulgurjiNarx: mahsulot?.ulgurjiNarx ?? 0,
            },
          ],
        }}
        mahsulotlar={omborMahsulotlar}
        omborlar={omborlar}
        onYopish={onYopish}
        onTahrirlash={yoq}
        onBekorQilish={yoq}
        onTasdiqlash={yoq}
      />
    );
  }

  if (harakat.hujjatTuri === "chiqim") {
    return (
      <ChiqimKorishModal
        hujjat={{
          id: harakat.id,
          nomi,
          sabab: "Ichki chiqim",
          sana: harakat.sana,
          masulShaxs: MASUL_SHAXS,
          holati: "tasdiqlangan",
          satrlar: [
            {
              id: `${harakat.id}-1`,
              mahsulotId: harakat.productId,
              shtrixKod,
              omborId: harakat.warehouseId,
              soni: harakat.miqdor,
              tanNarx,
            },
          ],
        }}
        mahsulotlar={omborMahsulotlar}
        omborlar={omborlar}
        onYopish={onYopish}
        onTahrirlash={yoq}
        onBekorQilish={yoq}
        onTasdiqlash={yoq}
      />
    );
  }

  return (
    <InventarizatsiyaKorishModal
      hujjat={{
        id: harakat.id,
        nomi,
        sana: harakat.sana,
        masulShaxs: MASUL_SHAXS,
        holati: "tasdiqlangan",
        satrlar: [
          {
            id: `${harakat.id}-1`,
            mahsulotId: harakat.productId,
            shtrixKod,
            omborId: harakat.warehouseId,
            soni: harakat.miqdor,
            tanNarx,
          },
        ],
      }}
      mahsulotlar={omborMahsulotlar}
      omborlar={omborlar}
      onYopish={onYopish}
      onTahrirlash={yoq}
      onBekorQilish={yoq}
      onTasdiqlash={yoq}
    />
  );
}

const HUJJAT_PREFIX: Record<TovarHarakati["hujjatTuri"], string> = {
  kirim: "Kirim",
  inventarizatsiya: "Inver",
  chiqim: "Chiqim",
  realizatsiya: "Real",
};
