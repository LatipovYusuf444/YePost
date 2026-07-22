import KirimKorishModal from "./omborModallari/KirimKorishModal";
import RealizatsiyaKorishModal from "./omborModallari/RealizatsiyaKorishModal";
import type { Mahsulot as OmborMahsulot, OmborItem } from "./omborModallari/types";
import { useHisobotRealData } from "./HisobotRealData";
import type { HisobKitobHujjati, Maxsulot, Tanlov } from "./types";

// O'zaro hisob-kitobdagi TOVAR hujjatlarini OmborUchot Korish modallarida ochamiz.
// To'lov hujjatlari (kassaKirim/tolov) hozircha ochilmaydi — null qaytadi.

const MASUL_SHAXS = "Tizim";

function omborMahsulotlarga(maxsulotlar: Maxsulot[]): OmborMahsulot[] {
  return maxsulotlar.map((m) => ({
  id: m.id,
  nomi: m.nomi,
  birlik: m.birlik,
  narx: m.sotuvNarx,
  shtrixKod: m.barkod,
  tanNarx: m.tanNarx,
  sotuvNarx: m.sotuvNarx,
  ulgurjiNarx: m.ulgurjiNarx,
  }));
}

function omborlarga(tanlovlar: Tanlov[]): OmborItem[] {
  return tanlovlar.map((o) => ({
  id: o.id,
  nomi: o.nomi,
  manzil: "—",
  faol: true,
  }));
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
  const { maxsulotlar, omborlar: omborTanlovlari } = useHisobotRealData();
  const omborMahsulotlar = omborMahsulotlarga(maxsulotlar);
  const omborlar = omborlarga(omborTanlovlari);
  const mahsulot = maxsulotlar.find((m) => m.id === hujjat.productId);
  const summa = hujjat.rasxod || hujjat.prixod;
  const soni = hujjat.soni ?? 1;
  const tanNarx = soni > 0 ? summa / soni : summa;
  const omborId = omborTanlovlari[0]?.id ?? "";
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
