import { useCallback, useMemo, useState, type SetStateAction } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { xatoKodi } from "@/api/xatoKodlari";
import { serverXatoMaydonlari, type XatoMaydonQoidasi } from "@/lib/maydonXatolari";
import {
  VAZIFA_TURLARI,
  boshNatijaFormasi,
  contactTanasi as contactTanasiniYasash,
  contactTuriniOzgartirish,
  muddatOtganmi,
  natijaXatolari,
  natijaniOzgartirish,
  serverXatoMaydoni,
  yakunlashTanasi as yakunlashTanasiniYasash,
  type KeyingiForma,
  type Mavzular,
  type NatijaBoshlangich,
  type NatijaForma,
} from "@/lib/crmNatija";
import type { ActivityYakunlash, ContactNatijasi, ContactTuri, ContactYaratish } from "@/types/crm";

// Faoliyat natijasi formasining holati: ota komponent (mijoz kartasi, vazifani yakunlash oynasi) egalik qiladi,
// <NatijaFormasi natija={...} /> faqat chizadi.

/** Mas'ul tanlash uchun xodim. */
export type NatijaXodimi = { id: string; nom: string };
/** "Zakaz olindi" da bog'lanadigan sotuv. */
export type NatijaSotuvi = { id: string; docNumber?: string | null; date?: string | null; total?: number | string | null; /** Tayyor summa matni (valyuta bilan); berilsa `total` o'rniga. */ jamiMatni?: string };

// Validatsiya xatosi `errors[].field` (yakunlashda "contact.*" ichida) -> forma maydoni.
const SERVER_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  type: { maydonlar: ["type", "contact.type"] },
  result: { maydonlar: ["result", "contact.result"] },
  rejectReason: { maydonlar: ["rejectReason", "contact.rejectReason"] },
  saleId: { maydonlar: ["saleId", "contact.saleId"] },
  text: { maydonlar: ["text", "contact.text"] },
  nextTask: { maydonlar: ["nextTask"] },
  "nextTask.subject": { maydonlar: ["nextTask.subject"] },
  "nextTask.dueAt": { maydonlar: ["nextTask.dueAt", "nextTask.remindAt"] },
  "nextTask.assigneeId": { maydonlar: ["nextTask.assigneeId"] },
  "nextTask.type": { maydonlar: ["nextTask.type"] },
};

/** Eng ustki oynadagi birinchi xatoli maydonga suradi. */
export function birinchiXatogaSurish() {
  window.setTimeout(() => {
    const oynalar = [...document.querySelectorAll(".app-modal-compact")].reverse();
    const ildiz = oynalar.find((oyna) => oyna.querySelector("[data-maydon-xato='true']")) ?? document;
    ildiz.querySelector("[data-maydon-xato='true']")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 60);
}

export function useNatijaFormasi(boshlangich: NatijaBoshlangich = {}) {
  const { t } = useTranslation("crm");
  const mavzular = useMemo<Mavzular>(
    () => Object.fromEntries(VAZIFA_TURLARI.map((tur) => [tur, t(`forma.standartMavzu.${tur}`)])),
    [t]
  );
  // Boshlang'ich qiymat faqat birinchi chizishda olinadi (tozala ham shunga qaytaradi).
  const [bosh] = useState(boshlangich);
  const [forma, setFormaAsl] = useState<NatijaForma>(() => boshNatijaFormasi(bosh, new Date(), mavzular));
  const [tekshirildi, setTekshirildi] = useState(false);
  const [serverXatolari, setServerXatolari] = useState<Record<string, string>>({});
  const [ozgarishBor, setOzgarishBor] = useState(false);

  // Har qanday o'zgarish: server xatolari tozalanadi (mijoz tekshiruvi esa jonli qayta hisoblanadi).
  const setForma = useCallback((yangi: SetStateAction<NatijaForma>) => {
    setFormaAsl(yangi);
    setOzgarishBor(true);
    setServerXatolari((joriy) => (Object.keys(joriy).length ? {} : joriy));
  }, []);

  const natijaTanla = useCallback((result: ContactNatijasi) => setForma((f) => natijaniOzgartirish(f, result, new Date(), mavzular)), [mavzular, setForma]);
  // `jim` — dastur o'zi o'rnatdi (qat'iy tur): saqlanmagan o'zgarish hisoblanmaydi.
  const turTanla = useCallback(
    (type: ContactTuri, jim = false) => {
      if (jim) setFormaAsl((f) => contactTuriniOzgartirish(f, type, mavzular));
      else setForma((f) => contactTuriniOzgartirish(f, type, mavzular));
    },
    [mavzular, setForma]
  );
  // Foydalanuvchi keyingi qadamni o'zgartirdi — natija almashsa ham taklif ustidan yozilmaydi.
  const keyinginiOzgartir = useCallback(
    (qism: Partial<KeyingiForma>) => setForma((f) => ({ ...f, keyingiQolda: true, keyingi: { ...f.keyingi, ...qism } })),
    [setForma]
  );
  const keyingiOchiqligi = useCallback((ochiq: boolean) => setForma((f) => ({ ...f, keyingiOchiq: ochiq })), [setForma]);

  const mijozXatolari = useMemo(() => (tekshirildi ? natijaXatolari(forma) : {}), [forma, tekshirildi]);
  const xatolar = useMemo<Record<string, string>>(() => {
    const tarjima = Object.fromEntries(Object.entries(mijozXatolari).map(([yol, kod]) => [yol, t(`forma.xatolar.${kod}`)]));
    return { ...serverXatolari, ...tarjima };
  }, [mijozXatolari, serverXatolari, t]);
  const ogohlantirish = muddatOtganmi(forma) ? t("forma.otganMuddat") : "";

  /** Yuborishdan oldin: xato bo'lsa maydonlarda ko'rsatadi va `false`. */
  const tekshir = useCallback(() => {
    setTekshirildi(true);
    const bor = Object.keys(natijaXatolari(forma)).length > 0;
    if (bor) birinchiXatogaSurish();
    return !bor;
  }, [forma]);

  /** Server xatosini maydonga bog'laydi (matn global toast bilan bir xil); bog'lansa `true`. */
  const serverXatosi = useCallback((error: unknown) => {
    const tana = axios.isAxiosError(error) ? error.response?.data : undefined;
    const maydon = serverXatoMaydoni(xatoKodi(tana));
    const yangi = maydon ? { [maydon]: getApiErrorMessage(error) } : serverXatoMaydonlari(tana, SERVER_QOIDALARI);
    setServerXatolari(yangi);
    if (Object.keys(yangi).length) birinchiXatogaSurish();
    return Object.keys(yangi).length > 0;
  }, []);

  const tozala = useCallback(() => {
    setFormaAsl(boshNatijaFormasi(bosh, new Date(), mavzular));
    setTekshirildi(false);
    setServerXatolari({});
    setOzgarishBor(false);
  }, [bosh, mavzular]);

  return {
    forma,
    setForma,
    natijaTanla,
    turTanla,
    keyinginiOzgartir,
    keyingiOchiqligi,
    /** Maydon yo'li -> tarjima qilingan matn ("result", "rejectReason", "saleId", "nextTask", "nextTask.subject", "nextTask.dueAt", ...). */
    xatolar,
    /** Muddat o'tmishda — xato emas, sariq ogohlantirish matni ("" — yo'q). */
    ogohlantirish,
    ozgarishBor,
    mavzular,
    tekshir,
    serverXatosi,
    /** Formani boshlang'ich holatga qaytaradi (masalan, saqlangandan keyin). */
    tozala,
    contactTanasi: (partnerId: string): ContactYaratish => contactTanasiniYasash(forma, partnerId),
    yakunlashTanasi: (): ActivityYakunlash => yakunlashTanasiniYasash(forma),
  };
}

export type NatijaFormasiBoshqaruvi = ReturnType<typeof useNatijaFormasi>;
