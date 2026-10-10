import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, LoaderCircle, RefreshCw, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { pulMatni } from "@/lib/valyuta";
import {
  katalogModifikatsiyalariniQoldiqTanlovigaOlish,
  omborlarRoyxatiniOlish,
  omborQoldiqlariniOlish,
  qoldiqNomlariniBoyitish,
} from "@/api/savdoApi";
import { usePosStore } from "@/store/posStore";
import type { QoldiqTanlovi } from "@/types/savdo";
import {
  mahsulotNomi,
  qoldiqBirlashtirish,
  qoldiqMiqdori,
  qoldiqNarxi,
  savatNomi,
  tanlovKaliti,
} from "./posMahsulotlari";

// Bosh sahifa (POS) headeridagi tezkor qidiruv: mahsulot nomi, shtrix-kod yoki artikul bo'yicha qidiriladi,
// ↑/↓ bilan tanlanadi, Enter (yoki skaner: kod + Enter) mahsulotni savatchaga qo'shadi.
// Ma'lumot MahsulotTanlashModal bilan bir xil manbadan olinadi: omborlar, har ombor qoldig'i va katalog narxlari.

type Qator = {
  kalit: string;
  item: QoldiqTanlovi;
  warehouseId: string;
  warehouseName: string;
  qoldiq: number;
};

type Malumot = { qatorlar: Qator[]; omborlarSoni: number };

const KESH_MUDDATI = 60_000;
const KO_RSATILADIGAN_SONI = 50;
let kesh: { vaqt: number; malumot: Malumot } | null = null;
let yuklanayotgan: Promise<Malumot> | null = null;

function omborNomi(ombor: { fullName?: string; name?: string; id: string }) {
  return ombor.fullName || ombor.name || ombor.id;
}

async function malumotlarniOlish(majbur = false): Promise<Malumot> {
  if (!majbur && kesh && Date.now() - kesh.vaqt < KESH_MUDDATI) return kesh.malumot;
  if (yuklanayotgan) return yuklanayotgan;

  yuklanayotgan = (async () => {
    try {
      const omborlar = await omborlarRoyxatiniOlish();
      const [katalogNatija, ...qoldiqNatijalari] = await Promise.allSettled([
        katalogModifikatsiyalariniQoldiqTanlovigaOlish(),
        ...omborlar.map((ombor) => omborQoldiqlariniOlish(String(ombor.id))),
      ]);
      if (katalogNatija.status === "rejected" && qoldiqNatijalari.every((natija) => natija.status === "rejected")) {
        throw new Error("search-load-failed");
      }
      const katalog = katalogNatija.status === "fulfilled" ? katalogNatija.value : [];

      const qatorlar: Qator[] = [];
      omborlar.forEach((ombor, index) => {
        const natija = qoldiqNatijalari[index];
        if (!natija || natija.status !== "fulfilled") return;
        const omborId = String(ombor.id);
        const qoldiqlar = natija.value.filter((item) => {
          const itemOmborId = item.warehouseId ?? item.warehouse?.id;
          return !itemOmborId || String(itemOmborId) === omborId;
        });
        qoldiqBirlashtirish(qoldiqlar, katalog)
          .filter((item) => qoldiqMiqdori(item) > 0)
          .forEach((item) =>
            qatorlar.push({
              kalit: tanlovKaliti(item.modificationId, omborId),
              item,
              warehouseId: omborId,
              warehouseName: omborNomi(ombor),
              qoldiq: qoldiqMiqdori(item),
            })
          );
      });

      // Nomi yoki narxi hali topilmagan mahsulotlar katalogdan to'ldiriladi (MahsulotTanlashModal bilan bir xil).
      const toldirish = qatorlar.filter((qator) => !mahsulotNomi(qator.item) || !qoldiqNarxi(qator.item, "chakana"));
      if (toldirish.length) {
        try {
          const boyitilgan = await qoldiqNomlariniBoyitish(toldirish.map((qator) => qator.item));
          const xarita = new Map(boyitilgan.map((item) => [item.modificationId, item]));
          qatorlar.forEach((qator) => {
            const yangi = xarita.get(qator.item.modificationId);
            if (yangi) qator.item = qoldiqBirlashtirish([qator.item], [yangi])[0] ?? qator.item;
          });
        } catch {
          // to'ldirib bo'lmasa, mavjud ma'lumot bilan davom etiladi
        }
      }

      // Hech bir omborda qoldig'i yo'q katalog mahsulotlari ham topiladi (qizil "Qoldiq yo'q" belgisi bilan).
      const qoldiqliIdlar = new Set(qatorlar.map((qator) => qator.item.modificationId));
      katalog.forEach((item) => {
        if (!item.modificationId || qoldiqliIdlar.has(item.modificationId)) return;
        qatorlar.push({ kalit: tanlovKaliti(item.modificationId, ""), item, warehouseId: "", warehouseName: "", qoldiq: 0 });
      });

      const malumot = { qatorlar, omborlarSoni: omborlar.length };
      kesh = { vaqt: Date.now(), malumot };
      return malumot;
    } finally {
      yuklanayotgan = null;
    }
  })();
  return yuklanayotgan;
}

function kichik(qiymat?: string | null) {
  return (qiymat ?? "").trim().toLowerCase();
}

// Backend qidiruvi bilan bir xil tartib: avval shtrix-kod/artikul to'liq mos, keyin nomi to'liq mos, keyin qolganlari.
// Bir xil darajada qoldig'i borlar, so'ng nom bo'yicha alifbo tartibida.
function qidirish(qatorlar: Qator[], soz: string) {
  const q = kichik(soz);
  if (!q) return [];
  return qatorlar
    .filter((qator) =>
      [savatNomi(qator.item), qator.item.modification?.barcode, qator.item.modification?.article]
        .join(" ")
        .toLowerCase()
        .includes(q)
    )
    .map((qator) => {
      const mod = qator.item.modification;
      const kodAniq = kichik(mod?.barcode) === q || kichik(mod?.article) === q;
      const nomAniq = [savatNomi(qator.item), mahsulotNomi(qator.item), mod?.name].some((nom) => kichik(nom) === q);
      return { qator, daraja: kodAniq ? 0 : nomAniq ? 1 : 2, nom: savatNomi(qator.item) };
    })
    .sort(
      (a, b) =>
        a.daraja - b.daraja ||
        Number(b.qator.qoldiq > 0) - Number(a.qator.qoldiq > 0) ||
        a.nom.localeCompare(b.nom, "uz") ||
        b.qator.qoldiq - a.qator.qoldiq
    )
    .slice(0, KO_RSATILADIGAN_SONI)
    .map((item) => ({ ...item.qator, daraja: item.daraja }));
}

function qisqartma(nom: string) {
  const sozlar = nom.split(/\s+/).filter(Boolean);
  return (sozlar.length > 1 ? sozlar[0][0] + sozlar[1][0] : nom.slice(0, 2)).toUpperCase();
}

type Props = {
  // Tashqi o'ram (qidiruv "tabletka"si) sinflari — header joylashuviga moslanadi.
  className: string;
};

export default function HeaderMahsulotQidiruvi({ className }: Props) {
  const { t } = useTranslation("topbar");
  const narxTuri = usePosStore((state) => state.narxTuri);
  const [soz, setSoz] = useState("");
  const [ochiq, setOchiq] = useState(false);
  const [malumot, setMalumot] = useState<Malumot | null>(() => kesh?.malumot ?? null);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState(false);
  const [faol, setFaol] = useState(-1);
  const [xabar, setXabar] = useState<{ xato: boolean; matn: string } | null>(null);
  const [joy, setJoy] = useState({ top: 0, left: 0, width: 0 });
  // Ma'lumot yuklanishi tugamasdan Enter bosilsa (masalan, skaner), yuklangach aniq mos kelgan mahsulot qo'shiladi.
  const [kutilmoqda, setKutilmoqda] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const oramRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const xabarTaymeri = useRef<number | null>(null);

  const natijalar = useMemo(() => qidirish(malumot?.qatorlar ?? [], soz), [malumot, soz]);
  const panelKorinadi = ochiq && (Boolean(soz.trim()) || Boolean(xabar));

  const yukla = useCallback(async (majbur = false) => {
    setXato(false);
    setYuklanmoqda(true);
    try {
      setMalumot(await malumotlarniOlish(majbur));
    } catch {
      setXato(true);
    } finally {
      setYuklanmoqda(false);
    }
  }, []);

  const joyniYangilash = useCallback(() => {
    const rect = oramRef.current?.getBoundingClientRect();
    if (!rect) return;
    const chekka = 12;
    const kenglik = Math.min(Math.max(rect.width, 460), window.innerWidth - chekka * 2);
    setJoy({
      top: rect.bottom + 8,
      left: Math.min(Math.max(chekka, rect.left), window.innerWidth - kenglik - chekka),
      width: kenglik,
    });
  }, []);

  useEffect(() => {
    if (!panelKorinadi) return;
    joyniYangilash();
    window.addEventListener("resize", joyniYangilash);
    window.addEventListener("scroll", joyniYangilash, true);
    return () => {
      window.removeEventListener("resize", joyniYangilash);
      window.removeEventListener("scroll", joyniYangilash, true);
    };
  }, [panelKorinadi, joyniYangilash]);

  useEffect(() => {
    if (!ochiq) return;
    function tashqarigaBosish(event: MouseEvent) {
      const nishon = event.target as Node;
      if (!oramRef.current?.contains(nishon) && !panelRef.current?.contains(nishon)) setOchiq(false);
    }
    document.addEventListener("mousedown", tashqarigaBosish);
    return () => document.removeEventListener("mousedown", tashqarigaBosish);
  }, [ochiq]);

  useEffect(
    () => () => {
      if (xabarTaymeri.current) window.clearTimeout(xabarTaymeri.current);
    },
    []
  );

  function xabarBerish(xatoMi: boolean, matn: string) {
    setXabar({ xato: xatoMi, matn });
    // Xatoda kod belgilanadi: keyingi skan (yoki yozuv) uni almashtiradi, eski kodga qo'shilib ketmaydi.
    if (xatoMi) inputRef.current?.select();
    if (xabarTaymeri.current) window.clearTimeout(xabarTaymeri.current);
    xabarTaymeri.current = window.setTimeout(() => setXabar(null), 3500);
  }

  function qoshish(qator: Qator) {
    const nom = savatNomi(qator.item) || t("posModal.unnamed");
    if (qator.qoldiq <= 0) {
      xabarBerish(true, t("search.outOfStockMessage", { name: nom }));
      return;
    }
    const narx = qoldiqNarxi(qator.item, narxTuri);
    if (narx <= 0) {
      xabarBerish(true, `${nom}: ${t("posModal.errors.noPrice")}`);
      return;
    }
    const holat = usePosStore.getState();
    const savatdagi = holat.cart.find((item) => item.id === qator.kalit)?.soni ?? 0;
    if (savatdagi >= qator.qoldiq) {
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
        qoldiq: qator.qoldiq,
        warehouseId: qator.warehouseId,
        warehouseName: qator.warehouseName,
      },
      1
    );
    xabarBerish(false, t("search.added", { name: nom, qty: savatdagi + 1 }));
    // Keyingi mahsulot (yoki keyingi skan) uchun maydon tozalanadi va fokus qoladi.
    setSoz("");
    setFaol(-1);
    inputRef.current?.focus();
  }

  // Yuklanish tugaganda kutib turgan Enter (skaner) bajariladi: faqat shtrix-kod/artikul aniq mos kelsa.
  useEffect(() => {
    if (!kutilmoqda || yuklanmoqda || !malumot) return;
    setKutilmoqda(false);
    const birinchi = natijalar[0];
    if (birinchi && birinchi.daraja === 0) qoshish(birinchi);
    else if (soz.trim()) xabarBerish(true, t("search.notExact"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kutilmoqda, yuklanmoqda, malumot]);

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
      if (!soz.trim()) return;
      if (yuklanmoqda || !malumot) {
        setKutilmoqda(true);
        setOchiq(true);
        return;
      }
      const tanlangan = natijalar[faol];
      if (tanlangan) qoshish(tanlangan);
      else if (natijalar.length === 0) xabarBerish(true, t("search.empty"));
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

  return (
    <div ref={oramRef} className={className}>
      <Search size={18} className="mr-3 shrink-0 text-white/60" aria-hidden />
      <input
        ref={inputRef}
        value={soz}
        onChange={(event) => {
          setSoz(event.target.value);
          setFaol(event.target.value.trim() ? 0 : -1);
          setOchiq(true);
          if (!malumot && !yuklanmoqda) void yukla();
        }}
        onFocus={() => {
          setOchiq(true);
          // Qoldiq o'zgargan bo'lishi mumkin: kesh eskirgan bo'lsa fonda yangilanadi.
          if (!yuklanmoqda) void yukla();
        }}
        onKeyDown={klavish}
        placeholder={t("posModal.searchPlaceholder")}
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

      {panelKorinadi &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: joy.top, left: joy.left, width: joy.width }}
            className="z-[120] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,.28)]"
          >
            {xabar && (
              <p
                role="status"
                className={`flex items-start gap-2 px-4 py-2.5 text-xs font-bold ${
                  xabar.xato ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {xabar.xato ? <AlertTriangle size={14} className="mt-px shrink-0" /> : <Check size={14} className="mt-px shrink-0" />}
                <span className="min-w-0 break-words">{xabar.matn}</span>
              </p>
            )}

            {soz.trim() && (
              <div id="header-mahsulot-royxati" role="listbox" className="max-h-[min(420px,60vh)] overflow-y-auto p-1.5">
                {yuklanmoqda && !malumot ? (
                  <p className="flex items-center gap-2 px-3 py-4 text-sm font-semibold text-slate-400">
                    <LoaderCircle size={16} className="animate-spin text-gold-500" />
                    {t("search.loading")}
                  </p>
                ) : xato && !malumot ? (
                  <div className="flex items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-red-500">
                    <span>{t("search.loadFailed")}</span>
                    <button
                      type="button"
                      onClick={() => void yukla(true)}
                      className="shrink-0 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-black text-red-600 hover:bg-red-100"
                    >
                      {t("search.retry")}
                    </button>
                  </div>
                ) : natijalar.length === 0 ? (
                  <p className="px-3 py-4 text-sm font-semibold text-slate-400">{t("search.empty")}</p>
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
                            {[barcode, malumot && malumot.omborlarSoni > 1 ? qator.warehouseName : ""].filter(Boolean).join(" · ") ||
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

            {soz.trim() && (
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-bold text-slate-400">
                <span className="hidden sm:inline">{t("search.hint")}</span>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void yukla(true)}
                  aria-label={t("posModal.refreshAria")}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-slate-500 transition hover:bg-white hover:text-slate-700"
                >
                  <RefreshCw size={12} className={yuklanmoqda ? "animate-spin" : ""} />
                  {t("posModal.refreshAria")}
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
