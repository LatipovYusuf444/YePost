/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { hisobotTanlovlariniOlish } from "@/api/reportsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { AuditYozuvi, FoydaXarajatYozuvi, HisobKitobHujjati, KassaHujjati, KirimChiqim, Kontragent, MahsulotFoydasi, Maxsulot, Tanlov, TovarHarakati, HisobotTab } from "./types";

type ApiTanlov = Tanlov & {
  name?: string;
  productId?: string;
  fullName?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  categoryId?: string;
  barcode?: string | null;
  article?: string | null;
  unit?: { name?: string; shortName?: string } | null;
  category?: { id?: string; name?: string } | null;
  product?: { id?: string; name?: string } | null;
  price?: { costPrice?: number | string; retailPrice?: number | string; wholesalePrice?: number | string } | null;
  params?: Record<string, unknown> | null;
};

type RealData = {
  yuklanmoqda: boolean;
  xato: string;
  maxsulotlar: Maxsulot[];
  omborlar: Tanlov[];
  filiallar: Tanlov[];
  kategoriyalar: Tanlov[];
  mijozlar: Tanlov[];
  kompaniyalar: Tanlov[];
  yetkazibBeruvchilar: Tanlov[];
  variatsiyalar: Tanlov[];
  xarakteristikalar: Tanlov[];
  tovarHarakati: TovarHarakati[];
  kontragentlar: Kontragent[];
  hisobKitob: HisobKitobHujjati[];
  mahsulotFoydasi: MahsulotFoydasi[];
  foydaXarajat: FoydaXarajatYozuvi[];
  kirimChiqim: KirimChiqim[];
  kassaHujjatlar: KassaHujjati[];
  audit: AuditYozuvi[];
};

const boshData: RealData = {
  yuklanmoqda: true, xato: "", maxsulotlar: [], omborlar: [], filiallar: [], kategoriyalar: [],
  mijozlar: [], kompaniyalar: [], yetkazibBeruvchilar: [], variatsiyalar: [], xarakteristikalar: [],
  tovarHarakati: [], kontragentlar: [], hisobKitob: [], mahsulotFoydasi: [], foydaXarajat: [],
  kirimChiqim: [], kassaHujjatlar: [], audit: [],
};

const HisobotContext = createContext<RealData>(boshData);
// Bo'sh nom ("") ham "nom yo'q" hisoblanadi: aks holda tanlov ro'yxatida matnsiz qator chiqib qolardi.
const tanlovNomi = (item: ApiTanlov) => item.name?.trim() || item.fullName?.trim() ||
  ([item.firstName, item.lastName].filter(Boolean).join(" ") || item.username || item.id);

// Variatsiya (modifikatsiya) nomi: "Mahsulot — variant". Variantning o'z nomi bo'sh bo'lsa xususiyatlari yoki "Asosiy variant" ko'rsatiladi.
function variatsiyaNomi(item: ApiTanlov, mahsulotNomlari: Map<string, string>) {
  // Mahsulot nomi topilmasa, variantni ajratib turish uchun shtrix kod ko'rsatiladi.
  const mahsulot = item.product?.name?.trim() || mahsulotNomlari.get(item.productId ?? item.product?.id ?? "") || item.barcode || "";
  const xususiyatlar = Object.entries(item.params ?? {})
    .filter(([, qiymat]) => qiymat !== null && qiymat !== undefined && String(qiymat).trim())
    .map(([kalit, qiymat]) => `${kalit}: ${String(qiymat)}`)
    .join(", ");
  const variant = item.name?.trim() || xususiyatlar || "Asosiy variant";
  return [mahsulot, variant].filter(Boolean).join(" — ");
}

export function HisobotRealDataProvider({ children, tab }: { children: ReactNode; tab: HisobotTab }) {
  const [data, setData] = useState<RealData>(boshData);

  useEffect(() => {
    let active = true;
    setData(boshData);
    hisobotTanlovlariniOlish(tab)
      .then((selections) => {
        if (!active) return;
        const products = selections.products as ApiTanlov[];
        const modifications = selections.modifications as ApiTanlov[];
        const mahsulotNomlari = new Map(products.map((product) => [product.id, tanlovNomi(product)]));
        const maxsulotlar: Maxsulot[] = products.map((product) => {
          const modification = modifications.find((item) => item.product?.id === product.id || item.productId === product.id);
          return {
            id: product.id,
            nomi: tanlovNomi(product),
            categoryId: product.category?.id ?? product.categoryId ?? "",
            boshQoldiq: 0,
            barkod: modification?.barcode ?? product.barcode ?? "",
            artikul: modification?.article ?? product.article ?? "",
            birlik: product.unit?.shortName ?? product.unit?.name ?? "",
            tanNarx: Number(modification?.price?.costPrice ?? 0),
            sotuvNarx: Number(modification?.price?.retailPrice ?? 0),
            ulgurjiNarx: Number(modification?.price?.wholesalePrice ?? 0),
          };
        });
        const xarakteristikalar = modifications.flatMap((item) =>
          Object.entries(item.params ?? {}).map(([key, value]) => ({ id: `${key}:${String(value)}`, nomi: `${key}: ${String(value)}` }))
        );
        setData({
          ...boshData,
          yuklanmoqda: false,
          maxsulotlar,
          omborlar: selections.warehouses.map((item) => ({ id: item.id, nomi: tanlovNomi(item as ApiTanlov) })),
          filiallar: selections.branches.map((item) => ({ id: item.id, nomi: tanlovNomi(item as ApiTanlov) })),
          kategoriyalar: selections.categories.map((item) => ({ id: item.id, nomi: tanlovNomi(item as ApiTanlov) })),
          mijozlar: selections.customers.map((item) => ({ id: item.id, nomi: tanlovNomi(item as ApiTanlov) })),
          kompaniyalar: selections.companies.map((item) => ({ id: item.id, nomi: tanlovNomi(item as ApiTanlov) })),
          yetkazibBeruvchilar: selections.suppliers.map((item) => ({ id: item.id, nomi: tanlovNomi(item as ApiTanlov) })),
          variatsiyalar: modifications.map((item) => ({ id: item.id, nomi: variatsiyaNomi(item, mahsulotNomlari) })),
          xarakteristikalar: Array.from(new Map(xarakteristikalar.map((item) => [item.id, item])).values()),
        });
      })
      .catch((error) => {
        if (active) setData((current) => ({ ...current, yuklanmoqda: false, xato: getApiErrorMessage(error) }));
      });
    return () => { active = false; };
  }, [tab]);

  const value = useMemo(() => data, [data]);
  return <HisobotContext.Provider value={value}>{children}</HisobotContext.Provider>;
}

export function useHisobotRealData() {
  return useContext(HisobotContext);
}
