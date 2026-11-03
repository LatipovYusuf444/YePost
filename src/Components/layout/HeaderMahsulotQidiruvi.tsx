import { useInventorySettingsStore } from "@/store/inventorySettingsStore";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type UIEvent } from "react";
import { AlertTriangle, Check, ChevronDown, LayoutGrid, LoaderCircle, RefreshCw, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { pulMatni } from "@/lib/valyuta";
import { asosiyMiqdor, birlikTopish } from "@/lib/kopBirlik";
import { mahsulotlarniServerdanQidirish, omborlarRoyxatiniOlish } from "@/api/savdoApi";
import { Popover, PopoverAnchor, PopoverContent } from "@/Components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/Components/ui/dropdown-menu";
import { kategoriyalarApi } from "@/api/catalogApi";
import { usePosStore } from "@/store/posStore";
import { useKassaNarxTurlari } from "@/store/savdoSozlamalariStore";
import type { Kategoriya } from "@/types/catalog";
import { dollarMalumoti, qoldiqNarxi, savatNomi } from "./posMahsulotlari";
import { qatorlarniUlash, serverQatorlari, SERVER_SAHIFA_HAJMI, type Qator } from "./headerQidiruv";

// Bosh sahifa (POS) headeridagi tezkor qidiruv: mahsulot nomi, shtrix-kod yoki artikul bo'yicha qidiriladi,
// ↑/↓ bilan tanlanadi, Enter (yoki skaner: kod + Enter) mahsulotni savatchaga qo'shadi.
// So'z serverga yuboriladi (GET /catalog/modifications/search, 300 ms kechikish bilan): narx va qoldiq shu javobda, butun katalog yuklanmaydi.
// Skaner kodi Enter bosilgach kutmasdan so'raladi va maydon darrov bo'shaydi — ketma-ket skanlar bir-biriga qo'shilib ketmaydi.
// Kategoriya filtri: qidiruv maydoni yonidagi tugma bilan kategoriya tanlanadi — natijalar faqat shu kategoriya mahsulotlari
// bo'ladi, yozuvsiz esa kategoriyaning butun ro'yxati ko'rinadi (skaner kodi esa kategoriyadan qat'i nazar topiladi).
// Kategoriya ham serverda filtrlanadi (search?categoryId=, so'z bilan ham, so'zsiz ham): butun katalog yuklanmaydi, ro'yxat sahifalab olinadi.

type ServerNatija = { qatorlar: Array<Qator & { daraja: number }>; jami: number; omborlarSoni: number };

const KESH_MUDDATI = 60_000;
// Yozish to'xtagach serverga so'rov ketguncha kutiladigan vaqt.
const QIDIRUV_KECHIKISHI = 300;
// Skaner kodlari keshi: bir xil mahsulotni ketma-ket skanlash serverni kutmaydi.
const KOD_KESHI_HAJMI = 200;
// Ro'yxat oxiriga shuncha piksel qolganda keyingi sahifa olinadi.
const KEYINGI_SAHIFA_MASOFASI = 80;
// Kategoriya menyusi (hover): kursor tugmaga kelgach shu vaqtdan keyin ochiladi (tasodifiy o'tishda chaqnamasligi uchun),
// tugma/menyudan chiqqach shu vaqtdan keyin yopiladi (tugmadan menyuga o'tishda yopilib ketmasligi uchun).
const HOVER_OCHISH_KECHIKISHI = 80;
const HOVER_YOPISH_KECHIKISHI = 220;
// "Barcha kategoriyalar" varianti uchun (menyu elementining qiymati bo'sh bo'lmasligi kerak).
const HAMMA_KATEGORIYA = "__hammasi__";
// Kategoriyalar ro'yxati kam o'zgaradi: sahifa almashganda qayta so'ralmasligi uchun modul darajasida saqlanadi.
let kategoriyalarKeshi: Kategoriya[] | null = null;
let omborlarKeshi: { vaqt: number; sorov: Promise<Array<{ id: string; nom: string }>> } | null = null;
const kodKeshi = new Map<string, { vaqt: number; natija: Promise<ServerNatija> }>();

function omborNomi(ombor: { fullName?: string; name?: string; id: string }) {
  return ombor.fullName || ombor.name || ombor.id;
}

function omborlarniOlish() {
  if (omborlarKeshi && Date.now() - omborlarKeshi.vaqt < KESH_MUDDATI) return omborlarKeshi.sorov;
  const yozuv = {
    vaqt: Date.now(),
    sorov: omborlarRoyxatiniOlish().then((royxat) => royxat.map((ombor) => ({ id: String(ombor.id), nom: omborNomi(ombor) }))),
  };
  omborlarKeshi = yozuv;
  yozuv.sorov.catch(() => {
    if (omborlarKeshi === yozuv) omborlarKeshi = null;
  });
  return yozuv.sorov;
}

async function serverdanOlish(soz: string, sahifa: number, signal?: AbortSignal, kategoriyaId = ""): Promise<ServerNatija> {
  // Ombor ro'yxati olinmasa ham qidiruv ishlaydi: qoldiq hamma omborlar yig'indisi, ombor sotuvda tanlanadi.
  const omborlar = await omborlarniOlish().catch(() => []);
  const natijalar = await mahsulotlarniServerdanQidirish({
    search: soz,
    page: sahifa,
    pageSize: SERVER_SAHIFA_HAJMI,
    warehouseIds: omborlar.map((ombor) => ombor.id),
    categoryId: kategoriyaId || undefined,
    signal,
  });
  const nomlar = new Map(omborlar.map((ombor) => [ombor.id, ombor.nom]));
  return {
    qatorlar: serverQatorlari(natijalar.map((natija) => ({ ...natija, warehouseName: nomlar.get(natija.warehouseId) ?? "" })), soz),
    jami: Math.max(...natijalar.map((natija) => natija.jami)),
    omborlarSoni: omborlar.length,
  };
}

function koddanOlish(kod: string) {
  const kalit = kod.toLowerCase();
  const mavjud = kodKeshi.get(kalit);
  if (mavjud && Date.now() - mavjud.vaqt < KESH_MUDDATI) return mavjud.natija;
  if (kodKeshi.size >= KOD_KESHI_HAJMI) kodKeshi.clear();
  const natija = serverdanOlish(kod, 1);
  kodKeshi.set(kalit, { vaqt: Date.now(), natija });
  natija.catch(() => kodKeshi.delete(kalit));
  return natija;
}

function qisqartma(nom: string) {
  const sozlar = nom.split(/\s+/).filter(Boolean);
  return (sozlar.length > 1 ? sozlar[0][0] + sozlar[1][0] : nom.slice(0, 2)).toUpperCase();
}

type Props = {
  // Qidiruv maydonining ("tabletka") ko'rinish sinflari.
  className: string;
  // Kategoriya tugmasi + qidiruv maydonini o'rab turgan blokning header ichidagi joylashuvi (flex-1, order-last ...).
  oramClassName?: string;
};

export default function HeaderMahsulotQidiruvi({ className, oramClassName = "flex-1" }: Props) {
  const { t } = useTranslation("topbar");
  const canSellNegative = useInventorySettingsStore((s) => s.canSellNegative);
  const narxTuri = usePosStore((state) => state.narxTuri);
  // Sozlamalar → Sotuv: o'chirilgan narx turi tanlangan bo'lsa, savatchaga qo'shishdan oldin ruxsat etilgan turga o'tkaziladi.
  useKassaNarxTurlari();
  const [soz, setSoz] = useState("");
  const [ochiq, setOchiq] = useState(false);
  const [faol, setFaol] = useState(-1);
  const [xabar, setXabar] = useState<{ xato: boolean; matn: string } | null>(null);
  // Server qidiruvi: `server.soz`/`server.kategoriya` — javob qaysi so'rov uchun. Yangi so'z javobi kelguncha eski ro'yxat ko'rinib turadi
  // (miltillamasligi uchun); boshqa kategoriyaning ro'yxati esa ko'rsatilmaydi.
  const [server, setServer] = useState<(ServerNatija & { soz: string; kategoriya: string; sahifa: number }) | null>(null);
  const [qidirilmoqda, setQidirilmoqda] = useState(false);
  const [serverXato, setServerXato] = useState(false);
  const qidiruvRaqami = useRef(0);
  const qidiruvBekor = useRef<AbortController | null>(null);
  const kechikishTaymeri = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const oramRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const xabarTaymeri = useRef<number | null>(null);

  // Kategoriya filtri.
  const [kategoriyalar, setKategoriyalar] = useState<Kategoriya[]>(() => kategoriyalarKeshi ?? []);
  const [kategoriyaId, setKategoriyaId] = useState("");
  const [kategoriyaOchiq, setKategoriyaOchiq] = useState(false);
  // Menyu kursor bilan ochilganmi (shunda fokus qidiruv maydonidan olinmaydi) va hover kechikish taymeri.
  const hoverBilanOchilgan = useRef(false);
  const hoverTaymeri = useRef<number | null>(null);
  // Kursor tugmaga kelganda yozish maydoni fokusda edimi: Radix menyu ochilganda fokusni o'ziga oladi, shunda uni qaytaramiz.
  const inputFokusdaEdi = useRef(false);
  const tugmaRef = useRef<HTMLButtonElement | null>(null);

  const tanlanganKategoriya = kategoriyalar.find((kategoriya) => kategoriya.id === kategoriyaId);
  const matn = soz.trim();
  // So'z yoki kategoriya bo'lsa ro'yxat serverdan so'raladi; javob aynan shu so'rov uchun kelgan bo'lsa — tayyor.
  const sorovBor = Boolean(matn) || Boolean(kategoriyaId);
  const natijaTayyor = sorovBor && server?.soz === matn && server?.kategoriya === kategoriyaId;
  const natijalar = useMemo(() => (sorovBor && server?.kategoriya === kategoriyaId ? server.qatorlar : []), [server, sorovBor, kategoriyaId]);
  const omborlarSoni = server?.omborlarSoni ?? 0;
  const panelKorinadi = ochiq && (Boolean(soz.trim()) || Boolean(xabar) || Boolean(kategoriyaId));

  const qidiruvniBekorQilish = useCallback(() => {
    qidiruvRaqami.current += 1;
    qidiruvBekor.current?.abort();
    qidiruvBekor.current = null;
    setQidirilmoqda(false);
  }, []);

  const serverdanQidirish = useCallback(async (qidiruvSozi: string, sahifa = 1, kategoriya = "") => {
    qidiruvBekor.current?.abort();
    const boshqaruv = new AbortController();
    qidiruvBekor.current = boshqaruv;
    const raqam = ++qidiruvRaqami.current;
    setQidirilmoqda(true);
    setServerXato(false);
    try {
      const natija = await serverdanOlish(qidiruvSozi, sahifa, boshqaruv.signal, kategoriya);
      if (raqam !== qidiruvRaqami.current) return;
      setServer((joriy) => ({
        ...natija,
        soz: qidiruvSozi,
        kategoriya,
        sahifa,
        qatorlar:
          sahifa > 1 && joriy?.soz === qidiruvSozi && joriy.kategoriya === kategoriya ? qatorlarniUlash(joriy.qatorlar, natija.qatorlar) : natija.qatorlar,
      }));
    } catch {
      if (raqam === qidiruvRaqami.current) setServerXato(true);
    } finally {
      if (raqam === qidiruvRaqami.current) {
        qidiruvBekor.current = null;
        setQidirilmoqda(false);
      }
    }
  }, []);

  // Yozish to'xtagach so'z (va tanlangan kategoriya) serverga yuboriladi; eski (kech kelgan) javob yangi ro'yxatni bosib ketmaydi.
  // Faqat kategoriya tanlansa (yozuvsiz) ro'yxat darrov so'raladi.
  useEffect(() => {
    if (!matn && !kategoriyaId) {
      qidiruvniBekorQilish();
      setServer(null);
      setServerXato(false);
      return;
    }
    kechikishTaymeri.current = window.setTimeout(() => void serverdanQidirish(matn, 1, kategoriyaId), matn ? QIDIRUV_KECHIKISHI : 0);
    return () => {
      if (kechikishTaymeri.current) window.clearTimeout(kechikishTaymeri.current);
    };
  }, [matn, kategoriyaId, qidiruvniBekorQilish, serverdanQidirish]);

  // Telefon ekrani: qidiruv maydonida qisqa maslahat va ixcham kategoriya tugmasi (joy tejaladi).
  const [kichikEkran, setKichikEkran] = useState(() => window.matchMedia("(max-width: 639px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const yangila = () => setKichikEkran(media.matches);
    media.addEventListener("change", yangila);
    return () => media.removeEventListener("change", yangila);
  }, []);

  // Telefondagi ekran klaviaturasi ko'rinadigan oynani (visualViewport) kichraytiradi, lekin Radix buni bilmaydi:
  // panelning balandligi qidiruv maydonidan pastdagi ko'rinadigan joyga sig'dirib turiladi.
  const [korinadiganBalandlik, setKorinadiganBalandlik] = useState<number | null>(null);
  useEffect(() => {
    const oyna = window.visualViewport;
    if (!panelKorinadi || !oyna) return;
    const yangila = () => {
      const rect = oramRef.current?.getBoundingClientRect();
      if (rect) setKorinadiganBalandlik(Math.max(160, Math.floor(oyna.height + oyna.offsetTop - rect.bottom - 20)));
    };
    yangila();
    oyna.addEventListener("resize", yangila);
    oyna.addEventListener("scroll", yangila);
    window.addEventListener("scroll", yangila, true);
    return () => {
      oyna.removeEventListener("resize", yangila);
      oyna.removeEventListener("scroll", yangila);
      window.removeEventListener("scroll", yangila, true);
    };
  }, [panelKorinadi]);

  // Kategoriyalar ro'yxati (fon rejimi: xato bo'lsa filtr tugmasi ko'rsatilmaydi, toast chiqmaydi).
  useEffect(() => {
    if (kategoriyalarKeshi) return;
    let active = true;
    kategoriyalarApi
      .royxat(true)
      .then((royxat) => {
        kategoriyalarKeshi = royxat;
        if (active) setKategoriyalar(royxat);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (xabarTaymeri.current) window.clearTimeout(xabarTaymeri.current);
      if (hoverTaymeri.current) window.clearTimeout(hoverTaymeri.current);
    },
    []
  );

  // Menyu ochilishi/yopilishi (klik, klaviatura, tashqariga bosish, Escape — hammasini Radix boshqaradi).
  function kategoriyaMenyusiHolati(ochildi: boolean) {
    if (hoverTaymeri.current) window.clearTimeout(hoverTaymeri.current);
    if (!ochildi) hoverBilanOchilgan.current = false;
    setKategoriyaOchiq(ochildi);
  }

  // Kursor (sichqoncha) bilan: tugmaga kelganda ochiladi, tugma yoki menyudan chiqqanda biroz kutib yopiladi.
  // Sensorli ekranda hover yo'q — u yerda oddiy bosish ishlaydi.
  function hoverOchish(event: { pointerType: string }) {
    if (event.pointerType !== "mouse") return;
    if (hoverTaymeri.current) window.clearTimeout(hoverTaymeri.current);
    if (kategoriyaOchiq) return;
    inputFokusdaEdi.current = document.activeElement === inputRef.current;
    hoverTaymeri.current = window.setTimeout(() => {
      hoverBilanOchilgan.current = true;
      kategoriyaMenyusiHolati(true);
    }, HOVER_OCHISH_KECHIKISHI);
  }

  // Radix menyu ochilganda (portal orqali, bir oz kechroq) fokusni menyuning o'ziga oladi. Menyu kursor bilan ochilgan va
  // yozish maydoni fokusda bo'lgan bo'lsa, fokus unga qaytariladi — yozish uzilmaydi. Kursor menyu bandlariga kelganda
  // (bandlar fokus oladi) bu ishlamaydi: foydalanuvchi endi menyu bilan ishlayapti.
  function menyuFokusOldi(event: { target: EventTarget; currentTarget: EventTarget }) {
    if (event.target !== event.currentTarget) return;
    if (hoverBilanOchilgan.current && inputFokusdaEdi.current) inputRef.current?.focus({ preventScroll: true });
  }

  function hoverYopish(event: { pointerType: string }) {
    if (event.pointerType !== "mouse") return;
    if (hoverTaymeri.current) window.clearTimeout(hoverTaymeri.current);
    hoverTaymeri.current = window.setTimeout(() => kategoriyaMenyusiHolati(false), HOVER_YOPISH_KECHIKISHI);
  }

  function kategoriyaniTanlash(id: string) {
    setKategoriyaId(id);
    setKategoriyaOchiq(false);
    hoverBilanOchilgan.current = false;
    setFaol(-1);
    // Kategoriya tanlansa natijalar darrov ochiladi (yozuvsiz ham ro'yxat ko'rinadi).
    setOchiq(Boolean(id) || Boolean(soz.trim()));
    inputRef.current?.focus();
  }

  function xabarBerish(xatoMi: boolean, matn: string) {
    setXabar({ xato: xatoMi, matn });
    // Xatoda kod belgilanadi: keyingi skan (yoki yozuv) uni almashtiradi, eski kodga qo'shilib ketmaydi.
    if (xatoMi) inputRef.current?.select();
    if (xabarTaymeri.current) window.clearTimeout(xabarTaymeri.current);
    xabarTaymeri.current = window.setTimeout(() => setXabar(null), 3500);
  }

  // `tozalash` — maydon bo'shatiladi. Skaner kodi javobini kutganda u allaqachon bo'sh, keyingi skanni o'chirib yubormaslik uchun tegilmaydi.
  function qoshish(qator: Qator, tozalash = true) {
    const nom = savatNomi(qator.item) || t("posModal.unnamed");
    if (!canSellNegative && qator.qoldiq <= 0) {
      xabarBerish(true, t("search.outOfStockMessage", { name: nom }));
      return;
    }
    const narx = qoldiqNarxi(qator.item, narxTuri);
    if (narx <= 0) {
      xabarBerish(true, `${nom}: ${t("posModal.errors.noPrice")}`);
      return;
    }
    const holat = usePosStore.getState();
    const savatQatori = holat.cart.find((item) => item.id === qator.kalit);
    const savatdagi = savatQatori?.soni ?? 0;
    // Pochka shtrix-kodi: 1 pochka qo'shiladi. Qoldiq asosiy birlikda, savatchadagi qator esa boshqa birlikda turgan bo'lishi mumkin.
    const birlik = qator.birlik;
    const savatBirligi = birlikTopish(savatQatori?.birliklar, savatQatori?.birlikId);
    const yetmaydi = birlik ? asosiyMiqdor(savatBirligi, savatdagi) + asosiyMiqdor(birlik, 1) > qator.qoldiq : savatdagi >= qator.qoldiq;
    if (!canSellNegative && yetmaydi) {
      xabarBerish(true, t("search.notEnough", { name: nom, available: qator.qoldiq }));
      return;
    }
    holat.addToCart(
      {
        id: qator.kalit,
        modificationId: qator.item.modificationId,
        nom,
        narx,
        chakanaNarx: qoldiqNarxi(qator.item, "chakana"),
        ulgurjiNarx: qoldiqNarxi(qator.item, "ulgurji"),
        ...dollarMalumoti(qator.item),
        qoldiq: qator.qoldiq,
        ...(qator.item.birliklar?.length ? { birliklar: qator.item.birliklar } : {}),
        warehouseId: qator.warehouseId,
        warehouseName: qator.warehouseName,
      },
      birlik && savatQatori ? asosiyMiqdor(birlik, 1) / asosiyMiqdor(savatBirligi, 1) : 1
    );
    if (birlik && !savatQatori) usePosStore.getState().setBirlik(qator.kalit, birlik.unitId);
    const yangiSoni = usePosStore.getState().cart.find((item) => item.id === qator.kalit)?.soni ?? savatdagi + 1;
    xabarBerish(false, birlik ? t("search.addedUnit", { name: nom, qty: yangiSoni, birlik: birlik.nomi }) : t("search.added", { name: nom, qty: yangiSoni }));
    if (!tozalash) return;
    // Keyingi mahsulot (yoki keyingi skan) uchun maydon tozalanadi va fokus qoladi.
    setSoz("");
    setFaol(-1);
    inputRef.current?.focus();
  }

  // Enter natija kelishidan oldin bosilgan (skaner): kod bitta so'rov bilan tekshiriladi, faqat shtrix-kod/artikul aniq mos kelsa qo'shiladi.
  // Topilmasa kod maydonga qaytadi (agar kassir shu orada yangi narsa yozmagan bo'lsa) va belgilanadi: keyingi skan uni almashtiradi.
  async function kodBilanQoshish(kod: string) {
    let xato = false;
    try {
      const birinchi = (await koddanOlish(kod)).qatorlar[0];
      if (birinchi?.daraja === 0) {
        qoshish(birinchi, false);
        return;
      }
    } catch {
      xato = true;
    }
    setSoz((joriy) => joriy || kod);
    setFaol(0);
    setOchiq(true);
    xabarBerish(true, t(xato ? "search.loadFailed" : "search.notExact"));
    window.requestAnimationFrame(() => inputRef.current?.select());
  }

  // Kod (shtrix-kod/artikul) kategoriyadan qat'i nazar aniq mos kelsa o'sha mahsulot, aks holda ro'yxatda tanlangan qator qo'shiladi.
  async function kodYokiTanlangan(kod: string, tanlangan: Qator) {
    try {
      const aniq = (await koddanOlish(kod)).qatorlar[0];
      if (aniq?.daraja === 0) {
        qoshish(aniq);
        return;
      }
    } catch {
      // Tekshirib bo'lmasa ro'yxatdagi tanlov qo'shiladi.
    }
    qoshish(tanlangan);
  }

  function royxatSuriladi(event: UIEvent<HTMLDivElement>) {
    // Scroll hodisalari holat yangilanishidan tezroq keladi: ketayotgan so'rov ref orqali tekshiriladi, aks holda bir sahifa ikki marta so'raladi.
    if (!server || !natijaTayyor || qidiruvBekor.current || server.sahifa * SERVER_SAHIFA_HAJMI >= server.jami) return;
    const royxat = event.currentTarget;
    if (royxat.scrollHeight - royxat.scrollTop - royxat.clientHeight <= KEYINGI_SAHIFA_MASOFASI) void serverdanQidirish(matn, server.sahifa + 1, kategoriyaId);
  }

  function klavish(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!ochiq) setOchiq(true);
      if (natijalar.length === 0) return;
      const keyingi =
        event.key === "ArrowDown"
          ? (faol + 1) % natijalar.length
          : faol <= 0
            ? natijalar.length - 1
            : faol - 1;
      setFaol(keyingi);
      window.requestAnimationFrame(() => {
        panelRef.current?.querySelector(`[data-qator="${keyingi}"]`)?.scrollIntoView({ block: "nearest" });
      });
    } else if (event.key === "Enter") {
      event.preventDefault();
      // Yozuvsiz Enter faqat kategoriya ro'yxatida ↑/↓ bilan tanlangan mahsulotni qo'shadi.
      if (!matn && !(kategoriyaId && faol >= 0)) return;
      if (matn && !natijaTayyor) {
        if (kechikishTaymeri.current) window.clearTimeout(kechikishTaymeri.current);
        qidiruvniBekorQilish();
        setSoz("");
        setFaol(-1);
        setOchiq(true);
        void kodBilanQoshish(matn);
        return;
      }
      const tanlangan = natijalar[faol];
      // Kategoriya ichidagi qator kodga aniq mos emas: yozilgan kod boshqa kategoriyadagi mahsulotniki bo'lishi mumkin — avval kategoriyasiz tekshiriladi.
      if (tanlangan && kategoriyaId && matn && tanlangan.daraja !== 0) void kodYokiTanlangan(matn, tanlangan);
      else if (tanlangan) qoshish(tanlangan);
      // Kategoriya ichida topilmagan kod (masalan, boshqa kategoriyadagi mahsulot skanerlandi) kategoriyadan qat'i nazar tekshiriladi.
      else if (natijalar.length === 0 && matn && kategoriyaId) {
        setSoz("");
        setFaol(-1);
        void kodBilanQoshish(matn);
      } else if (natijalar.length === 0) xabarBerish(true, t("search.empty"));
    } else if (event.key === "Escape") {
      if (soz || ochiq) {
        event.preventDefault();
        setSoz("");
        setFaol(-1);
        setOchiq(false);
      }
    } else if (event.key === "Tab") {
      setOchiq(false);
    }
  }

  const royxatKorinadi = sorovBor;
  const serverKutilmoqda = sorovBor && !natijaTayyor && !serverXato;
  const royxatYuklanmoqda = serverKutilmoqda && natijalar.length === 0;
  const royxatXatosi = serverXato && natijalar.length === 0;
  const yangilash = () => void serverdanQidirish(matn, 1, kategoriyaId);

  return (
    <Popover
      open={panelKorinadi}
      onOpenChange={(ochildi) => {
        if (!ochildi) setOchiq(false);
      }}
    >
      <PopoverAnchor asChild>
        <div ref={oramRef} className={`flex min-w-0 items-center gap-2 ${oramClassName}`}>
          {/* Kategoriya filtri: qidiruv maydonining oldida, alohida va kattaroq tugma. Kursor kelsa menyu sekin pastga tushib ochiladi. */}
          {kategoriyalar.length > 0 && (
            <div
              // Mavzuning asosiy rangida (bg-gold-500: ko'k/yashil/binafsha mavzularda mos o'zgaradi) to'q fon — sarlavhada aniq ko'rinadi.
              // Gradient (from-/to-gold) ishlatilmaydi: yashil/binafsha mavzularda mavzu CSS'i uni shaffof qilib qo'yadi.
              // Tanlanganda oq halqa va ✕ bo'limi qo'shiladi.
              className={`flex h-11 shrink-0 items-stretch overflow-hidden rounded-2xl border border-white/25 bg-gold-500 text-white shadow-md shadow-black/30 transition hover:brightness-110 ${
                tanlanganKategoriya ? "ring-2 ring-white/50" : ""
              }`}
            >
              {/* modal={false}: menyu ochiq turganda sahifa bloklanmaydi va hover/qidiruv maydoni ishlayveradi. */}
              <DropdownMenu open={kategoriyaOchiq} onOpenChange={kategoriyaMenyusiHolati} modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    ref={tugmaRef}
                    type="button"
                    onPointerEnter={hoverOchish}
                    onPointerLeave={hoverYopish}
                    // Kursor bilan ochilgan menyuda tugmani bosish uni yopib qo'ymaydi (Radix bosishda ochiq menyuni yopadi).
                    // Bayroq bu yerda o'chirilmaydi: Radix'ning "tashqarida bosildi" tekshiruvi (onPointerDownOutside) undan keyin o'qiydi.
                    onPointerDown={(event) => {
                      if (event.pointerType === "mouse" && kategoriyaOchiq && hoverBilanOchilgan.current) event.preventDefault();
                    }}
                    aria-label={t("search.categoryAria")}
                    title={t("search.categoryAria")}
                    className="inline-flex min-w-0 items-center gap-2 px-2.5 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60 sm:px-4"
                  >
                    <LayoutGrid size={18} className="shrink-0" aria-hidden />
                    <span className={`max-w-20 truncate sm:max-w-52 ${tanlanganKategoriya ? "" : "hidden sm:inline"}`}>
                      {tanlanganKategoriya?.name ?? t("search.category")}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 opacity-80 transition-transform duration-300 ${kategoriyaOchiq ? "rotate-180" : ""} ${tanlanganKategoriya ? "hidden sm:block" : ""}`}
                      aria-hidden
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={10}
                  collisionPadding={12}
                  onPointerEnter={hoverOchish}
                  onPointerLeave={hoverYopish}
                  // Kursor bilan ochilgan menyu fokus uchun qidiruv maydoni bilan "bahslashmaydi": fokus qaytarilsa menyu yopilmaydi
                  // (pastdagi effekt fokusni qidiruv maydoniga qaytaradi); yopilganda fokus tugmaga ko'chmaydi.
                  onFocus={menyuFokusOldi}
                  onFocusOutside={(event) => {
                    if (hoverBilanOchilgan.current) event.preventDefault();
                  }}
                  // Kursor bilan ochilgan menyuda tugmani bosish uni yopib qo'ymaydi (Radix tugmadagi bosishni "tashqarida" deb hisoblaydi).
                  onPointerDownOutside={(event) => {
                    if (hoverBilanOchilgan.current && tugmaRef.current?.contains(event.target as Node)) event.preventDefault();
                  }}
                  onCloseAutoFocus={(event) => event.preventDefault()}
                  // Radix animatsiyalari data-state orqali ishlaydi (kutubxonadagi data-open: sinflari bu yerda ta'sir qilmaydi).
                  // Ochilish: 300 ms, yuqoridan sekin pastga tushadi; yopilish tezroq (150 ms) — qotib qolgandek tuyulmasin.
                  className="z-[130] max-h-[min(360px,var(--radix-dropdown-menu-content-available-height))] w-72 max-w-[calc(100vw-24px)] rounded-2xl border border-slate-100 bg-white p-1.5 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,.28)] ring-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-300 data-[state=open]:ease-out data-[side=bottom]:data-[state=open]:slide-in-from-top-3 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-150 data-[state=closed]:ease-in motion-reduce:animate-none"
                >
                  <DropdownMenuRadioGroup
                    value={kategoriyaId || HAMMA_KATEGORIYA}
                    onValueChange={(qiymat) => kategoriyaniTanlash(qiymat === HAMMA_KATEGORIYA ? "" : qiymat)}
                  >
                    {[{ id: HAMMA_KATEGORIYA, name: t("search.allCategories") }, ...kategoriyalar].map((kategoriya) => {
                      const tanlangan = (kategoriya.id === HAMMA_KATEGORIYA ? "" : kategoriya.id) === kategoriyaId;
                      return (
                        <DropdownMenuRadioItem
                          key={kategoriya.id}
                          value={kategoriya.id}
                          // Radix'ning chap tomondagi belgisi yashiriladi: tanlangan variant o'ng tomonda ✓ bilan ko'rsatiladi.
                          className="justify-between gap-3 rounded-xl py-2.5 pr-3 pl-3 text-sm font-bold text-slate-700 focus:bg-slate-50 focus:text-slate-900 data-[state=checked]:bg-gold-50 data-[state=checked]:text-gold-700 [&>span:first-child]:hidden"
                        >
                          <span className="min-w-0 truncate">{kategoriya.name}</span>
                          {tanlangan && <Check size={16} className="shrink-0" aria-hidden />}
                        </DropdownMenuRadioItem>
                      );
                    })}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              {tanlanganKategoriya && (
                <button
                  type="button"
                  onClick={() => kategoriyaniTanlash("")}
                  aria-label={t("search.clearCategory")}
                  title={t("search.clearCategory")}
                  className="flex w-9 shrink-0 items-center justify-center border-l border-white/25 sm:w-10 text-white/80 transition hover:bg-black/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60"
                >
                  <X size={16} aria-hidden />
                </button>
              )}
            </div>
          )}

          <div className={`${className} min-w-0 flex-1`}>
            <Search size={18} className="mr-2 shrink-0 text-white/60 sm:mr-3" aria-hidden />
            <input
              ref={inputRef}
              value={soz}
              onChange={(event) => {
                setSoz(event.target.value);
                setFaol(event.target.value.trim() ? 0 : -1);
                setOchiq(true);
              }}
              // Maydon allaqachon fokusda bo'lsa (masalan, Escape'dan keyin) onFocus qayta ishlamaydi: bosish panelni qayta ochadi.
              onClick={() => setOchiq(true)}
              onFocus={() => {
                setOchiq(true);
                // Ombor ro'yxati oldindan tayyorlanadi (birinchi skan kutmasligi uchun).
                void omborlarniOlish().catch(() => undefined);
              }}
              onKeyDown={klavish}
              placeholder={kichikEkran ? t("search.shortPlaceholder") : t("posModal.searchPlaceholder")}
              aria-label={t("posModal.searchPlaceholder")}
              autoComplete="off"
              role="combobox"
              aria-expanded={panelKorinadi}
              aria-controls="header-mahsulot-royxati"
              aria-autocomplete="list"
              aria-activedescendant={panelKorinadi && faol >= 0 ? `header-mahsulot-${faol}` : undefined}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/50"
            />
            {soz && (
              <button
                type="button"
                onClick={() => {
                  setSoz("");
                  setFaol(-1);
                  inputRef.current?.focus();
                }}
                aria-label={t("posModal.clearSearchAria")}
                className="ml-2 shrink-0 text-white/60 transition hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

        </div>
      </PopoverAnchor>

      <PopoverContent
        ref={panelRef}
        side="bottom"
        align="start"
        sideOffset={8}
        collisionPadding={12}
        // Panel ochilganda fokus qidiruv maydonida qoladi (yozish uzilmasin).
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        // Qidiruv maydoni, kategoriya tugmasi yoki kategoriya menyusidagi bosish/fokus panelni yopmaydi.
        onInteractOutside={(event) => {
          const nishon = event.target as Element | null;
          if (oramRef.current?.contains(nishon) || nishon?.closest?.("[data-slot=dropdown-menu-content]")) event.preventDefault();
        }}
        // Kenglik: qidiruv bloki kengligidan kam emas (kamida 460 px), lekin ekrandagi bo'sh joydan oshmaydi — Radix hisoblaydi.
        // Balandlik: ekrandagi bo'sh joy va (telefonda) ekran klaviaturasi hisobga olinadi.
        style={{
          width: "max(var(--radix-popover-trigger-width), min(460px, var(--radix-popover-content-available-width)))",
          maxHeight: `min(${korinadiganBalandlik ?? 560}px, 560px, var(--radix-popover-content-available-height))`,
        }}
        className="z-[120] flex max-w-(--radix-popover-content-available-width) flex-col gap-0 overflow-hidden rounded-2xl border border-slate-100 bg-white p-0 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,.28)] ring-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 data-[state=open]:duration-200 data-[state=open]:ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-100 motion-reduce:animate-none"
      >
        {xabar && (
          <p
            role="status"
            className={`flex shrink-0 items-start gap-2 px-4 py-2.5 text-xs font-bold ${
              xabar.xato ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {xabar.xato ? <AlertTriangle size={14} className="mt-px shrink-0" /> : <Check size={14} className="mt-px shrink-0" />}
            <span className="min-w-0 break-words">{xabar.matn}</span>
          </p>
        )}

        {tanlanganKategoriya && (
          <p className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
            <LayoutGrid size={12} aria-hidden />
            <span className="min-w-0 truncate">{tanlanganKategoriya.name}</span>
          </p>
        )}

        {royxatKorinadi && (
          <div id="header-mahsulot-royxati" role="listbox" onScroll={royxatSuriladi} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
            {royxatYuklanmoqda ? (
              <p className="flex items-center gap-2 px-3 py-4 text-sm font-semibold text-slate-400">
                <LoaderCircle size={16} className="animate-spin text-gold-500" />
                {t("search.loading")}
              </p>
            ) : royxatXatosi ? (
              <div className="flex items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-red-500">
                <span>{t("search.loadFailed")}</span>
                <button
                  type="button"
                  onClick={yangilash}
                  className="shrink-0 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-black text-red-600 hover:bg-red-100"
                >
                  {t("search.retry")}
                </button>
              </div>
            ) : natijalar.length === 0 ? (
              <p className="px-3 py-4 text-sm font-semibold text-slate-400">
                {soz.trim() ? t("search.empty") : t("search.categoryEmpty")}
              </p>
            ) : (
              natijalar.map((qator, index) => {
                const nom = savatNomi(qator.item) || t("posModal.unnamed");
                const narx = qoldiqNarxi(qator.item, narxTuri);
                const mavjud = qator.qoldiq > 0;
                const kam = mavjud && qator.qoldiq <= 10;
                const barcode = qator.item.modification?.barcode;
                return (
                  <button
                    key={qator.kalit}
                    id={`header-mahsulot-${index}`}
                    data-qator={index}
                    type="button"
                    role="option"
                    aria-selected={index === faol}
                    tabIndex={-1}
                    // Sichqoncha bosilganda qidiruv maydoni fokusi yo'qolmasin (keyingi mahsulotni darrov yozish uchun).
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseMove={() => {
                      if (index !== faol) setFaol(index);
                    }}
                    onClick={() => qoshish(qator)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      index === faol ? "bg-gold-50" : "hover:bg-slate-50"
                    } ${mavjud ? "" : "opacity-60"}`}
                  >
                    <span
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-xs font-black text-gold-700"
                    >
                      {qisqartma(nom)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-slate-900">{nom}</span>
                      <span className="block truncate text-xs font-semibold text-slate-400">
                        {[barcode, omborlarSoni > 1 ? qator.warehouseName : ""].filter(Boolean).join(" · ") ||
                          t("posModal.noCode")}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-black tabular-nums text-slate-900">
                        {narx > 0 ? pulMatni(narx, "UZS", true) : "—"}
                      </span>
                      <span
                        className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-black ${
                          mavjud
                            ? kam
                              ? "bg-amber-50 text-amber-600"
                              : "bg-emerald-50 text-emerald-600"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {mavjud ? `${t("posModal.stock")}: ${qator.qoldiq}` : t("search.outOfStock")}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}

        {royxatKorinadi && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-bold text-slate-400">
            <span className="hidden sm:inline">{t("search.hint")}</span>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={yangilash}
              aria-label={t("posModal.refreshAria")}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-slate-500 transition hover:bg-white hover:text-slate-700"
            >
              <RefreshCw size={12} className={qidirilmoqda ? "animate-spin" : ""} />
              {t("posModal.refreshAria")}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
