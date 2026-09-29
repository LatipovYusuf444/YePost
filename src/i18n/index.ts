import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import commonUz from "./locales/uz/common.json";
import commonRu from "./locales/ru/common.json";
import navUz from "./locales/uz/nav.json";
import navRu from "./locales/ru/nav.json";
import topbarUz from "./locales/uz/topbar.json";
import topbarRu from "./locales/ru/topbar.json";
import authUz from "./locales/uz/auth.json";
import authRu from "./locales/ru/auth.json";
import omborKichikUz from "./locales/uz/ombor_kichik.json";
import omborKichikRu from "./locales/ru/ombor_kichik.json";
import omborModalUz from "./locales/uz/ombor_modal.json";
import omborModalRu from "./locales/ru/ombor_modal.json";
import omborRoyxatUz from "./locales/uz/ombor_royxat.json";
import omborRoyxatRu from "./locales/ru/ombor_royxat.json";
import omborHarakatUz from "./locales/uz/ombor_harakat.json";
import omborHarakatRu from "./locales/ru/ombor_harakat.json";
import omborBoshUz from "./locales/uz/ombor_bosh.json";
import omborBoshRu from "./locales/ru/ombor_bosh.json";
import omborHujjatUz from "./locales/uz/ombor_hujjat.json";
import omborHujjatRu from "./locales/ru/ombor_hujjat.json";
import mahsulotlarUz from "./locales/uz/mahsulotlar.json";
import mahsulotlarRu from "./locales/ru/mahsulotlar.json";
import savdoKichikUz from "./locales/uz/savdo_kichik.json";
import savdoKichikRu from "./locales/ru/savdo_kichik.json";
import savdoTolovUz from "./locales/uz/savdo_tolov.json";
import savdoTolovRu from "./locales/ru/savdo_tolov.json";
import savdoBoshUz from "./locales/uz/savdo_bosh.json";
import savdoBoshRu from "./locales/ru/savdo_bosh.json";
import savdoQaytarishUz from "./locales/uz/savdo_qaytarish.json";
import savdoQaytarishRu from "./locales/ru/savdo_qaytarish.json";
import kassaUz from "./locales/uz/kassa.json";
import kassaRu from "./locales/ru/kassa.json";
import savdoYangiUz from "./locales/uz/savdo_yangi.json";
import savdoYangiRu from "./locales/ru/savdo_yangi.json";
import savdoTafsilotUz from "./locales/uz/savdo_tafsilot.json";
import savdoTafsilotRu from "./locales/ru/savdo_tafsilot.json";
import monitoringUz from "./locales/uz/monitoring.json";
import monitoringRu from "./locales/ru/monitoring.json";
import boshSahifaUz from "./locales/uz/bosh_sahifa.json";
import boshSahifaRu from "./locales/ru/bosh_sahifa.json";
import qarzdorlikUz from "./locales/uz/qarzdorlik.json";
import qarzdorlikRu from "./locales/ru/qarzdorlik.json";
import mijozlarUz from "./locales/uz/mijozlar.json";
import mijozlarRu from "./locales/ru/mijozlar.json";
import hisobotlarUz from "./locales/uz/hisobotlar.json";
import hisobotlarRu from "./locales/ru/hisobotlar.json";
import sozlamalarUchotUz from "./locales/uz/sozlamalar_uchot.json";
import sozlamalarUchotRu from "./locales/ru/sozlamalar_uchot.json";
import kassaUchotUz from "./locales/uz/kassa_uchot.json";
import kassaUchotRu from "./locales/ru/kassa_uchot.json";
import xaridorUchotUz from "./locales/uz/xaridor_uchot.json";
import xaridorUchotRu from "./locales/ru/xaridor_uchot.json";
import supportUz from "./locales/uz/support.json";
import supportRu from "./locales/ru/support.json";

export const LANG_STORAGE_KEY = "yepost-lang";
export const SUPPORTED_LANGUAGES = ["uz", "ru"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function getStoredLanguage(): AppLanguage {
  if (typeof window === "undefined") return "uz";
  const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
  return stored === "ru" ? "ru" : "uz";
}

void i18n.use(initReactI18next).init({
  resources: {
    uz: {
      common: commonUz,
      nav: navUz,
      topbar: topbarUz,
      auth: authUz,
      ombor_kichik: omborKichikUz,
      ombor_modal: omborModalUz,
      ombor_royxat: omborRoyxatUz,
      ombor_harakat: omborHarakatUz,
      ombor_bosh: omborBoshUz,
      ombor_hujjat: omborHujjatUz,
      mahsulotlar: mahsulotlarUz,
      savdo_kichik: savdoKichikUz,
      savdo_tolov: savdoTolovUz,
      savdo_bosh: savdoBoshUz,
      savdo_qaytarish: savdoQaytarishUz,
      kassa: kassaUz,
      savdo_yangi: savdoYangiUz,
      savdo_tafsilot: savdoTafsilotUz,
      monitoring: monitoringUz,
      bosh_sahifa: boshSahifaUz,
      qarzdorlik: qarzdorlikUz,
      mijozlar: mijozlarUz,
      hisobotlar: hisobotlarUz,
      sozlamalar_uchot: sozlamalarUchotUz,
      kassa_uchot: kassaUchotUz,
      xaridor_uchot: xaridorUchotUz,
      support: supportUz,
    },
    ru: {
      common: commonRu,
      nav: navRu,
      topbar: topbarRu,
      auth: authRu,
      ombor_kichik: omborKichikRu,
      ombor_modal: omborModalRu,
      ombor_royxat: omborRoyxatRu,
      ombor_harakat: omborHarakatRu,
      ombor_bosh: omborBoshRu,
      ombor_hujjat: omborHujjatRu,
      mahsulotlar: mahsulotlarRu,
      savdo_kichik: savdoKichikRu,
      savdo_tolov: savdoTolovRu,
      savdo_bosh: savdoBoshRu,
      savdo_qaytarish: savdoQaytarishRu,
      kassa: kassaRu,
      savdo_yangi: savdoYangiRu,
      savdo_tafsilot: savdoTafsilotRu,
      monitoring: monitoringRu,
      bosh_sahifa: boshSahifaRu,
      qarzdorlik: qarzdorlikRu,
      mijozlar: mijozlarRu,
      hisobotlar: hisobotlarRu,
      sozlamalar_uchot: sozlamalarUchotRu,
      kassa_uchot: kassaUchotRu,
      xaridor_uchot: xaridorUchotRu,
      support: supportRu,
    },
  },
  lng: getStoredLanguage(),
  fallbackLng: "uz",
  ns: [
    "common",
    "nav",
    "topbar",
    "auth",
    "ombor_kichik",
    "ombor_modal",
    "ombor_royxat",
    "ombor_harakat",
    "ombor_bosh",
    "ombor_hujjat",
    "mahsulotlar",
    "savdo_kichik",
    "savdo_tolov",
    "savdo_bosh",
    "savdo_qaytarish",
    "kassa",
    "savdo_yangi",
    "savdo_tafsilot",
    "monitoring",
    "bosh_sahifa",
    "qarzdorlik",
    "mijozlar",
    "hisobotlar",
    "sozlamalar_uchot",
    "kassa_uchot",
    "xaridor_uchot",
    "support",
  ],
  defaultNS: "common",
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

i18n.on("languageChanged", (lng) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LANG_STORAGE_KEY, lng);
  document.documentElement.lang = lng;
});

if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.language;
}

export default i18n;
