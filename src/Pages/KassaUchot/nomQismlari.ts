import type { TFunction } from "i18next";
import { mahsulotlarQisqacha } from "@/lib/kassaNomlari";
import type { KassaSotuvi } from "@/lib/kassaSotuvKeshi";
import type { KassaAmaliyoti } from "./types";

// Amaliyot qaysi sotuvga tegishli: sotuv to'lovida `refId`, sotuvga bog'langan kassa amaliyotida `saleId`.
export function amaliyotSotuvIdsi(amaliyot: KassaAmaliyoti): string | undefined {
  if (amaliyot.backendSource === "SALE") return amaliyot.backendRefId && amaliyot.backendRefId !== amaliyot.id ? amaliyot.backendRefId : undefined;
  return amaliyot.saleId;
}

// Mijoz to'lovi o'z KAS raqami bilan, bog'langan boshlang'ich qarz esa savdodan alohida nom bilan ko'rsatiladi.
export function nomQismlari(amaliyot: KassaAmaliyoti, sotuv: KassaSotuvi | undefined, t: TFunction): { sarlavha: string; tafsilot: string } {
  const { korinadi, yana } = mahsulotlarQisqacha(sotuv?.mahsulotlar ?? []);
  const mahsulotlar = korinadi.length ? `${korinadi.join(", ")}${yana ? ` ${t("names.moreProducts", { count: yana })}` : ""}` : "";
  const boshlangichQarz = sotuv?.isOpeningDebt || /^QB-/i.test(sotuv?.raqam || amaliyot.hujjatRaqami || "");
  const hujjatNomi = (raqam: string) => t(boshlangichQarz ? "names.openingDebt" : "names.sale", { raqam });
  if (amaliyot.backendSource === "CASH_OPERATION" && amaliyot.turi === "xaridor_tolovi") {
    return {
      sarlavha: [t("types.xaridor_tolovi"), amaliyot.hujjatRaqami].filter(Boolean).join(" · "),
      tafsilot: sotuv?.raqam ? t(boshlangichQarz ? "names.paidOpeningDebt" : "names.paidSale", { raqam: sotuv.raqam }) : "",
    };
  }
  if (amaliyot.backendSource === "SALE") {
    const raqam = sotuv?.raqam || amaliyot.hujjatRaqami;
    return { sarlavha: raqam ? hujjatNomi(raqam) : t("names.salePayment"), tafsilot: mahsulotlar };
  }
  if (amaliyot.backendSource === "RETURN" && amaliyot.hujjatRaqami) {
    return { sarlavha: t("names.return", { raqam: amaliyot.hujjatRaqami }), tafsilot: "" };
  }
  const sotuvMatni = sotuv?.raqam ? hujjatNomi(sotuv.raqam) : "";
  return { sarlavha: amaliyot.nomi, tafsilot: [sotuvMatni, mahsulotlar].filter(Boolean).join(" · ") };
}
