import KirimKorishModal from "@/Pages/OmborUchot/KirimKorishModal";
import RealizatsiyaKorishModal from "@/Pages/OmborUchot/RealizatsiyaKorishModal";
import type { Mahsulot as OmborMahsulot, OmborItem } from "@/Pages/OmborUchot/types";
import { mockMaxsulotlar, mockOmborlar } from "./mockData";
import type { HisobKitobHujjati } from "./types";

// O'zaro hisob-kitobdagi TOVAR hujjatlarini OmborUchot Korish modallarida ochamiz.
// To'lov hujjatlari (kassaKirim/tolov) hozircha ochilmaydi — null qaytadi.

const MASUL_SHAXS = "Abdulaziz";

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

// Hujjat tovar hujjatimi (ochsa bo'ladimi)?
export function ochilaganHujjatmi(h: HisobKitobHujjati) {
  return h.turi === "realizatsiya" || h.turi === "xarid";
}

export default function HisobKitobHujjatKorish({
  hujjat,
  kontragent,
  onYopish,
}: {
  hujjat: HisobKitobHujjati;
  kontragent: string;
  onYopish: () => void;
}) {
  const mahsulot = mockMaxsulotlar.find((m) => m.id === hujjat.productId);
  const summa = hujjat.rasxod || hujjat.prixod;
  const soni = hujjat.soni ?? 1;
  const tanNarx = soni > 0 ? summa / soni : summa;
  const omborId = mockOmborlar[0]?.id ?? "";
  const yoq = () => {};

  const satr = {
    id: `${hujjat.id}-1`,
    mahsulotId: hujjat.productId ?? "",
    shtrixKod: mahsulot?.barkod ?? "",
    omborId,
    soni,
    tanNarx,
    sotuvNarx: mahsulot?.sotuvNarx ?? tanNarx,
    ulgurjiNarx: mahsulot?.ulgurjiNarx ?? tanNarx,
  };

  if (hujjat.turi === "realizatsiya") {
    return (
      <RealizatsiyaKorishModal
        hujjat={{
          id: hujjat.id,
          nomi: hujjat.hujjat,
          mijoz: kontragent,
          kompaniya: "",
          sana: hujjat.sana.slice(0, 10),
          masulShaxs: MASUL_SHAXS,
          holati: "tasdiqlangan",
          satrlar: [satr],
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

  if (hujjat.turi === "xarid") {
    return (
      <KirimKorishModal
        hujjat={{
          id: hujjat.id,
          nomi: hujjat.hujjat,
          yetkazibBeruvchi: kontragent,
          sana: hujjat.sana.slice(0, 10),
          masulShaxs: MASUL_SHAXS,
          holati: "tasdiqlangan",
          satrlar: [satr],
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

  return null; // to'lov hujjatlari — keyinroq
}
