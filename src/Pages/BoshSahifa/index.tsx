import { tasdiqSorash } from "@/lib/tasdiqSorovi";
import { useInventorySettingsStore } from "@/store/inventorySettingsStore";
import { pulMatni, useValyutaStore } from "@/lib/valyuta";
import { yaxlitHalfUp } from "@/lib/yaxlitlash";
import i18n from "i18next";
import SummaMaydoni from "@/Components/common/SummaMaydoni";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  LoaderCircle,
  Minus,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
  WalletCards,
  Warehouse,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import AppSelect from "@/Components/ui/AppSelect";
import SotuvTafsilotlariModal from "@/Pages/Savdo/SotuvTafsilotlariModal";
import GoldCartIllustration from "@/Components/illustrations/GoldCartIllustration";
import {
  mijozlarRoyxatiniOlish,
  omborlarRoyxatiniOlish,
  xodimlarRoyxatiniOlish,
} from "@/api/savdoApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { savatchaChegirma, savatchaNarxTuri, savatchaSotuvNarxi, savatchaUstama, usePosStore, type CartItem } from "@/store/posStore";
import { sotuvBirliklari } from "@/lib/kopBirlik";
import { yaratishValyutasi } from "@/lib/mijozValyutasi";
import { tolovRangi } from "@/lib/tolovTuriRanglari";
import { mijozMosmi, telefonKorinishi } from "@/lib/mijozQidiruvi";
import { qidiruvKorinishi } from "@/lib/kategoriyaQidiruvi";
import SotuvNarxiMaydoni from "./SotuvNarxiMaydoni";
import SavatchaMiqdoriMaydoni from "./SavatchaMiqdoriMaydoni";
import { doimiySotuvniModalgaTayyorlash } from "./doimiySotuv";
import SavatchaMahsulotTahriri from "./SavatchaMahsulotTahriri";
import { sahifagaRuxsatBormi } from "@/lib/roles";
import { aralashTolovniTaqsimlash, dollarNarxi, dollarniSomga, narxTuriKodi, posQaytimi, posTolovYaroqli, rejimSotuvQatori } from "./aralashTolov";
import { useSavdoStore } from "@/store/savdoStore";
import { useKassaNarxTurlari } from "@/store/savdoSozlamalariStore";
import type { MijozTanlovi, OmborTanlovi, Sotuv, SotuvTolovi, TolovTuri } from "@/types/savdo";
import XaridorModal from "@/Pages/XaridorUchot/XaridorModal";
import { kompaniyaniUiGa } from "@/Pages/XaridorUchot/backendAdapters";
import type { Xaridor, XaridorKompaniyasi } from "@/Pages/XaridorUchot/types";
import { mijozKompaniyalariApi, mijozlarApi } from "@/api/partnersApi";
import { enterTolovniTasdiqlaydimi, POS_SAVATCHAGA_OTISH, posQidiruvigaFokus, posQidiruvigaFokusKeyin } from "@/lib/skanerFokusi";

type CustomerType = "donalik" | "doimiy";

type PaymentType = {
  label: string;
  apiTuri: TolovTuri;
  kalit: "payme" | "click" | "cash" | "bank" | "card";
};

// To'lov oynasidagi tezkor raqamlar: 1 Naqd, 2 Karta, 3 Bank, 4 Click, 5 Payme.
const TOLOV_TEZKOR_TARTIBI = ["cash", "card", "bank", "click", "payme"] as const;

const quickDiscounts = [15, 30, 50, 75];

function formatSumma(value: number) {
  return pulMatni(Number(value) || 0, "UZS", true, i18n.t("bosh_sahifa:customer.currency"));
}

// Pul summasi tiyin/sent aniqligida (backend Decimal ROUND_HALF_UP bilan bir xil); butun so'mgacha yaxlitlanmaydi.
const pul = (son: number) => yaxlitHalfUp(son, 2);

function readNumber(value: unknown, fallback = 0) {
  const numberValue =
    typeof value === "number" ? value : Number(String(value ?? "").replace(/\s/g, ""));

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function mijozNomi(mijoz?: MijozTanlovi | null) {
  if (!mijoz) return "";
  const ism = [mijoz.firstName, mijoz.lastName].filter(Boolean).join(" ").trim();
  return mijoz.fullName || ism || mijoz.name || mijoz.phone || mijoz.id;
}

function xatoMatni(error: unknown, fallback: string) {
  return getApiErrorMessage(error) || fallback;
}

export default function BoshSahifa() {
  const { t } = useTranslation("bosh_sahifa");
  const canSellNegative = useInventorySettingsStore((s) => s.canSellNegative);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const cart = usePosStore((state) => state.cart);
  const updateCartQuantity = usePosStore((state) => state.updateQuantity);
  const setBirlik = usePosStore((state) => state.setBirlik);
  const updatePriceType = usePosStore((state) => state.updatePriceType);
  const setSotuvNarxi = usePosStore((state) => state.setSotuvNarxi);
  const removeFromCart = usePosStore((state) => state.removeFromCart);
  const clearPosCart = usePosStore((state) => state.clearCart);
  const yangiSotuvYaratish = useSavdoStore((state) => state.yangiSotuvYaratish);
  const sotuvniTasdiqlash = useSavdoStore((state) => state.sotuvniTasdiqlash);
  // Doimiy mijoz savdosi: Savdo bo'limidagi sotuv oynasi shu store ma'lumotlari bilan ishlaydi.
  const tanlanganSotuv = useSavdoStore((state) => state.tanlanganSotuv);
  const savdoXodimlar = useSavdoStore((state) => state.xodimlar);
  const savdoQoldiqlar = useSavdoStore((state) => state.qoldiqlar);
  const amalBajarilmoqda = useSavdoStore((state) => state.amalBajarilmoqda);
  const savdoXatoligi = useSavdoStore((state) => state.xatolik);
  const sotuvniYangilash = useSavdoStore((state) => state.sotuvniYangilash);
  const sotuvgaTolovQoshish = useSavdoStore((state) => state.sotuvgaTolovQoshish);
  const sotuvniBekorQilish = useSavdoStore((state) => state.sotuvniBekorQilish);
  const tanlanganSotuvniTozalash = useSavdoStore((state) => state.tanlanganSotuvniTozalash);
  const mijozlarniOldindanYuklash = useSavdoStore((state) => state.mijozlarniOldindanYuklash);
  const xatolikniTozalash = useSavdoStore((state) => state.xatolikniTozalash);
  const joriyProfil = useAuthProfileStore((state) => state.profil);
  const profilniYuklash = useAuthProfileStore((state) => state.profilniYuklash);

  const paymentTypes: PaymentType[] = useMemo(
    () => [
      { label: t("paymentTypes.payme"), apiTuri: "CARD", kalit: "payme" },
      { label: t("paymentTypes.click"), apiTuri: "CARD", kalit: "click" },
      { label: t("paymentTypes.cash"), apiTuri: "CASH", kalit: "cash" },
      { label: t("paymentTypes.bank"), apiTuri: "BANK", kalit: "bank" },
      { label: t("paymentTypes.card"), apiTuri: "CARD", kalit: "card" },
    ],
    [t]
  );

  const [omborlar, setOmborlar] = useState<OmborTanlovi[]>([]);
  const [mijozlar, setMijozlar] = useState<MijozTanlovi[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  // Umumiy chegirma so'mda yoki foizda kiritiladi; foiz har doim so'mga aylantirib, shu summa backendga yuboriladi.
  const [chegirmaTuri, setChegirmaTuri] = useState<"sum" | "foiz">("sum");
  const [paymentType, setPaymentType] = useState(t("paymentTypes.payme"));
  const [customerName, setCustomerName] = useState("");
  // Donalik mijozning ixtiyoriy telefoni (backendda walkInCustomerPhone).
  const [customerPhone, setCustomerPhone] = useState("");
  const [mijozTuri, setMijozTuri] = useState<CustomerType>("donalik");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [mijozQoshishOchiq, setMijozQoshishOchiq] = useState(false);
  // "Yangi xaridor" oynasi qayerdan ochilgani va qidiruvga yozilgan matn (oyna shu matn bilan to'ladi): "donalik" — Donalik mijoz ismi
  // takliflaridan, "doimiy" — Doimiy mijozlar qidiruvidan. Saqlangach mijoz Doimiy mijozlarga tanlangan bo'lib tushadi.
  const [mijozQoshishManbasi, setMijozQoshishManbasi] = useState<{ joy: CustomerType; matn: string }>({ joy: "doimiy", matn: "" });
  // Donalik mijoz ismi ostidagi bazadagi mijoz takliflari (2 ta belgidan keyin).
  const [nomTaklifiOchiq, setNomTaklifiOchiq] = useState(false);
  const [nomTaklifiFaol, setNomTaklifiFaol] = useState(-1);
  const [mijozKompaniyalari, setMijozKompaniyalari] = useState<XaridorKompaniyasi[]>([]);
  const mijozSaqlanmoqda = useRef(false);
  const narxTuri = usePosStore((state) => state.narxTuri);
  const setNarxTuri = updatePriceType;
  // Sozlamalar → Sotuv: faqat yoqilgan narx turlari tanlanadi (o'chirilgan turni backend rad etadi).
  const narxRuxsati = useKassaNarxTurlari();
  // Doimiy mijoz uchun yaratilgan qoralama sotuvning oynasi ochiqmi.
  const [doimiySotuvOchiq, setDoimiySotuvOchiq] = useState(false);
  const doimiySotuvYaratilmoqda = useRef(false);
  const [noteOpen, setNoteOpen] = useState(false);
  // Savatchada nomi bosilgan mahsulot: Mahsulotlar bo'limidagi tahrirlash oynasi ochiladi (huquq bo'lmasa — faqat ko'rish).
  const [tahrirQatori, setTahrirQatori] = useState<CartItem | null>(null);
  const mahsulotTahrirRuxsati = sahifagaRuxsatBormi(joriyProfil, "/mahsulotlar");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [tolovModalOchiq, setTolovModalOchiq] = useState(false);
  // "Kechiktirish" savatni tozalaydi: mahsulot bo'lsa avval so'raladi (K5).
  const [kechiktirishOchiq, setKechiktirishOchiq] = useState(false);
  // Savatchani klaviatura bilan boshqarish (TZ 13.11, 4-bag): tanlangan qator, o'chirilganlarni qaytarish (Ctrl+Z), tezkor tugmalar ro'yxati.
  const [faolSavatQatori, setFaolSavatQatori] = useState<number | null>(null);
  const [tezkorTugmalarOchiq, setTezkorTugmalarOchiq] = useState(false);
  const savatRef = useRef<HTMLDivElement | null>(null);
  const donalikNomRef = useRef<HTMLInputElement | null>(null);
  const ochirilganQatorlar = useRef<Array<{ item: CartItem; indeks: number }>>([]);
  const [tolovSummasi, setTolovSummasi] = useState("");
  // Dollarda qabul qilinadigan to'lov ($). Faqat valyuta rejimi yoqilgan va bugungi kurs kiritilgan bo'lsa ishlatiladi.
  const [dollarTolovi, setDollarTolovi] = useState("");
  // Dollar qatnashganda qaytim mingtagacha yaxlitlanadi (backend `roundChange`, standart yoqilgan); tanga oladigan mijoz uchun o'chiriladi.
  const [qaytimYaxlitlash, setQaytimYaxlitlash] = useState(true);
  const kurs = useValyutaStore((holat) => holat.kurs);
  // Alohida dollar qismi faqat ikki valyuta rejimida (rejimYoniq = DUAL) va kurs bo'lsa.
  const dollarTolovMumkin = useValyutaStore((holat) => holat.rejimYoniq && holat.kursBor && holat.kurs > 0);
  // Bir valyutali rejim (Faqat so'm / Faqat dollar): sotuv, qatorlar va to'lovlar shu valyutada ketadi, kurs so'ralmaydi.
  // "Faqat dollar"da savatcha dollarda hisoblanadi (narxlar o'girilmaydi). Ikki valyuta rejimida — `null`, avvalgidek.
  const yagonaValyuta = useValyutaStore((holat): "UZS" | "USD" | null =>
    holat.rejim === "USD_ONLY" ? "USD" : holat.rejim === "UZS_ONLY" ? "UZS" : null
  );
  const dollarSavat = yagonaValyuta === "USD";
  const savatValyutasi: "UZS" | "USD" = dollarSavat ? "USD" : "UZS";
  const valyutaYuklandi = useValyutaStore((holat) => holat.yuklandi);

  // POS ochilganda fokus skaner uchun sarlavhadagi qidiruv maydonida turadi.
  useEffect(() => {
    posQidiruvigaFokus();
  }, []);

  // Rejim shu seansda backenddan o'qilsin (navbardagi valyuta ko'rsatkichi bir valyutali rejimda yashirin bo'lishi mumkin).
  useEffect(() => {
    const { yuklandi, kursniYuklash } = useValyutaStore.getState();
    if (!yuklandi) void kursniYuklash();
  }, []);

  // Valyuta rejimi almashgan bo'lsa (masalan "Faqat dollar"ga o'tilgan), eski valyutadagi savatcha tozalanadi: so'mdagi narxlar
  // dollar sifatida (yoki aksincha) yuborilib ketmasin. Rejim backenddan o'qilgach tekshiriladi.
  useEffect(() => {
    if (!valyutaYuklandi) return;
    if (usePosStore.getState().savatValyutasiniMoslash(savatValyutasi)) {
      setMessage({ type: "error", text: t("errors.cartCurrencyChanged") });
    }
  }, [valyutaYuklandi, savatValyutasi, t]);

  useEffect(() => {
    if (!mijozQoshishOchiq) {
      customerSearchRef.current?.focus();
      return;
    }
    let active = true;
    void mijozKompaniyalariApi.royxat().then((items) => {
      if (active) setMijozKompaniyalari(items.map(kompaniyaniUiGa));
    }).catch(() => {
      // Kompaniyasiz mijoz qo'shish mumkin; API xato xabarini o'zi ko'rsatadi.
    });
    return () => { active = false; };
  }, [mijozQoshishOchiq]);

  useEffect(() => {
    let active = true;
    const loadBase = async () => {
      setLoading(true);
      try {
        const [warehouses, customers] = await Promise.all([
          omborlarRoyxatiniOlish(),
          mijozlarRoyxatiniOlish(),
        ]);
        if (!active) return;
        setOmborlar(warehouses);
        setMijozlar((current) => [
          ...customers,
          ...current.filter((item) => !customers.some((customer) => customer.id === item.id)),
        ]);
        setWarehouseId((oldValue) => oldValue || String(warehouses[0]?.id ?? ""));
      } catch (error) {
        if (active) setMessage({ type: "error", text: xatoMatni(error, t("errors.loadFailed")) });
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadBase();
    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    if (!joriyProfil) void profilniYuklash();
  }, [joriyProfil, profilniYuklash]);

  // Doimiy mijozning sotuv oynasi (to'lov, tasdiqlash) mijoz nomini saqlab qolishi uchun mijozlar savdo do'koniga ham yuklanadi.
  useEffect(() => {
    void mijozlarniOldindanYuklash();
  }, [mijozlarniOldindanYuklash]);

  // Faqat o'z narx turi yo'q (eski) qatorlar umumiy turga tenglashadi; qatorning o'zi tanlagan turi (Mahsulot tanlash oynasida) saqlanadi.
  useEffect(() => {
    updatePriceType(narxTuri, true);
  }, [narxTuri, updatePriceType]);

  // Katalog narxlarida jami; kassir sotuv narxini pasaytirgan bo'lsa, farqi avtomatik "narx chegirmasi" bo'ladi.
  // Summalar butun so'mgacha yaxlitlanmaydi (dollar narxli $3.50 tovar $4 bo'lib qolmasin) — faqat tiyin/sent aniqligida (2 xona).
  const total = pul(cart.reduce((sum, item) => sum + item.narx * item.soni, 0));
  const avtoChegirma = pul(cart.reduce((sum, item) => sum + savatchaChegirma(item), 0));
  // Kassir narxni katalogdan baland qo'ysa, farqi ustama bo'lib jamiga qo'shiladi.
  const ustama = pul(cart.reduce((sum, item) => sum + savatchaUstama(item), 0));
  const sotuvNarxlaridaJami = pul(total - avtoChegirma + ustama);
  // Qo'shimcha umumiy chegirma (so'm yoki %) sotuv narxlaridagi summadan hisoblanadi.
  const percentDiscountSum = pul((sotuvNarxlaridaJami * discountPercent) / 100);
  const discountSum = Math.min(sotuvNarxlaridaJami, discountAmount || percentDiscountSum);
  const jamiChegirma = pul(avtoChegirma + discountSum);
  const payableTotal = Math.max(pul(sotuvNarxlaridaJami - discountSum), 0);
  const selectedPayment = paymentTypes.find((item) => item.label === paymentType) ?? paymentTypes[0];
  const cartPiecesCount = cart.reduce((sum, item) => sum + item.soni, 0);

  // To'lov: so'mdagi qism + dollardagi qism (kurs bo'yicha so'mga o'girilib jamlanadi). Qaytim so'mda beriladi.
  const somTolovi = readNumber(tolovSummasi);
  const dollarTiyin = dollarTolovMumkin ? Math.max(Math.round(readNumber(dollarTolovi) * 100), 0) : 0;
  const dollarSomda = dollarTiyin > 0 ? dollarniSomga(dollarTiyin, kurs) : 0;
  const qabulJami = somTolovi + dollarSomda;
  const qaytim = Math.max(qabulJami - payableTotal, 0);
  // Dollar qatnashsa backend qaytimni so'mda eng yaqin minggacha yaxlitlaydi (roundChange standart holatda yoqilgan): kassir shu summani beradi.
  const qaytimBerish = posQaytimi({ qabul: qabulJami, jami: payableTotal, dollarBor: dollarTiyin > 0, yaxlitlash: qaytimYaxlitlash });
  const qarzQoldi = Math.max(payableTotal - qabulJami, 0);
  // Naqd so'mda ortiqcha berish mumkin (qaytim); dollar bilan to'langanda so'm qismi qolgan summadan oshmaydi.
  const tolovYaroqli = posTolovYaroqli({ som: somTolovi, dollarSomda, jami: payableTotal, naqd: selectedPayment.apiTuri === "CASH" });
  // "Faqat dollar"da to'lov summalari dollarda (sentgacha).
  const somMatni = (qiymat: number) => (dollarSavat ? pulMatni(qiymat, "USD") : `${Math.round(qiymat).toLocaleString("uz-UZ")} uzs`);

  function dollarOzgardi(qiymat: string) {
    setDollarTolovi(qiymat);
    const tiyin = Math.max(Math.round(readNumber(qiymat) * 100), 0);
    // So'm qismi avtomatik qolgan summaga to'ldiriladi (kassir xohlasa o'zgartiradi).
    setTolovSummasi(String(Math.max(pul(payableTotal - (tiyin > 0 ? dollarniSomga(tiyin, kurs) : 0)), 0)));
  }

  // Qidiruv kirill ↔ lotin bir xil ("жам" → JAMSHID) va telefon raqami qismi bo'yicha ("77777").
  const filteredCustomers = useMemo(() => {
    const value = customerSearch.trim();

    if (!value) return [];

    return mijozlar.filter((customer) =>
      mijozMosmi([mijozNomi(customer), customer.email, customer.address], customer.phone, value)
    );
  }, [customerSearch, mijozlar]);

  // Donalik mijoz ismi: 2 ta harf (yoki raqam) yozilgach bazadagi mos mijozlar taklif qilinadi (eng ko'pi 8 ta).
  const nomTakliflari = useMemo(() => {
    const soz = customerName.trim();
    if (qidiruvKorinishi(soz).length < 2) return [];
    return mijozlar
      .filter((customer) => mijozMosmi([mijozNomi(customer), customer.email, customer.address], customer.phone, soz))
      .slice(0, 8);
  }, [customerName, mijozlar]);
  const nomTaklifiKorinadi = nomTaklifiOchiq && qidiruvKorinishi(customerName.trim()).length >= 2;

  function mijozQoshishniOchish(joy: CustomerType, matn: string) {
    setNomTaklifiOchiq(false);
    setMijozQoshishManbasi({ joy, matn: matn.trim() });
    setMijozQoshishOchiq(true);
  }

  // Donalik mijoz ismidan bazadagi mijoz tanlandi: Doimiy mijozlardagi kabi biriktiriladi.
  function nomTaklifiniTanlash(customer: MijozTanlovi) {
    setNomTaklifiOchiq(false);
    setNomTaklifiFaol(-1);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerSearch(mijozNomi(customer));
    setSelectedCustomerId(String(customer.id));
    setMijozTuri("doimiy");
  }

  async function mijozQoshish(xaridor: Xaridor) {
    if (mijozSaqlanmoqda.current) return;
    mijozSaqlanmoqda.current = true;
    try {
      const customFields = {
        ...(xaridor.customFields ?? {}),
        position: xaridor.lavozim.trim() || undefined,
        whatsapp: xaridor.ijtimoiy.whatsapp.trim() || undefined,
        instagram: xaridor.ijtimoiy.instagram.trim() || undefined,
        extraPhones: xaridor.telefonlar.slice(1).map((item) => item.trim()).filter(Boolean),
      };
      if (new TextEncoder().encode(JSON.stringify(customFields)).byteLength > 2048) {
        throw new Error(t("root.customFieldsTooLarge", { ns: "xaridor_uchot" }));
      }
      const saved = await mijozlarApi.yaratish({
        firstName: xaridor.ism.trim(),
        lastName: xaridor.familiya.trim() || undefined,
        phone: xaridor.telefonlar.find((item) => item.trim())?.trim() ?? "",
        address: xaridor.manzil.trim() || undefined,
        telegramId: xaridor.ijtimoiy.telegram.trim() || undefined,
        companyId: xaridor.kompaniyaId || undefined,
        ...yaratishValyutasi(xaridor.valyuta),
        customFields,
      });
      const mijoz: MijozTanlovi = {
        id: saved.id, firstName: saved.firstName, lastName: saved.lastName,
        phone: saved.phone, address: saved.address ?? undefined,
        companyId: saved.companyId, balance: saved.balance, balanceCurrency: saved.balanceCurrency,
      };
      setMijozlar((current) => [mijoz, ...current.filter((item) => item.id !== mijoz.id)]);
      useSavdoStore.getState().mijozMalumotiniYangilash(mijoz);
      setCustomerSearch(mijozNomi(mijoz));
      setSelectedCustomerId(mijoz.id);
      // Donalik mijoz ismidan qo'shilgan mijoz ham Doimiy mijozlarga tanlangan bo'lib tushadi (savatcha joyida qoladi).
      if (mijozQoshishManbasi.joy === "donalik") {
        setCustomerName("");
        setCustomerPhone("");
      }
      setMijozTuri("doimiy");
      setMijozQoshishOchiq(false);
    } finally {
      mijozSaqlanmoqda.current = false;
    }
  }

  function updateQuantity(productId: string, nextQuantity: number) {
    updateCartQuantity(productId, nextQuantity);
  }

  // ── Savatchani klaviatura bilan boshqarish ──
  const faolIndeks = faolSavatQatori !== null && cart.length > 0 ? Math.min(faolSavatQatori, cart.length - 1) : null;

  function savatchagaOtish(indeks = 0) {
    if (cart.length === 0) return false;
    const chegara = Math.min(Math.max(indeks, 0), cart.length - 1);
    setFaolSavatQatori(chegara);
    savatRef.current?.focus({ preventScroll: true });
    window.requestAnimationFrame(() => {
      savatRef.current?.querySelector(`[data-savat-qator="${chegara}"]`)?.scrollIntoView({ block: "nearest" });
    });
    return true;
  }

  function savatQatoriniOchirish(indeks: number) {
    const item = cart[indeks];
    if (!item) return;
    ochirilganQatorlar.current.push({ item, indeks });
    removeFromCart(item.id);
    if (cart.length <= 1) {
      setFaolSavatQatori(null);
      posQidiruvigaFokus();
      return;
    }
    setFaolSavatQatori(Math.min(indeks, cart.length - 2));
  }

  // Ctrl+Z: oxirgi o'chirilgan qator o'z joyiga qaytadi (miqdori, narxi va birligi bilan).
  function ochirilganniQaytarish() {
    const oxirgi = ochirilganQatorlar.current.pop();
    if (!oxirgi) return false;
    usePosStore.setState((holat) => {
      if (holat.cart.some((qator) => qator.id === oxirgi.item.id)) return holat;
      const yangi = [...holat.cart];
      yangi.splice(Math.min(oxirgi.indeks, yangi.length), 0, oxirgi.item);
      return { cart: yangi };
    });
    window.requestAnimationFrame(() => savatchagaOtish(oxirgi.indeks));
    return true;
  }

  function qatorMaydoni(indeks: number, belgi: "data-savat-miqdor" | "data-savat-narx") {
    return savatRef.current?.querySelector<HTMLInputElement>(`[data-savat-qator="${indeks}"] [${belgi}] input`) ?? null;
  }

  // Savatcha ro'yxatidagi tugmalar (fokus ro'yxatning o'zida): ↑/↓ yurish, +/− miqdor, raqam — miqdorga yozish, F4/P — narx,
  // Delete — o'chirish, Esc — qidiruvga. Qator ichidagi maydonda Enter/Esc ro'yxatga qaytaradi.
  function savatKlavishi(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.nativeEvent.isComposing || event.altKey || event.metaKey) return;
    const nishon = event.target as HTMLElement;
    if (nishon !== event.currentTarget) {
      if ((event.key === "Enter" || event.key === "Escape") && nishon.tagName === "INPUT") {
        if (event.key === "Escape") event.preventDefault();
        savatRef.current?.focus({ preventScroll: true });
      }
      return;
    }
    if (event.ctrlKey) return;
    const indeks = faolIndeks ?? 0;
    const item = cart[indeks];
    if (!item) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      savatchagaOtish(indeks + (event.key === "ArrowDown" ? 1 : -1));
    } else if (event.key === "+" || event.key === "=" || event.key === "Add") {
      event.preventDefault();
      if (canSellNegative || item.soni < item.qoldiq) updateQuantity(item.id, item.soni + 1);
    } else if (event.key === "-" || event.key === "Subtract") {
      event.preventDefault();
      if (item.soni > 1) updateQuantity(item.id, item.soni - 1);
    } else if (event.key === "Delete") {
      event.preventDefault();
      savatQatoriniOchirish(indeks);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setFaolSavatQatori(null);
      posQidiruvigaFokus();
    } else if (event.key === "F4" || event.key === "p" || event.key === "P") {
      event.preventDefault();
      const maydon = qatorMaydoni(indeks, "data-savat-narx");
      maydon?.focus();
      maydon?.select();
    } else if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      const maydon = qatorMaydoni(indeks, "data-savat-miqdor");
      if (!maydon || maydon.disabled) return;
      maydon.focus();
      // Raqam maydonga yoziladi (React onChange orqali, miqdor savatchada darhol yangilanadi); keyingi raqamlar davom etadi.
      const qiymatniYozish = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      qiymatniYozish?.call(maydon, event.key);
      maydon.dispatchEvent(new Event("input", { bubbles: true }));
      maydon.setSelectionRange(maydon.value.length, maydon.value.length);
    }
  }

  // To'lov oynasidagi tezkor to'lov turi: summa maydonida emas — raqam, istalgan joyda — Alt + raqam (1 Naqd ... 5 Payme).
  function tolovTuriTezkor(event: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; target: EventTarget | null }) {
    if (event.ctrlKey || event.metaKey || !/^[1-5]$/.test(event.key)) return null;
    const tag = (event.target as HTMLElement | null)?.tagName;
    if (!event.altKey && (tag === "INPUT" || tag === "TEXTAREA")) return null;
    const kalit = TOLOV_TEZKOR_TARTIBI[Number(event.key) - 1];
    return paymentTypes.find((item) => item.kalit === kalit) ?? null;
  }

  function mijozMaydonigaOtish() {
    if (mijozTuri === "doimiy") customerSearchRef.current?.focus();
    else donalikNomRef.current?.focus();
  }

  // Sarlavhadagi qidiruvda (bo'sh) ↓ — savatchaga o'tish.
  useEffect(() => {
    function savatchaga(hodisa: Event) {
      if (savatchagaOtish(0)) hodisa.preventDefault();
    }
    window.addEventListener(POS_SAVATCHAGA_OTISH, savatchaga);
    return () => window.removeEventListener(POS_SAVATCHAGA_OTISH, savatchaga);
  });

  // Istalgan joyda: F2 — to'lash, F3 — mijoz maydoni, F8 — kechiktirish, Ctrl+/ — tezkor tugmalar, Ctrl+Z — o'chirilgan qatorni qaytarish.
  // Ochiq oyna (to'lov, tasdiq, mahsulot va h.k.) bo'lsa F-tugmalar ishlamaydi.
  useEffect(() => {
    function tugma(hodisa: KeyboardEvent) {
      if (hodisa.defaultPrevented || hodisa.isComposing) return;
      if (hodisa.ctrlKey && (hodisa.key === "/" || hodisa.code === "Slash")) {
        hodisa.preventDefault();
        setTezkorTugmalarOchiq((joriy) => !joriy);
        return;
      }
      if (tolovModalOchiq) {
        // To'lov oynasi: 1–5 to'lov turi; fokus oyna ichida bo'lmasa (masalan, ochilgach hech narsa bosilmagan) Enter ham to'lovni yakunlaydi.
        const tolovTuri = tolovTuriTezkor(hodisa);
        if (tolovTuri) {
          hodisa.preventDefault();
          setPaymentType(tolovTuri.label);
        } else if (hodisa.key === "Enter" && (hodisa.target === document.body || hodisa.target === document.documentElement) && tolovYaroqli && !saving) {
          hodisa.preventDefault();
          void tolovniTasdiqlash();
        }
        return;
      }
      if (document.querySelector(".app-modal-compact, [aria-modal='true']")) return;
      if (hodisa.key === "F2") {
        hodisa.preventDefault();
        handlePay();
      } else if (hodisa.key === "F3") {
        hodisa.preventDefault();
        mijozMaydonigaOtish();
      } else if (hodisa.key === "F8") {
        hodisa.preventDefault();
        if (cart.length > 0) setKechiktirishOchiq(true);
      } else if (hodisa.ctrlKey && !hodisa.shiftKey && (hodisa.key === "z" || hodisa.key === "Z")) {
        const tag = (hodisa.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (ochirilganniQaytarish()) hodisa.preventDefault();
      }
    }
    window.addEventListener("keydown", tugma);
    return () => window.removeEventListener("keydown", tugma);
  });

  function clearCart() {
    clearPosCart();
    setDiscountPercent(0);
    setDiscountAmount(0);
    setCustomerName("");
    setCustomerPhone("");
    setSelectedCustomerId("");
    setNote("");
    setMessage(null);
  }

  function handlePay() {
    setMessage(null);
    if (!warehouseId) {
      setMessage({ type: "error", text: t("errors.warehouseNotFound") });
      return;
    }
    if (cart.length === 0) {
      setMessage({ type: "error", text: t("errors.cartEmpty") });
      return;
    }
    if (savatRejimgaMosEmas()) return;
    setTolovSummasi(String(payableTotal));
    setDollarTolovi("");
    setQaytimYaxlitlash(true);
    setTolovModalOchiq(true);
  }

  // Sotuv yuborishdan oldin: savatcha boshqa valyutada qolgan bo'lsa (rejim almashgan) — tozalanadi; "Faqat dollar"da narxsiz
  // qator (masalan ulgurji narx so'mda bo'lgani uchun 0) bo'lsa — yuborilmaydi. `true` — davom etib bo'lmaydi (xabar ko'rsatilgan).
  function savatRejimgaMosEmas() {
    if (usePosStore.getState().savatValyutasiniMoslash(savatValyutasi)) {
      setMessage({ type: "error", text: t("errors.cartCurrencyChanged") });
      return true;
    }
    // "Faqat dollar": ulgurji narxi so'mda belgilangan qator ulgurji turida sotilmaydi (so'mdagi yozuvni backend rad etadi).
    const somdagiUlgurji = dollarSavat ? cart.find((item) => item.ulgurjiSomda && savatchaNarxTuri(item, narxTuri) === "ulgurji") : undefined;
    if (somdagiUlgurji) {
      setMessage({ type: "error", text: t("errors.somPriceInCart", { name: somdagiUlgurji.nom }) });
      return true;
    }
    const narxsiz = dollarSavat ? cart.find((item) => !(savatchaSotuvNarxi(item) > 0)) : undefined;
    if (narxsiz) {
      setMessage({ type: "error", text: t("errors.noPriceInCart", { name: narxsiz.nom }) });
      return true;
    }
    return false;
  }

  // Savatcha qatorlari backendga ketadigan ko'rinishda: katalog narxi (`price`) va umumiy chegirma (`discount`).
  // Avtomatik narx chegirmasi + qo'shimcha umumiy chegirmaning shu qatorga to'g'ri kelgan ulushi.
  function savatchaQatorlari() {
    const rawTotal = sotuvNarxlaridaJami;
    let remainingDiscount = Math.min(discountSum, rawTotal);
    return cart.map((item, index) => {
      const narxChegirmasi = savatchaChegirma(item);
      const qatorUstamasi = savatchaUstama(item);
      // Sotuv narxi katalogdan baland bo'lsa qator jami aynan sotuv narxi × miqdor.
      const lineTotal = pul(qatorUstamasi > 0 ? item.soni * savatchaSotuvNarxi(item) : item.narx * item.soni - narxChegirmasi);
      const lineDiscount =
        index === cart.length - 1
          ? remainingDiscount
          : Math.min(rawTotal > 0 ? pul((discountSum * lineTotal) / rawTotal) : 0, remainingDiscount);
      remainingDiscount = pul(remainingDiscount - lineDiscount);

      return {
        cartId: item.id,
        omborId: item.warehouseId || warehouseId,
        modificationId: item.modificationId || item.id,
        quantity: item.soni,
        // Katalogdan qimmatroq sotilsa qo'lda kiritilgan narx yuboriladi (backend `price`ni qo'lda narx sifatida qabul qiladi),
        // chegirma esa faqat umumiy chegirma ulushi. Bunday qator so'mda ketadi (dollar narx katalog narxiga bog'langan).
        price: qatorUstamasi > 0 ? savatchaSotuvNarxi(item) : item.narx,
        discount: narxChegirmasi + lineDiscount,
        sof: pul(lineTotal - lineDiscount),
        dollar: qatorUstamasi > 0 ? null : dollarNarxi(item, savatchaNarxTuri(item, narxTuri)),
        priceType: narxTuriKodi(savatchaNarxTuri(item, narxTuri)),
        unitId: item.birlikId || undefined,
      };
    });
  }

  async function tolovniTasdiqlash() {
    if (savatRejimgaMosEmas()) return;
    const somQismi = readNumber(tolovSummasi);
    const usdSent = dollarTolovMumkin ? Math.max(Math.round(readNumber(dollarTolovi) * 100), 0) : 0;
    const usdSomda = usdSent > 0 ? dollarniSomga(usdSent, kurs) : 0;
    const qabulQilinadiganSumma = somQismi + usdSomda;
    if (!posTolovYaroqli({ som: somQismi, dollarSomda: usdSomda, jami: payableTotal, naqd: selectedPayment.apiTuri === "CASH" })) {
      setMessage({ type: "error", text: t("errors.amountRange", { max: formatSumma(payableTotal) }) });
      return;
    }
    if (
      qabulQilinadiganSumma < payableTotal &&
      (mijozTuri !== "doimiy" || !selectedCustomerId)
    ) {
      setMessage({ type: "error", text: t("errors.selectDebtCustomer") });
      return;
    }

    const qatorlar = savatchaQatorlari();

    // Backend bitta sotuvni bitta ombor bilan yaratadi, shuning uchun savatcha omborlar bo'yicha
    // bo'linadi: har ombor uchun alohida sotuv yaratilib tasdiqlanadi va qoldiq aynan shu ombordan chiqadi.
    const omborGuruhlari = new Map<string, typeof qatorlar>();
    qatorlar.forEach((qator) => {
      omborGuruhlari.set(qator.omborId, [...(omborGuruhlari.get(qator.omborId) ?? []), qator]);
    });
    if (!warehouseId && omborGuruhlari.has("")) {
      setMessage({ type: "error", text: t("errors.warehouseNotFound") });
      return;
    }
    const guruhlar = Array.from(omborGuruhlari.entries());
    const guruhSoflari = guruhlar.map(([, qatorlarRoyxati]) => pul(qatorlarRoyxati.reduce((sum, qator) => sum + qator.sof, 0)));
    const guruhSoflariJami = guruhSoflari.reduce((sum, qiymat) => sum + qiymat, 0) || 1;
    // Sotuv valyutasi (UZS), so'm to'lovlari va dollar to'lovi har doim o'z valyutasi bilan ketadi (dollar mahsulot qatori o'zida USD).
    const aralashTaqsimot = usdSent > 0 ? aralashTolovniTaqsimlash(guruhSoflari, somQismi, usdSent, kurs) : null;

    setSaving(true);
    setMessage(null);
    let tasdiqlanganlar = 0;
    let qabulQilinganQism = 0;
    try {
      for (let index = 0; index < guruhlar.length; index += 1) {
        const [omborId, qatorlarRoyxati] = guruhlar[index];
        // To'lov summasi omborlar orasida sotuv summasiga mutanosib taqsimlanadi (oxirgisiga qoldiq).
        const ulush =
          index === guruhlar.length - 1
            ? pul(qabulQilinadiganSumma - qabulQilinganQism)
            : Math.min(pul((qabulQilinadiganSumma * guruhSoflari[index]) / guruhSoflariJami), guruhSoflari[index]);
        qabulQilinganQism = pul(qabulQilinganQism + ulush);

        // Dollarda to'lov bo'lsa: so'm qismi tanlangan usulda, dollar qismi naqd (CASH) va USD valyutasida; aks holda avvalgidek.
        const ulushi = aralashTaqsimot?.[index];
        // Bir valyutali rejimda to'lov shu valyutada ("Faqat dollar"da — USD); aralash (so'm + $) to'lov faqat ikki valyuta rejimida.
        const tolovlar: SotuvTolovi[] = ulushi
          ? [
              ...(ulushi.uzs > 0 ? [{ paymentType: selectedPayment.apiTuri, amount: ulushi.uzs, currency: "UZS" }] : []),
              ...(ulushi.usdSent > 0 ? [{ paymentType: "CASH" as const, amount: ulushi.usdSent / 100, currency: "USD" }] : []),
            ]
          : ulush > 0
            ? [{ paymentType: selectedPayment.apiTuri, amount: ulush, currency: savatValyutasi }]
            : [];

        const sale = await yangiSotuvYaratish({
          warehouseId: omborId,
          customerId: mijozTuri === "doimiy" && selectedCustomerId ? selectedCustomerId : undefined,
          saleType: mijozTuri === "doimiy" ? "CLIENT" : "QUICK",
          // Sotuvning mas'ul xodimi har doim tizimga real kirgan foydalanuvchi
          // (kassir, admin, direktor va h.k.) bo'lishi kerak.
          responsibleId: joriyProfil?.id,
          // Donalik savdoda kassir yozgan ism sotuvga alohida maydon sifatida saqlanadi (izohga yozilmaydi).
          // Doimiy mijoz rejimida (customerId bilan) yuborilmaydi.
          walkInCustomerName: mijozTuri === "donalik" && customerName.trim() ? customerName.trim().slice(0, 200) : undefined,
          walkInCustomerPhone: mijozTuri === "donalik" && customerPhone.trim() ? customerPhone.trim().slice(0, 50) : undefined,
          note: note.trim() || undefined,
          // Savdo valyutasi har doim aniq yuboriladi: berilmasa backend valyuta rejimida mijozli savdoni USD deb oladi va
          // so'mdagi narx/to'lovlar dollar sifatida o'qilib qolardi. Kassa hisob-kitobi so'mda, dollar qatorlari o'z valyutasi bilan ketadi.
          // "Faqat dollar" rejimida savatcha dollarda — savdo, qatorlar va to'lov USD da.
          currency: savatValyutasi,
          ...(usdSent > 0 && !qaytimYaxlitlash ? { roundChange: false } : {}),
          // Ortiqcha naqd pul kassir ko'rsatgan qaytim bo'lib qaytadi (mijozning eski qarzlariga o'tib ketmaydi).
          ...(qabulQilinadiganSumma > payableTotal && mijozTuri === "doimiy" && selectedCustomerId ? { applyExcessToDebt: false } : {}),
          items: qatorlarRoyxati.map(({ modificationId, quantity, price, discount, dollar, priceType, unitId }) =>
            rejimSotuvQatori({ modificationId, quantity, price, discount, dollar, priceType, unitId }, yagonaValyuta)
          ),
          payments: tolovlar,
        });
        if (!sale) throw new Error(useSavdoStore.getState().xatolik || t("errors.createDraftFailed"));
        const tasdiqlandi = await sotuvniTasdiqlash(sale.id);
        if (!tasdiqlandi) {
          throw new Error(useSavdoStore.getState().xatolik || t("errors.confirmFailed"));
        }
        tasdiqlanganlar += 1;
        // Tasdiqlangan ombor mahsulotlari savatchadan olib tashlanadi.
        qatorlarRoyxati.forEach((qator) => {
          removeFromCart(qator.cartId);
        });
      }
      clearCart();
      setTolovModalOchiq(false);
      setMessage({ type: "success", text: t("errors.paymentSuccess") });
      posQidiruvigaFokusKeyin();
    } catch (error) {
      const xato = xatoMatni(error, t("errors.finalizeFailed"));
      setMessage({
        type: "error",
        text: tasdiqlanganlar > 0 ? t("errors.partialSuccess", { done: tasdiqlanganlar, total: guruhlar.length, error: xato }) : xato,
      });
    } finally {
      setSaving(false);
    }
  }

  // Doimiy mijoz: savatcha mijozga biriktirilgan haqiqiy qoralama sotuvga aylanadi va Savdo bo'limidagi sotuv oynasi ochiladi
  // (to'lovni qabul qilish, qarzga qoldirish, tasdiqlash va hujjatlar shu oynada).
  async function handleNextCustomer() {
    if (doimiySotuvYaratilmoqda.current) return;
    setMessage(null);
    if (!selectedCustomerId) {
      setMessage({ type: "error", text: t("errors.selectCustomerFirst") });
      return;
    }
    if (!mijozlar.some((item) => String(item.id) === selectedCustomerId)) return;
    if (!warehouseId) {
      setMessage({ type: "error", text: t("errors.warehouseNotFound") });
      return;
    }
    if (cart.length === 0) {
      setMessage({ type: "error", text: t("errors.cartEmpty") });
      return;
    }
    if (savatRejimgaMosEmas()) return;

    const qatorlar = savatchaQatorlari();
    // Backend bitta sotuvni bitta ombor bilan yaratadi: savatcha omborlar bo'yicha bo'linadi.
    const omborGuruhlari = new Map<string, typeof qatorlar>();
    qatorlar.forEach((qator) => {
      omborGuruhlari.set(qator.omborId, [...(omborGuruhlari.get(qator.omborId) ?? []), qator]);
    });
    const guruhlar = Array.from(omborGuruhlari.entries());

    doimiySotuvYaratilmoqda.current = true;
    tanlanganSotuvniTozalash();
    setDoimiySotuvOchiq(true);
    setSaving(true);
    const yaratilganlar: Sotuv[] = [];
    let xato = "";
    try {
      for (const [omborId, qatorlarRoyxati] of guruhlar) {
        const sale = await yangiSotuvYaratish({
          warehouseId: omborId,
          customerId: selectedCustomerId,
          saleType: "CLIENT",
          responsibleId: joriyProfil?.id,
          note: note.trim() || undefined,
          // Savdo valyutasi har doim aniq yuboriladi: berilmasa backend valyuta rejimida mijozli savdoni USD deb oladi va
          // so'mdagi narx/to'lovlar dollar sifatida o'qilib qolardi. Kassa hisob-kitobi so'mda, dollar qatorlari o'z valyutasi bilan ketadi.
          // "Faqat dollar" rejimida savatcha dollarda — savdo va qatorlar USD da.
          currency: savatValyutasi,
          items: qatorlarRoyxati.map(({ modificationId, quantity, price, discount, dollar, priceType, unitId }) =>
            rejimSotuvQatori({ modificationId, quantity, price, discount, dollar, priceType, unitId }, yagonaValyuta)
          ),
        });
        if (!sale) throw new Error(useSavdoStore.getState().xatolik || t("errors.createDraftFailed"));
        yaratilganlar.push(sale);
        // Qoralamaga o'tgan mahsulotlar savatchadan olib tashlanadi.
        qatorlarRoyxati.forEach((qator) => removeFromCart(qator.cartId));
      }
    } catch (error) {
      xato = xatoMatni(error, t("errors.createDraftFailed"));
    }

    try {
      if (yaratilganlar.length > 0) {
        const savdo = useSavdoStore.getState();
        const xodimlar = savdo.xodimlar.length > 0 ? savdo.xodimlar : joriyProfil ? [{
          id: joriyProfil.id,
          fullName: joriyProfil.fullName ?? undefined,
          username: joriyProfil.username,
        }] : [];
        // Modal POST javobi kelishi bilan ochiladi: barcha sotuvlar/katalog va takroriy detail GET kutilmaydi.
        const birinchi = doimiySotuvniModalgaTayyorlash(yaratilganlar[0], { mijozlar, omborlar, xodimlar, cart });
        useSavdoStore.setState({
          tanlanganSotuv: birinchi,
          mijozlar: savdo.mijozlar.length ? savdo.mijozlar : mijozlar,
          omborlar: savdo.omborlar.length ? savdo.omborlar : omborlar,
          xodimlar,
        });
        // Qo'shimcha tahrir/to'lov amallari uchun ma'lumotlar fonda yangilanadi.
        void savdo.qoldiqlarniYuklash(birinchi.warehouseId);
        if (!savdo.xodimlar.length) {
          void xodimlarRoyxatiniOlish().then((items) => {
            if (items.length) useSavdoStore.setState({ xodimlar: items });
          }).catch(() => undefined);
        }
      } else {
        setDoimiySotuvOchiq(false);
      }
      if (!xato) {
        clearCart();
        if (yaratilganlar.length > 1) {
          setMessage({ type: "success", text: t("doimiySotuv.extraDrafts", { count: yaratilganlar.length - 1 }) });
        }
      } else {
        setMessage({
          type: "error",
          text: yaratilganlar.length > 0
            ? t("doimiySotuv.partialDrafts", { done: yaratilganlar.length, total: guruhlar.length, error: xato })
            : xato,
        });
      }
    } finally {
      doimiySotuvYaratilmoqda.current = false;
      setSaving(false);
    }
  }

  function doimiySotuvniYopish() {
    setDoimiySotuvOchiq(false);
    tanlanganSotuvniTozalash();
    xatolikniTozalash();
  }

  async function doimiySotuvniBekorQilish(sotuvId: string) {
    if (!(await tasdiqSorash(t("doimiySotuv.confirmCancel"))).rozi) return;
    if (await sotuvniBekorQilish(sotuvId)) {
      doimiySotuvniYopish();
      setMessage({ type: "success", text: t("doimiySotuv.cancelled") });
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-214px)] w-full min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_minmax(390px,24%)]">
      <section className="flex min-h-[520px] min-w-0 flex-col rounded-[26px] border border-gold-200 bg-white/95 p-4 shadow-gold-soft sm:p-5 xl:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold leading-tight text-[#0F172A] sm:text-3xl">
                {t("cart.title")}
              </h1>
              <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-gold-50 px-2 text-xs font-bold tabular-nums text-gold-600 ring-1 ring-inset ring-gold-200">
                {cart.length}
              </span>
            </div>
          </div>

        </div>

        {message && (
          <div
            className={[
              "mb-4 flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold",
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-600",
            ].join(" ")}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="font-bold">
              {t("cart.close")}
            </button>
          </div>
        )}

        <div className="@container/cart flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-slate-50/80 sm:min-h-[430px] xl:min-h-[500px]">
          {cart.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              <div className="flex flex-col items-center">
                <GoldCartIllustration className="h-[220px] w-[220px] sm:h-[260px] sm:w-[260px]" />
                <h2 className="mt-2 text-xl font-bold text-[#0F172A] sm:text-2xl">
                  {t("cart.emptyTitle")}
                </h2>
                <p className="mt-2 text-sm text-[#94A3B8]">
                  {t("cart.emptySubtitle")}
                </p>
              </div>
            </div>
          ) : (
            <div
              ref={savatRef}
              role="list"
              aria-label={t("cart.title")}
              tabIndex={-1}
              data-savatcha-royxati
              onKeyDown={savatKlavishi}
              onBlur={() => {
                // Qator maydonidan (miqdor/narx) Enter bilan chiqilganda fokus bir lahzaga tashqarida bo'ladi va darhol ro'yxatga
                // qaytadi — tanlov faqat fokus haqiqatan savatchadan ketganda tozalanadi.
                window.setTimeout(() => {
                  if (!savatRef.current?.contains(document.activeElement)) setFaolSavatQatori(null);
                }, 0);
              }}
              className="flex-1 space-y-3 overflow-auto p-2.5 outline-none @min-[560px]/cart:p-3"
            >
              {cart.map((item, index) => (
                <article
                  key={item.id}
                  role="listitem"
                  data-savat-qator={index}
                  aria-current={faolIndeks === index ? "true" : undefined}
                  onMouseDown={() => { if (faolIndeks !== null) setFaolSavatQatori(index); }}
                  className={[
                    "min-w-0 rounded-xl border-2 p-3.5 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-colors @min-[560px]/cart:p-4",
                    // Klaviatura bilan tanlangan qator aniq ko'rinadi: ko'k ramka va fon.
                    faolIndeks === index
                      ? "border-[#2563EB] bg-blue-50/70 ring-4 ring-blue-100"
                      : "border-gold-300 bg-gold-50/60 hover:border-gold-400 focus-within:border-gold-400",
                  ].join(" ")}
                >
                  <div className="mb-3.5 flex items-start justify-between gap-3 border-b border-gold-200 pb-3">
                    <div className="min-w-0 flex-1">
                      {/* Nom bosilsa mahsulotni tahrirlash oynasi ochiladi. Qalam belgisi doim ko'rinadi (kursor kelishini kutmaydi),
                          tooltip va tagiga chiziq yo'q. */}
                      <button
                        type="button"
                        onClick={() => setTahrirQatori(item)}
                        aria-label={t(mahsulotTahrirRuxsati ? "productEdit.edit" : "productEdit.view", { name: item.nom })}
                        className="-mx-1 inline-flex max-w-full items-start gap-1.5 rounded-md px-1 text-left text-[15px] font-semibold leading-6 text-[#0F172A] transition-colors hover:text-gold-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                      >
                        <span className="break-words">{item.nom}</span>
                        <Pencil size={14} aria-hidden className="mt-[5px] shrink-0 text-gold-600" />
                      </button>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {(item.warehouseName || omborlar.find((ombor) => String(ombor.id) === item.warehouseId)) && (
                          <p className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                            <Warehouse size={13} className="shrink-0 text-slate-400" aria-hidden />
                            <span className="break-words">
                              {t("cart.warehouse")}: {item.warehouseName || mijozNomi(omborlar.find((ombor) => String(ombor.id) === item.warehouseId)!)}
                            </span>
                          </p>
                        )}
                        {!yagonaValyuta && dollarNarxi(item, savatchaNarxTuri(item, narxTuri)) && (
                          <p className="text-xs">
                            <span className="rounded-md bg-gold-50 px-1.5 py-0.5 font-semibold tabular-nums text-gold-600">
                              ${dollarNarxi(item, savatchaNarxTuri(item, narxTuri))?.narx.toLocaleString("uz-UZ", { maximumFractionDigits: 2 })}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold-200 bg-white/80 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                      aria-label={`${t("cart.removeAria")}: ${item.nom}`}
                      title={t("cart.removeAria")}
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </div>

                  <div className="grid min-w-0 grid-cols-1 items-start gap-x-3 gap-y-4 @min-[300px]/cart:grid-cols-2 @min-[560px]/cart:grid-cols-[minmax(72px,0.75fr)_minmax(0,1.15fr)_minmax(116px,1fr)_minmax(0,1.2fr)] @min-[560px]/cart:gap-x-4">
                    <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-500">
                      {t("cart.unit")}
                      {item.baza && sotuvBirliklari(item.birliklar).length > 0 ? (
                        <AppSelect
                          aria-label={t("cart.unitLabel", { name: item.nom })}
                          value={item.birlikId ?? ""}
                          onChange={(event) => setBirlik(item.id, event.target.value)}
                          dropdownMinWidth={160}
                          className="h-10 w-full min-w-0 rounded-lg text-sm font-semibold text-slate-700 [&>button]:border-gold-200 [&>button]:px-3"
                        >
                          {sotuvBirliklari(item.birliklar).map((birlik) => (
                            <option key={birlik.unitId} value={birlik.asosiy ? "" : birlik.unitId}>{birlik.qisqa || birlik.nomi}</option>
                          ))}
                        </AppSelect>
                      ) : (
                        <span className="flex h-10 items-center rounded-lg border border-slate-100 bg-slate-50 px-3 text-sm font-semibold text-slate-600">{t("cart.piece")}</span>
                      )}
                    </label>
                    <div data-savat-narx className="min-w-0">
                    <SotuvNarxiMaydoni
                      item={item}
                      onChange={(narx) => setSotuvNarxi(item.id, narx)}
                      formatSumma={formatSumma}
                    />
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1.5 text-xs font-medium text-slate-500">{t("cart.quantity")}</p>
                      <div data-savat-miqdor className="flex h-10 items-center justify-between rounded-lg border border-gold-100 bg-white px-1 transition focus-within:border-gold-400 focus-within:ring-2 focus-within:ring-gold-100">
                        <button
                          type="button"
                          aria-label={t("cart.decreaseQuantity", { name: item.nom })}
                          onClick={() => updateQuantity(item.id, item.soni - 1)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-gold-50 hover:text-gold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                        >
                          <Minus size={14} />
                        </button>
                        <SavatchaMiqdoriMaydoni
                          soni={item.soni}
                          qoldiq={item.qoldiq}
                          label={t("cart.quantityLabel", { name: item.nom })}
                          onChange={(soni) => updateQuantity(item.id, soni)}
                          className="h-8 w-full min-w-0 flex-1 rounded-md bg-transparent px-0.5 text-center text-sm font-semibold tabular-nums text-slate-900 outline-none disabled:opacity-40"
                        />
                        <button
                          type="button"
                          aria-label={t("cart.increaseQuantity", { name: item.nom })}
                          disabled={!canSellNegative && item.soni >= item.qoldiq}
                          onClick={() => updateQuantity(item.id, item.soni + 1)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-gold-50 hover:text-gold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="min-w-0 text-right">
                      <p className="mb-1.5 text-xs font-medium text-slate-500">{t("cart.lineTotal")}</p>
                      <p className="flex min-h-10 items-center justify-end rounded-lg border border-gold-200 bg-white/90 px-2.5 py-2 text-sm font-bold tabular-nums text-gold-600 [overflow-wrap:anywhere]">
                        {formatSumma(savatchaSotuvNarxi(item) * item.soni)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {cart.length > 0 && (
            <p className="border-t border-gold-100 px-3 py-2 text-center text-[11px] font-semibold text-slate-400" data-savatcha-tezkor>
              {t("keyboard.hint")}
            </p>
          )}
        </div>
      </section>

      <aside className="flex flex-col rounded-[26px] border-2 border-gold-200 bg-white/86 p-4 shadow-gold-soft sm:p-5 xl:p-6">
        <div className="mb-5 grid grid-cols-2 rounded-2xl bg-gold-100 p-1">
          {(
            [
              ["donalik", t("customerType.donalik")],
              ["doimiy", t("customerType.doimiy")],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setMijozTuri(value as CustomerType)}
              className={[
                "h-10 rounded-xl text-xs font-bold transition sm:text-sm",
                mijozTuri === value
                  ? "theme-primary-gradient bg-linear-to-br from-gold-300 to-gold-600 text-white shadow-gold-soft"
                  : "text-[#64748B] hover:bg-white/70 hover:text-gold-600",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {mijozTuri === "donalik" ? (
          <>
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-[#0F172A]">{t("customer.label")}</p>
              </div>

              <div className="relative">
              <input
                ref={donalikNomRef}
                value={customerName}
                onChange={(event) => {
                  setCustomerName(event.target.value);
                  setNomTaklifiOchiq(true);
                  setNomTaklifiFaol(-1);
                }}
                onFocus={() => setNomTaklifiOchiq(true)}
                onBlur={() => setNomTaklifiOchiq(false)}
                onKeyDown={(event) => {
                  if (!nomTaklifiKorinadi || event.nativeEvent.isComposing) return;
                  const soni = nomTakliflari.length;
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    if (soni === 0) return;
                    setNomTaklifiFaol((joriy) => (event.key === "ArrowDown" ? (joriy + 1) % soni : joriy <= 0 ? soni - 1 : joriy - 1));
                  } else if (event.key === "Enter" && nomTakliflari[nomTaklifiFaol]) {
                    event.preventDefault();
                    nomTaklifiniTanlash(nomTakliflari[nomTaklifiFaol]);
                  } else if (event.key === "Escape") {
                    setNomTaklifiOchiq(false);
                  }
                }}
                maxLength={200}
                autoComplete="off"
                role="combobox"
                aria-expanded={nomTaklifiKorinadi}
                aria-controls="donalik-mijoz-takliflari"
                aria-autocomplete="list"
                placeholder={t("customer.namePlaceholder")}
                className="h-10 w-full rounded-xl bg-gold-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-gold-200"
              />
              {nomTaklifiKorinadi && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 flex max-h-72 flex-col overflow-hidden rounded-xl border border-gold-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,.16)]">
                  <div id="donalik-mijoz-takliflari" role="listbox" aria-label={t("customer.regularCustomers")} className="overflow-y-auto p-1">
                    {nomTakliflari.length === 0 ? (
                      <p className="px-3 py-2.5 text-xs font-semibold text-gray-400">{t("customer.notFound")}</p>
                    ) : (
                      nomTakliflari.map((customer, indeks) => (
                        <button
                          key={customer.id}
                          type="button"
                          role="option"
                          aria-selected={indeks === nomTaklifiFaol}
                          tabIndex={-1}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseMove={() => indeks !== nomTaklifiFaol && setNomTaklifiFaol(indeks)}
                          onClick={() => nomTaklifiniTanlash(customer)}
                          className={[
                            "flex w-full min-w-0 items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm transition",
                            indeks === nomTaklifiFaol ? "bg-gold-50 text-gold-700" : "text-gray-800 hover:bg-gold-50",
                          ].join(" ")}
                        >
                          <span className="truncate font-bold">{mijozNomi(customer)}</span>
                          {customer.phone && <span className="shrink-0 text-xs font-medium text-gray-500">· {telefonKorinishi(customer.phone)}</span>}
                        </button>
                      ))
                    )}
                  </div>
                  <div className="shrink-0 border-t border-gold-100 bg-gold-50/60 p-1.5">
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => mijozQoshishniOchish("donalik", customerName)}
                      className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-xs font-bold text-gold-600 transition hover:bg-white"
                    >
                      <Plus size={15} />
                      {t("customer.addCustomer")}
                    </button>
                  </div>
                </div>
              )}
              </div>
              <input
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value.replace(/[^\d+\-()\s]/g, ""))}
                maxLength={50}
                inputMode="tel"
                autoComplete="off"
                placeholder={t("customer.phonePlaceholder")}
                aria-label={t("customer.phonePlaceholder")}
                className="mt-2 h-10 w-full rounded-xl bg-gold-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-gold-200"
              />
            </div>

            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-[#0F172A]">{t("customer.discountLabel")}</p>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_84px] gap-2">
                <SummaMaydoni
                  value={(chegirmaTuri === "foiz" ? discountPercent : discountAmount) || ""}
                  onChange={(matn) => {
                    const qiymat = readNumber(matn);
                    if (chegirmaTuri === "foiz") {
                      setDiscountPercent(Math.min(Math.max(qiymat, 0), 100));
                      setDiscountAmount(0);
                    } else {
                      setDiscountAmount(qiymat);
                      setDiscountPercent(0);
                    }
                  }}
                  placeholder={chegirmaTuri === "foiz" ? t("customer.discountPercentPlaceholder") : t("customer.discountPlaceholder")}
                  className="h-10 min-w-0 rounded-xl bg-gold-50 px-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-gold-200"
                />
                <div role="group" aria-label={t("customer.discountLabel")} className="grid grid-cols-2 rounded-xl bg-gold-100 p-0.5">
                  {(["sum", "foiz"] as const).map((turi) => (
                    <button
                      key={turi}
                      type="button"
                      aria-pressed={chegirmaTuri === turi}
                      onClick={() => {
                        setChegirmaTuri(turi);
                        // Tur almashganda kiritilgan qiymat qayta hisoblanmasligi uchun tozalanadi.
                        setDiscountAmount(0);
                        setDiscountPercent(0);
                      }}
                      className={[
                        "rounded-[10px] text-xs font-bold transition",
                        chegirmaTuri === turi ? "bg-white text-gold-600 shadow-sm" : "text-[#64748B] hover:text-gold-600",
                      ].join(" ")}
                    >
                      {turi === "sum" ? (dollarSavat ? "$" : t("customer.discountModeSum")) : "%"}
                    </button>
                  ))}
                </div>
              </div>

              {chegirmaTuri === "foiz" && discountSum > 0 && (
                <p className="mt-2 text-xs font-semibold text-emerald-700">
                  {t(dollarSavat ? "customer.discountConvertedUsd" : "customer.discountConverted", { summa: formatSumma(discountSum) })}
                </p>
              )}

              <div className="mt-2 grid grid-cols-4 gap-2">
                {quickDiscounts.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setChegirmaTuri("foiz");
                      setDiscountPercent(item);
                      setDiscountAmount(0);
                    }}
                    className={[
                      "h-9 rounded-full text-xs font-bold transition",
                      discountPercent === item
                        ? "theme-primary-gradient bg-linear-to-br from-gold-300 to-gold-600 text-white"
                        : "bg-gold-100 text-[#64748B] hover:bg-gold-150",
                    ].join(" ")}
                  >
                    {item}%
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setNoteOpen((value) => !value)}
              className="theme-primary-gradient mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-br from-gold-300 to-gold-600 text-xs font-bold text-white shadow-gold-soft transition hover:-translate-y-0.5 active:translate-y-0"
            >
              <Paperclip size={14} />
              {t("customer.addNote")}
            </button>

            {noteOpen && (
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t("customer.notePlaceholder")}
                className="mb-4 h-20 w-full resize-none rounded-xl bg-gold-50 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-gold-200"
              />
            )}

            <div className="mb-5 grid grid-cols-2 rounded-xl bg-gold-100 p-1">
              <button
                onClick={() => setNarxTuri("chakana")}
                disabled={!narxRuxsati.chakana}
                className={[
                  "rounded-lg py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40",
                  narxTuri === "chakana"
                    ? "border border-gold-300 bg-white text-gold-600"
                    : "text-[#64748B] hover:text-gold-600",
                ].join(" ")}
              >
                {t("customer.retailPrice")}
              </button>
              <button
                onClick={() => setNarxTuri("ulgurji")}
                disabled={!narxRuxsati.ulgurji}
                className={[
                  "rounded-lg py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40",
                  narxTuri === "ulgurji"
                    ? "border border-gold-300 bg-white text-gold-600"
                    : "text-[#64748B] hover:text-gold-600",
                ].join(" ")}
              >
                {t("customer.wholesalePrice")}
              </button>
            </div>

            <p className="mb-2 text-sm font-bold text-[#0F172A]">{t("customer.choosePaymentType")}</p>
            <div className="mb-5 grid grid-cols-2 gap-2">
              {paymentTypes.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setPaymentType(item.label)}
                  aria-pressed={paymentType === item.label}
                  // Tanlangan tur o'z rangida (TOLOV_TURI_RANGLARI): naqd — yashil, Payme/Click — ko'k, bank — siyohrang.
                  style={paymentType === item.label ? { background: tolovRangi(item.apiTuri).fon, borderColor: tolovRangi(item.apiTuri).chegara, color: tolovRangi(item.apiTuri).matn } : undefined}
                  className={[
                    "flex h-11 items-center justify-center rounded-xl border bg-white text-sm font-bold transition",
                    paymentType === item.label
                      ? "shadow-gold-soft ring-2 ring-current/20"
                      : "border-gray-200 text-gray-700 hover:border-gold-200",
                  ].join(" ")}
                >
                  <WalletCards
                    size={15}
                    className="mr-2"
                    style={{ color: tolovRangi(item.apiTuri).matn }}
                  />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-auto rounded-xl bg-gold-50 p-3">
              <div className="mb-2 flex justify-between text-xs text-[#64748B]">
                <span>{t("customer.subtotal")}</span>
                <span>{formatSumma(total)}</span>
              </div>

              {avtoChegirma > 0 && (
                <div className="mb-2 flex justify-between text-xs font-semibold text-emerald-700">
                  <span>{t("customer.autoDiscountLine")}</span>
                  <span>−{formatSumma(avtoChegirma)}</span>
                </div>
              )}

              {ustama > 0 && (
                <div className="mb-2 flex justify-between text-xs font-semibold text-amber-700">
                  <span>{t("customer.markupLine")}</span>
                  <span>+{formatSumma(ustama)}</span>
                </div>
              )}

              {discountSum > 0 && (
                <div className="mb-2 flex justify-between text-xs font-semibold text-emerald-700">
                  <span>{t("customer.extraDiscountLine")}</span>
                  <span>−{formatSumma(discountSum)}</span>
                </div>
              )}

              <div className="mb-3 flex justify-between text-sm font-black text-[#0F172A]">
                <span>{t("customer.total")}</span>
                <span className="text-gold-600">{formatSumma(payableTotal)}</span>
              </div>

              <button
                onClick={handlePay}
                disabled={saving || loading || cart.length === 0}
                className="theme-primary-gradient flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-br from-gold-300 to-gold-600 text-xs font-bold text-white shadow-gold-soft transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-gray-300 disabled:shadow-none"
              >
                {saving && <LoaderCircle size={15} className="animate-spin" />}
                {t("customer.pay")}
              </button>

              <button
                onClick={() => (cart.length > 0 ? setKechiktirishOchiq(true) : clearCart())}
                className="mt-2 h-10 w-full rounded-xl bg-white text-xs font-bold text-[#64748B] transition hover:text-gold-600"
              >
                {t("customer.postpone")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <p className="mb-2 text-sm font-bold text-gray-700">{t("customer.regularCustomers")}</p>
              <div className="flex h-10 items-center gap-2 rounded-lg bg-white px-3 ring-1 ring-gray-100">
                <input
                  ref={customerSearchRef}
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  placeholder={t("customer.searchPlaceholder")}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
                <Search size={17} className="text-gray-300" />
              </div>
              {/* "+ Mijoz qo'shish" doim ko'rinadi (hech narsa yozilmagan bo'lsa ham); oyna qidiruvdagi matn bilan to'ladi. "Mijoz topilmadi"
                  holatida tugma ro'yxat o'rnidagi blokda turadi (ikki marta chiqmasin). */}
              {!(customerSearch.trim() && filteredCustomers.length === 0 && !loading) && (
              <button
                type="button"
                onClick={() => mijozQoshishniOchish("doimiy", customerSearch)}
                className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gold-300 bg-gold-50/60 text-xs font-bold text-gold-600 transition hover:bg-gold-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
              >
                <Plus size={15} />
                {t("customer.addCustomer")}
              </button>
              )}
            </div>

            <div className="mb-5 max-h-[420px] space-y-3 overflow-auto pr-1">
              {filteredCustomers.map((customer) => {
                const isActive = selectedCustomerId === String(customer.id);

                return (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomerId(String(customer.id))}
                    className={[
                      "w-full rounded-2xl border bg-white p-4 text-left transition hover:bg-gold-50",
                      isActive
                        ? "border-gold-500 bg-gold-50 shadow-sm shadow-gold-100"
                        : "border-gray-100",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">
                          {mijozNomi(customer)}
                        </p>
                        <p className="mt-1 text-xs font-medium text-gray-500">
                          {customer.phone || t("customer.noPhone")}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-600">
                        {t("customer.customerBadge")}
                      </span>
                    </div>
                  </button>
                );
              })}

              {filteredCustomers.length === 0 && (
                <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-slate-50/60 px-4 py-5 text-center">
                  <p className="max-w-[240px] text-sm leading-5 text-gray-400">
                    {customerSearch.trim() ? t("customer.notFound") : t("customer.searchHint")}
                  </p>
                  {customerSearch.trim() && !loading && (
                    <button
                      type="button"
                      onClick={() => mijozQoshishniOchish("doimiy", customerSearch)}
                      className="inline-flex h-10 w-full max-w-[220px] shrink-0 items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-gold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2"
                    >
                      <Plus size={16} />
                      {t("customer.addCustomer")}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mb-5 grid grid-cols-2 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setNarxTuri("chakana")}
                disabled={!narxRuxsati.chakana}
                className={[
                  "rounded-md py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40",
                  narxTuri === "chakana"
                    ? "border border-gold-300 bg-white text-gold-600"
                    : "text-gray-500 hover:text-gold-600",
                ].join(" ")}
              >
                {t("customer.retailPrice")}
              </button>
              <button
                onClick={() => setNarxTuri("ulgurji")}
                disabled={!narxRuxsati.ulgurji}
                className={[
                  "rounded-md py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40",
                  narxTuri === "ulgurji"
                    ? "border border-gold-300 bg-white text-gold-600"
                    : "text-gray-500 hover:text-gold-600",
                ].join(" ")}
              >
                {t("customer.wholesalePrice")}
              </button>
            </div>

            <button
              onClick={() => void handleNextCustomer()}
              disabled={saving || loading || cart.length === 0 || !selectedCustomerId}
              className="mt-auto flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gold-500 text-sm font-bold text-white transition hover:bg-gold-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {saving && <LoaderCircle size={15} className="animate-spin" />}
              {t("customer.next")}
            </button>
          </>
        )}
      </aside>

      {mijozQoshishOchiq && (
        <XaridorModal
          boshlangich={null}
          boshlangichMatn={mijozQoshishManbasi.matn}
          kompaniyalar={mijozKompaniyalari}
          onYopish={() => {
            if (!mijozSaqlanmoqda.current) setMijozQoshishOchiq(false);
          }}
          onSaqlash={mijozQoshish}
        />
      )}
      {doimiySotuvOchiq && saving && (
        <AppModal actionRail={false} className="bg-slate-950/60 backdrop-blur-md">
          <section role="dialog" aria-modal="true" aria-label={t("doimiySotuv.creating")} aria-busy="true" className="flex min-h-64 w-full max-w-lg flex-col items-center justify-center gap-4 rounded-3xl bg-white px-8 py-10 text-center shadow-2xl">
            <LoaderCircle size={36} className="animate-spin text-gold-500" />
            <p className="text-lg font-bold text-slate-900">{t("doimiySotuv.creating")}</p>
            <p className="text-sm text-slate-500">{t("doimiySotuv.creatingHint")}</p>
          </section>
        </AppModal>
      )}
      {doimiySotuvOchiq && !saving && tanlanganSotuv && (
        <SotuvTafsilotlariModal
          sotuv={tanlanganSotuv}
          qoldiqlar={savdoQoldiqlar}
          xodimlar={savdoXodimlar}
          amalBajarilmoqda={amalBajarilmoqda}
          onYopish={doimiySotuvniYopish}
          onYangilash={sotuvniYangilash}
          onTolovQoshish={sotuvgaTolovQoshish}
          onTasdiqlash={async (sotuvId) => {
            if (await sotuvniTasdiqlash(sotuvId)) {
              doimiySotuvniYopish();
              setMessage({ type: "success", text: t("doimiySotuv.confirmed") });
            }
          }}
          onBekorQilish={(sotuvId) => void doimiySotuvniBekorQilish(sotuvId)}
        />
      )}
      {doimiySotuvOchiq && savdoXatoligi && (
        <div
          role="alert"
          className="fixed left-1/2 top-4 z-[100200] flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-2xl"
        >
          <span>{savdoXatoligi}</span>
          <button type="button" onClick={xatolikniTozalash} aria-label={t("cart.close")} className="shrink-0 rounded-lg p-1 hover:bg-white/20">
            <X size={16} />
          </button>
        </div>
      )}
      {tolovModalOchiq && (
        <AppModal className="bg-slate-950/60 backdrop-blur-md">
          <section onKeyDown={(event) => { if (enterTolovniTasdiqlaydimi(event, { mumkin: tolovYaroqli, band: saving })) { event.preventDefault(); void tolovniTasdiqlash(); } }} className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[38px] border border-gold-100 bg-gradient-to-br from-[#F8FAFC] via-white to-[#E8EEF7] shadow-[0_35px_120px_rgba(15,23,42,.38)]">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gold-100 bg-white/85 px-9 py-7 backdrop-blur-xl">
              <div><p className="text-xs font-black uppercase tracking-[.22em] text-gold-500">{t("paymentModal.eyebrow")}</p><h2 className="mt-1 text-2xl font-black text-slate-950">{t("paymentModal.title")}</h2><p className="mt-1 text-sm font-semibold text-slate-400">{t("paymentModal.subtitle")}</p></div>
              <button aria-label={t("common:actions.close")} type="button" onClick={() => setTolovModalOchiq(false)} disabled={saving} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-gold-100 hover:bg-gold-500 hover:text-white disabled:opacity-50"><X size={20}/></button>
            </header>

            <div className="grid gap-8 p-9 lg:grid-cols-[minmax(0,1fr)_400px]">
              <div>
                <div className="mb-4 flex items-center justify-between"><h3 className="font-black text-slate-900">{t("paymentModal.products")}</h3><span className="rounded-full bg-gold-50 px-3 py-1 text-xs font-black text-gold-600">{t("paymentModal.piecesCount", { count: cartPiecesCount })}</span></div>
                {new Set(cart.map((item) => item.warehouseId || warehouseId)).size > 1 && (
                  <p className="mb-3 rounded-2xl bg-gold-50 px-4 py-3 text-xs font-bold leading-5 text-gold-700">
                    {t("paymentModal.multiWarehouseNote", { count: new Set(cart.map((item) => item.warehouseId || warehouseId)).size })}
                  </p>
                )}
                <div className="max-h-[480px] space-y-3 overflow-y-auto pr-1">
                  {cart.map((item) => <article key={item.id} className="flex items-center justify-between gap-5 rounded-[24px] border border-gold-100 bg-white p-5 shadow-[0_12px_35px_rgba(37,99,235,.07)]"><div className="min-w-0"><p className="truncate text-base font-black text-slate-900">{item.nom}</p><p className="mt-1.5 text-sm font-semibold text-slate-400">{item.soni} × {formatSumma(item.narx)} · {item.warehouseName || t("paymentModal.selectedWarehouseFallback")}</p></div><p className="shrink-0 text-base font-black text-gold-600">{formatSumma(item.soni * item.narx)}</p></article>)}
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-sm"><Summary label={t("customer.subtotal")} value={formatSumma(total + ustama)}/><Summary label={t("customer.totalDiscount")} value={formatSumma(jamiChegirma)}/><Summary label={t("paymentModal.payable")} value={formatSumma(payableTotal)} accent/></div>
              </div>

              <aside className="flex flex-col rounded-[30px] border border-gold-100 bg-white p-7 shadow-[0_18px_50px_rgba(37,99,235,.10)]">
                <div className="rounded-[24px] bg-[#F8FAFC] p-5 ring-1 ring-gold-100"><p className="text-xs font-black uppercase tracking-wide text-slate-400">{t("paymentModal.totalPayable")}</p><p className="mt-2 text-3xl font-black text-slate-950">{formatSumma(payableTotal)}</p><p className="mt-2 text-sm font-bold text-gold-500">{t("paymentModal.selected", { type: paymentType })}</p></div>
                <div role="radiogroup" aria-label={t("customer.choosePaymentType")} className="mt-5 flex flex-wrap gap-2">
                  {TOLOV_TEZKOR_TARTIBI.map((kalit, raqam) => {
                    const tur = paymentTypes.find((item) => item.kalit === kalit);
                    if (!tur) return null;
                    const tanlangan = paymentType === tur.label;
                    const rang = tolovRangi(tur.apiTuri);
                    return (
                      <button
                        key={kalit}
                        type="button"
                        role="radio"
                        aria-checked={tanlangan}
                        onClick={() => setPaymentType(tur.label)}
                        style={tanlangan ? { background: rang.fon, color: rang.matn, borderColor: rang.chegara } : undefined}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${tanlangan ? "ring-2 ring-current/20" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                      >
                        <kbd className="rounded bg-white/70 px-1 text-[10px] font-black text-slate-500 ring-1 ring-slate-200">{raqam + 1}</kbd>
                        {tur.label}
                      </button>
                    );
                  })}
                </div>
                <label className="mt-6 block"><span className="text-xs font-black uppercase tracking-wide text-slate-400">{t("paymentModal.acceptedAmount")}</span><div className="mt-2 flex h-16 items-center rounded-2xl border border-gold-200 bg-[#F8FAFC] px-5 focus-within:ring-4 focus-within:ring-gold-50"><SummaMaydoni value={tolovSummasi} onChange={setTolovSummasi} placeholder="0" className="min-w-0 flex-1 bg-transparent text-2xl font-black text-slate-900 outline-none"/><span className="text-sm font-black text-gold-500">{dollarSavat ? "$" : t("customer.currency")}</span></div></label>
                {dollarTolovMumkin && (
                  <div className="mt-4 rounded-2xl border border-gold-100 bg-white p-4">
                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-400">{t("paymentModal.dollarAmount")}</span>
                      <div className="mt-2 flex h-14 items-center rounded-2xl border border-gold-200 bg-[#F8FAFC] px-4 focus-within:ring-4 focus-within:ring-gold-50">
                        <SummaMaydoni value={dollarTolovi} onChange={dollarOzgardi} placeholder="0" className="min-w-0 flex-1 bg-transparent text-xl font-black text-slate-900 outline-none" />
                        <span className="text-sm font-black text-gold-500">$</span>
                      </div>
                    </label>
                    <p className="mt-2 text-[11px] font-semibold text-slate-400">{t("paymentModal.rateLine", { kurs: kurs.toLocaleString("uz-UZ", { maximumFractionDigits: 2 }) })}</p>
                    <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-500">
                      <input type="checkbox" checked={qaytimYaxlitlash} onChange={(e) => setQaytimYaxlitlash(e.target.checked)} className="h-4 w-4 accent-gold-500" />
                      {t("paymentModal.roundChange")}
                    </label>
                  </div>
                )}
                {(dollarTiyin > 0 || qaytim > 0) && (
                  <div className="mt-3 space-y-1.5 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
                    {dollarTiyin > 0 && <div className="flex justify-between gap-3"><span>{t("paymentModal.dollarInSom")}</span><span>{somMatni(dollarSomda)}</span></div>}
                    <div className="flex justify-between gap-3"><span>{t("paymentModal.receivedTotal")}</span><span>{somMatni(qabulJami)}</span></div>
                    {qaytimBerish > 0 && <div className="flex justify-between gap-3 text-emerald-700"><span>{t(dollarSavat ? "paymentModal.changePlain" : "paymentModal.change")}</span><span>{somMatni(qaytimBerish)}</span></div>}
                    {qarzQoldi > 0 && <div className="flex justify-between gap-3 text-amber-700"><span>{t("paymentModal.debtLeft")}</span><span>{somMatni(qarzQoldi)}</span></div>}
                  </div>
                )}
                <div className="mt-4 flex gap-3"><button type="button" onClick={() => { setTolovSummasi(String(payableTotal)); setDollarTolovi(""); }} className="flex-1 rounded-2xl bg-gold-50 px-3 py-3 text-xs font-black text-gold-600">{t("paymentModal.fullAmount")}</button><button type="button" onClick={() => { setTolovSummasi(String(pul(payableTotal / 2))); setDollarTolovi(""); }} className="flex-1 rounded-2xl bg-slate-100 px-3 py-3 text-xs font-black text-slate-600">50%</button></div>
                {message?.type === "error" && <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-xs font-bold leading-5 text-red-600">{message.text}</div>}
                <button type="button" onClick={() => void tolovniTasdiqlash()} disabled={saving || !tolovYaroqli} className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-500 px-5 py-4 text-sm font-black text-white shadow-lg shadow-gold-200 transition hover:bg-gold-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">{saving && <LoaderCircle size={17} className="animate-spin"/>} {t("paymentModal.confirm")}</button>
              </aside>
            </div>
          </section>
        </AppModal>
      )}
      {kechiktirishOchiq && (
        <TasdiqlashOynasi
          ikonka={<Trash2 size={24} />}
          ohang="sariq"
          sarlavha={t("customer.postponeConfirm.title")}
          nom={t("customer.postponeConfirm.items", { count: cart.length })}
          tavsif={t("customer.postponeConfirm.description")}
          ortgaMatni={t("customer.postponeConfirm.no")}
          tasdiqMatni={t("customer.postponeConfirm.yes")}
          jarayonMatni={t("customer.postponeConfirm.yes")}
          onTasdiq={async () => { clearCart(); setKechiktirishOchiq(false); }}
          onYopish={() => setKechiktirishOchiq(false)}
        />
      )}
      {tahrirQatori && (
        <SavatchaMahsulotTahriri key={tahrirQatori.id} qator={tahrirQatori} onYopish={() => setTahrirQatori(null)} />
      )}
      {tezkorTugmalarOchiq && (
        <AppModal onClose={() => setTezkorTugmalarOchiq(false)} actionRail={false}>
          <section role="dialog" aria-modal="true" aria-label={t("keyboard.title")} data-tezkor-tugmalar className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-900">{t("keyboard.title")}</h2>
              <button type="button" onClick={() => setTezkorTugmalarOchiq(false)} aria-label={t("common:actions.close")} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <dl className="divide-y divide-slate-100 text-sm">
              {(t("keyboard.rows", { returnObjects: true }) as Array<[string, string]>).map(([tugma, tavsif]) => (
                <div key={tugma} className="flex items-center justify-between gap-4 py-2">
                  <dt><kbd className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-700 ring-1 ring-slate-200">{tugma}</kbd></dt>
                  <dd className="text-right text-slate-600">{tavsif}</dd>
                </div>
              ))}
            </dl>
          </section>
        </AppModal>
      )}
    </div>
  );
}

function Summary({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-2xl p-3 ${accent ? "bg-gold-500 text-white" : "bg-white text-slate-700 ring-1 ring-gold-100"}`}><p className={`text-[10px] font-black uppercase ${accent ? "text-white/70" : "text-slate-400"}`}>{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>;
}
