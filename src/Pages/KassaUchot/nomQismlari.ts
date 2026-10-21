import type { TFunction } from "i18next";
import { mahsulotlarQisqacha } from "@/lib/kassaNomlari";
import type { KassaSotuvi } from "@/lib/kassaSotuvKeshi";
import type { KassaAmaliyoti } from "./types";

// Amaliyot qaysi sotuvga tegishli: sotuv to'lovida `refId`, sotuvga bog'langan kassa amaliyotida `saleId`.
export function amaliyotSotuvIdsi(amaliyot: KassaAmaliyoti): string | undefined {
  if (amaliyot.backendSource === "SALE") return amaliyot.backendRefId && amaliyot.backendRefId !== amaliyot.id ? amaliyot.backendRefId : undefined;
  return amaliyot.saleId;
}

// Jadvaldagi "Nomi": sotuv to'lovi — "Sotuv SOT-000014" va ostida sotilgan mahsulotlar; sotuvga bog'langan kassa amaliyoti —
// o'z nomi va ostida shu sotuv; qolganlari — o'z nomi. Sotuv hali olinmagan bo'lsa ham sarlavha tayyor (hujjat raqami to'lovning o'zida bor).
export function nomQismlari(amaliyot: KassaAmaliyoti, sotuv: KassaSotuvi | undefined, t: TFunction): { sarlavha: string; tafsilot: string } {
  const { korinadi, yana } = mahsulotlarQisqacha(sotuv?.mahsulotlar ?? []);
  const mahsulotlar = korinadi.length ? `${korinadi.join(", ")}${yana ? ` ${t("names.moreProducts", { count: yana })}` : ""}` : "";
  if (amaliyot.backendSource === "SALE") {
    const raqam = sotuv?.raqam || amaliyot.hujjatRaqami;
    return { sarlavha: raqam ? t("names.sale", { raqam }) : t("names.salePayment"), tafsilot: mahsulotlar };
  }
  if (amaliyot.backendSource === "RETURN" && amaliyot.hujjatRaqami) {
    return { sarlavha: t("names.return", { raqam: amaliyot.hujjatRaqami }), tafsilot: "" };
  }
  const sotuvMatni = sotuv?.raqam ? t("names.sale", { raqam: sotuv.raqam }) : "";
  return { sarlavha: amaliyot.nomi, tafsilot: [sotuvMatni, mahsulotlar].filter(Boolean).join(" · ") };
}
