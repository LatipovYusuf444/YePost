import { useEffect, useState } from "react";
import {
  katalogModifikatsiyalariniQoldiqTanlovigaOlish,
  omborQoldiqlariniOlish,
  qoldiqNomlariniBoyitish,
} from "@/api/savdoApi";
import type { QoldiqTanlovi } from "@/types/savdo";
import { mahsulotNomi, qoldiqBirlashtirish, qoldiqNarxi } from "./posMahsulotlari";

export type PosMahsulotlarXatosi = "" | "stock" | "warehouseStock" | "catalog";

type Natija = { kalit: string; mahsulotlar: QoldiqTanlovi[]; xato: PosMahsulotlarXatosi };

// Tanlangan ombordagi sotiladigan mahsulotlar: ombor qoldig'i + katalog (nom, narx, birliklar) birlashtiriladi.
// MahsulotTanlashModal bilan bir xil manbalar va birlashtirish qoidasi; faqat UI'siz (Bosh sahifadagi savatcha jadvali uchun).
export function usePosMahsulotlar(warehouseId: string, yangilash = 0) {
  const kalit = `${warehouseId}|${yangilash}`;
  const [natija, setNatija] = useState<Natija | null>(null);

  useEffect(() => {
    if (!warehouseId) return;
    let active = true;
    const yuklash = async () => {
      const [stockResult, catalogResult] = await Promise.allSettled([
        omborQoldiqlariniOlish(warehouseId),
        katalogModifikatsiyalariniQoldiqTanlovigaOlish(yangilash > 0),
      ]);
      if (!active) return;

      const stock =
        stockResult.status === "fulfilled"
          ? stockResult.value.filter((item) => {
              const itemWarehouseId = item.warehouseId ?? item.warehouse?.id;
              return !itemWarehouseId || String(itemWarehouseId) === warehouseId;
            })
          : [];
      const catalog = catalogResult.status === "fulfilled" ? catalogResult.value : [];
      const birlashgan = qoldiqBirlashtirish(stock, catalog);
      const xato: PosMahsulotlarXatosi =
        stockResult.status === "rejected" && catalogResult.status === "rejected"
          ? "stock"
          : stockResult.status === "rejected"
            ? "warehouseStock"
            : catalogResult.status === "rejected"
              ? "catalog"
              : "";
      setNatija({ kalit, mahsulotlar: birlashgan, xato });

      // Nomi yoki narxi hali topilmagan mahsulotlar katalogdan to'ldiriladi (faqat qoldig'i borlari).
      const toldirish = birlashgan.filter((item) => (!mahsulotNomi(item) || !qoldiqNarxi(item, "chakana")));
      if (!toldirish.length) return;
      try {
        const boyitilgan = await qoldiqNomlariniBoyitish(toldirish);
        if (!active) return;
        const xaritasi = new Map(boyitilgan.map((item) => [item.modificationId, item]));
        setNatija((joriy) =>
          joriy && joriy.kalit === kalit
            ? {
                ...joriy,
                mahsulotlar: joriy.mahsulotlar.map((item) => {
                  const yangi = xaritasi.get(item.modificationId);
                  return yangi ? qoldiqBirlashtirish([item], [yangi])[0] ?? item : item;
                }),
              }
            : joriy
        );
      } catch {
        // To'ldirish muvaffaqiyatsiz bo'lsa, mavjud ma'lumot bilan davom etiladi.
      }
    };
    void yuklash();
    return () => {
      active = false;
    };
  }, [warehouseId, yangilash, kalit]);

  const joriy = warehouseId && natija?.kalit === kalit ? natija : null;
  return {
    mahsulotlar: joriy?.mahsulotlar ?? [],
    yuklanmoqda: Boolean(warehouseId) && !joriy,
    xato: joriy?.xato ?? ("" as PosMahsulotlarXatosi),
  };
}
