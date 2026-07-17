import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import { useOmborStore } from "@/store/omborStore";
import type {
  KochirishHujjati,
  MahsulotModifikatsiyasi,
  NomliEntity,
  Ombor,
} from "@/types/ombor";
import {
  holat,
  hujjatRaqami,
  pul,
} from "./omborYordamchilari";
import KochirishKorishModal from "./KochirishKorishModal";
import KochirishYaratishModal from "./KochirishYaratishModal";

type UstunKaliti =
  | "nomi"
  | "status"
  | "yaratgan"
  | "yaratilgan"
  | "ombordan"
  | "omborga"
  | "ozgartirgan"
  | "ozgartirilgan"
  | "summa";

const USTUNLAR: Array<{ kalit: UstunKaliti; nom: string; kenglik: number }> = [
  { kalit: "nomi", nom: "Nomi", kenglik: 240 },
  { kalit: "status", nom: "Status", kenglik: 190 },
  { kalit: "yaratgan", nom: "Yaratgan mas'ul shaxs", kenglik: 230 },
  { kalit: "yaratilgan", nom: "Yaratilgan sana", kenglik: 195 },
  { kalit: "ombordan", nom: "Ombordan", kenglik: 220 },
  { kalit: "omborga", nom: "Omborga", kenglik: 220 },
  { kalit: "ozgartirgan", nom: "O'zgartirgan mas'ul", kenglik: 230 },
  { kalit: "ozgartirilgan", nom: "O'zgartirilgan sana", kenglik: 205 },
  { kalit: "summa", nom: "Summa", kenglik: 190 },
];

function boglanganId(qiymat: unknown) {
  if (typeof qiymat === "string") return qiymat;
  if (qiymat && typeof qiymat === "object" && "id" in qiymat) {
    return String((qiymat as { id?: unknown }).id ?? "");
  }
  return "";
}

function shaxsNomi(
  shaxs: NomliEntity | string | undefined,
  shaxsId: string | null | undefined,
  xodimMap: Map<string, NomliEntity>
) {
  const obyekt = typeof shaxs === "object" ? shaxs : undefined;
  const id = shaxsId || boglanganId(shaxs);
  const xodim = id ? xodimMap.get(id) : undefined;
  return (
    obyekt?.fullName ||
    obyekt?.name ||
    obyekt?.username ||
    xodim?.fullName ||
    xodim?.name ||
    xodim?.username ||
    "—"
  );
}

function omborNomi(
  ombor: Ombor | string | undefined,
  omborId: string | undefined,
  omborMap: Map<string, Ombor>
) {
  const obyekt = typeof ombor === "object" ? ombor : undefined;
  const id = omborId || boglanganId(ombor);
  return obyekt?.name || (id ? omborMap.get(id)?.name : undefined) || "Noma'lum ombor";
}

function hujjatNomi(hujjat: KochirishHujjati) {
  return `Ko'chirma hujjati #${hujjatRaqami(hujjat)}`;
}

function qisqaSana(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function hujjatSummasi(
  hujjat: KochirishHujjati,
  modifikatsiyaMap: Map<string, MahsulotModifikatsiyasi>
) {
  const hisoblangan = (hujjat.items ?? []).reduce((jami, item) => {
    const modifikatsiya = item.modification ?? modifikatsiyaMap.get(item.modificationId);
    const price = modifikatsiya?.price;
    const narx = Number(
      item.unitPrice ??
      item.price ??
      item.costPrice ??
      price?.retailPrice ??
      price?.costPrice ??
      price?.wholesalePrice ??
      0
    );
    return jami + Number(item.quantity || 0) * (Number.isFinite(narx) ? narx : 0);
  }, 0);
  const backendSummasi = Number(hujjat.totalAmount ?? hujjat.total ?? 0);
  if (hisoblangan !== 0) return hisoblangan;
  return Number.isFinite(backendSummasi) ? backendSummasi : 0;
}

function statusKlasi(status?: string) {
  switch (String(status ?? "DRAFT").toUpperCase()) {
    case "RECEIVED":
    case "CONFIRMED":
      return "bg-emerald-50 text-emerald-600";
    case "SENT":
      return "bg-sky-50 text-sky-600";
    case "CANCELLED":
    case "CANCELED":
      return "bg-red-50 text-red-500";
    default:
      return "bg-amber-50 text-amber-600";
  }
}

export default function Kochirish() {
  const store = useOmborStore();
  const jadvalRef = useRef<HTMLDivElement | null>(null);
  const scrollTrackRef = useRef<HTMLDivElement | null>(null);
  const sozlamalarRef = useRef<HTMLDivElement | null>(null);
  const sozlamalarTugmaRef = useRef<HTMLButtonElement | null>(null);
  const [modal, setModal] = useState(false);
  const [tanlanganId, setTanlanganId] = useState<string | null>(null);
  const [qidiruv, setQidiruv] = useState("");
  const [ustunlarMenyusi, setUstunlarMenyusi] = useState(false);
  const [sozlamalarJoylashuvi, setSozlamalarJoylashuvi] = useState({ top: 0, left: 0 });
  const [ustunKengliklari, setUstunKengliklari] = useState<Record<UstunKaliti, number>>(
    () => Object.fromEntries(USTUNLAR.map((ustun) => [ustun.kalit, ustun.kenglik])) as Record<UstunKaliti, number>
  );
  const [scrollHolati, setScrollHolati] = useState({
    chap: 0,
    kenglik: 100,
    mavjud: false,
    viewport: 0,
  });
  const [korinadiganUstunlar, setKorinadiganUstunlar] = useState<Record<UstunKaliti, boolean>>(
    () => Object.fromEntries(USTUNLAR.map((ustun) => [ustun.kalit, true])) as Record<UstunKaliti, boolean>
  );

  const kochirishMalumotlariniYuklash = store.kochirishMalumotlariniYuklash;

  const omborMap = useMemo(
    () => new Map(store.omborlar.map((ombor) => [String(ombor.id), ombor])),
    [store.omborlar]
  );
  const xodimMap = useMemo(
    () => new Map(store.xodimlar.map((xodim) => [String(xodim.id), xodim])),
    [store.xodimlar]
  );
  const modifikatsiyaMap = useMemo(
    () => new Map(store.modifikatsiyalar.map((item) => [String(item.id), item])),
    [store.modifikatsiyalar]
  );
  const yaratganNomi = useCallback(
    (hujjat: KochirishHujjati) =>
      shaxsNomi(
        hujjat.createdBy ?? hujjat.responsible,
        hujjat.createdById ?? hujjat.responsibleId,
        xodimMap
      ),
    [xodimMap]
  );
  const ozgartirganNomi = useCallback(
    (hujjat: KochirishHujjati) =>
      shaxsNomi(
        hujjat.updatedBy ?? hujjat.createdBy ?? hujjat.responsible,
        hujjat.updatedById ?? hujjat.createdById ?? hujjat.responsibleId,
        xodimMap
      ),
    [xodimMap]
  );
  const manbaOmborNomi = useCallback(
    (hujjat: KochirishHujjati) =>
      omborNomi(hujjat.sourceWarehouse, hujjat.sourceWarehouseId, omborMap),
    [omborMap]
  );
  const qabulOmborNomi = useCallback(
    (hujjat: KochirishHujjati) =>
      omborNomi(hujjat.destWarehouse, hujjat.destWarehouseId, omborMap),
    [omborMap]
  );

  useEffect(() => {
    void kochirishMalumotlariniYuklash();
  }, [kochirishMalumotlariniYuklash]);

  const sozlamalarJoylashuviniYangilash = useCallback(() => {
    const rect = sozlamalarTugmaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menyuKengligi = 288;
    const menyuBalandligi = 390;
    const left = Math.min(
      window.innerWidth - menyuKengligi - 12,
      Math.max(12, rect.right - menyuKengligi)
    );
    const pastgaTop = rect.bottom + 10;
    const top =
      pastgaTop + menyuBalandligi <= window.innerHeight - 12
        ? pastgaTop
        : Math.max(12, rect.top - menyuBalandligi - 10);
    setSozlamalarJoylashuvi({ top, left });
  }, []);

  useEffect(() => {
    if (!ustunlarMenyusi) return;
    function tashqarigaBosish(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !sozlamalarRef.current?.contains(target) &&
        !sozlamalarTugmaRef.current?.contains(target)
      ) {
        setUstunlarMenyusi(false);
      }
    }
    sozlamalarJoylashuviniYangilash();
    document.addEventListener("mousedown", tashqarigaBosish);
    window.addEventListener("resize", sozlamalarJoylashuviniYangilash);
    window.addEventListener("scroll", sozlamalarJoylashuviniYangilash, true);
    return () => {
      document.removeEventListener("mousedown", tashqarigaBosish);
      window.removeEventListener("resize", sozlamalarJoylashuviniYangilash);
      window.removeEventListener("scroll", sozlamalarJoylashuviniYangilash, true);
    };
  }, [sozlamalarJoylashuviniYangilash, ustunlarMenyusi]);

  const filtrlangan = useMemo(() => {
    const qiymat = qidiruv.trim().toLocaleLowerCase("uz");
    if (!qiymat) return store.kochirishlar;
    return store.kochirishlar.filter((hujjat) =>
      [
        hujjatNomi(hujjat),
        holat(hujjat.status),
        yaratganNomi(hujjat),
        ozgartirganNomi(hujjat),
        manbaOmborNomi(hujjat),
        qabulOmborNomi(hujjat),
        hujjat.createdAt,
        hujjat.updatedAt,
        hujjatSummasi(hujjat, modifikatsiyaMap),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("uz")
        .includes(qiymat)
    );
  }, [manbaOmborNomi, modifikatsiyaMap, ozgartirganNomi, qabulOmborNomi, qidiruv, store.kochirishlar, yaratganNomi]);

  const korinadiganUstunlarRoyxati = USTUNLAR.filter(
    (ustun) => korinadiganUstunlar[ustun.kalit]
  );
  const jadvalKengligi = korinadiganUstunlarRoyxati.reduce(
    (jami, ustun) => jami + ustunKengliklari[ustun.kalit],
    80
  );

  const scrollHolatiniYangilash = useCallback(() => {
    const element = jadvalRef.current;
    if (!element) return;
    const maksimalScroll = Math.max(0, element.scrollWidth - element.clientWidth);
    const kenglik = element.scrollWidth > 0
      ? Math.max(8, Math.min(100, (element.clientWidth / element.scrollWidth) * 100))
      : 100;
    const maksimalChap = 100 - kenglik;
    const chap = maksimalScroll > 0 ? (element.scrollLeft / maksimalScroll) * maksimalChap : 0;
    setScrollHolati({
      chap,
      kenglik,
      mavjud: maksimalScroll > 1,
      viewport: element.clientWidth,
    });
  }, []);

  useEffect(() => {
    scrollHolatiniYangilash();
    window.addEventListener("resize", scrollHolatiniYangilash);
    return () => window.removeEventListener("resize", scrollHolatiniYangilash);
  }, [scrollHolatiniYangilash, ustunKengliklari, korinadiganUstunlar]);

  function jadvalniSurish(yonalish: -1 | 1) {
    jadvalRef.current?.scrollBy({ left: yonalish * 520, behavior: "smooth" });
  }

  function ustunOlchaminiOzgartirish(
    kalit: UstunKaliti,
    event: ReactMouseEvent<HTMLSpanElement>
  ) {
    event.preventDefault();
    event.stopPropagation();
    const boshlangichX = event.clientX;
    const boshlangichKenglik = ustunKengliklari[kalit];
    const oldingiCursor = document.body.style.cursor;
    const oldingiTanlash = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function surish(moveEvent: MouseEvent) {
      const yangiKenglik = Math.min(480, Math.max(120, boshlangichKenglik + moveEvent.clientX - boshlangichX));
      setUstunKengliklari((oldingi) => ({ ...oldingi, [kalit]: yangiKenglik }));
    }

    function tugatish() {
      document.body.style.cursor = oldingiCursor;
      document.body.style.userSelect = oldingiTanlash;
      window.removeEventListener("mousemove", surish);
      window.removeEventListener("mouseup", tugatish);
    }

    window.addEventListener("mousemove", surish);
    window.addEventListener("mouseup", tugatish);
  }

  function scrollThumbniSurish(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const track = scrollTrackRef.current;
    const jadval = jadvalRef.current;
    if (!track || !jadval || !scrollHolati.mavjud) return;
    const jadvalElement = jadval;
    const trackRect = track.getBoundingClientRect();
    const thumbKengligi = (scrollHolati.kenglik / 100) * trackRect.width;
    const thumbChap = (scrollHolati.chap / 100) * trackRect.width;
    const bosilganJoy = event.clientX - trackRect.left - thumbChap;
    const oldingiCursor = document.body.style.cursor;
    const oldingiTanlash = document.body.style.userSelect;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    function surish(moveEvent: MouseEvent) {
      const maksimalChap = Math.max(0, trackRect.width - thumbKengligi);
      const yangiChap = Math.min(maksimalChap, Math.max(0, moveEvent.clientX - trackRect.left - bosilganJoy));
      const nisbat = maksimalChap > 0 ? yangiChap / maksimalChap : 0;
      jadvalElement.scrollLeft =
        nisbat * Math.max(0, jadvalElement.scrollWidth - jadvalElement.clientWidth);
    }

    function tugatish() {
      document.body.style.cursor = oldingiCursor;
      document.body.style.userSelect = oldingiTanlash;
      window.removeEventListener("mousemove", surish);
      window.removeEventListener("mouseup", tugatish);
    }

    window.addEventListener("mousemove", surish);
    window.addEventListener("mouseup", tugatish);
  }

  function scrollTrekkaBosish(event: ReactMouseEvent<HTMLDivElement>) {
    const track = scrollTrackRef.current;
    const jadval = jadvalRef.current;
    if (!track || !jadval || !scrollHolati.mavjud) return;
    const rect = track.getBoundingClientRect();
    const thumbKengligi = (scrollHolati.kenglik / 100) * rect.width;
    const maksimalChap = Math.max(0, rect.width - thumbKengligi);
    const yangiChap = Math.min(maksimalChap, Math.max(0, event.clientX - rect.left - thumbKengligi / 2));
    const nisbat = maksimalChap > 0 ? yangiChap / maksimalChap : 0;
    jadval.scrollTo({
      left: nisbat * Math.max(0, jadval.scrollWidth - jadval.clientWidth),
      behavior: "smooth",
    });
  }

  function hujayra(hujjat: KochirishHujjati, kalit: UstunKaliti) {
    switch (kalit) {
      case "nomi":
        return <span className="font-black text-slate-900">{hujjatNomi(hujjat)}</span>;
      case "status":
        return (
          <span className={`inline-flex rounded-full px-4 py-1.5 text-sm font-black ${statusKlasi(hujjat.status)}`}>
            {holat(hujjat.status)}
          </span>
        );
      case "yaratgan":
        return yaratganNomi(hujjat);
      case "yaratilgan":
        return qisqaSana(hujjat.createdAt);
      case "ombordan":
        return manbaOmborNomi(hujjat);
      case "omborga":
        return qabulOmborNomi(hujjat);
      case "ozgartirgan":
        return ozgartirganNomi(hujjat);
      case "ozgartirilgan":
        return qisqaSana(hujjat.updatedAt ?? hujjat.createdAt);
      case "summa":
        return <span className="font-black text-slate-700">{pul(hujjatSummasi(hujjat, modifikatsiyaMap))}</span>;
    }
  }

  return (
    <div className="min-h-[calc(100vh-245px)] space-y-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[38px] font-black leading-none tracking-tight text-slate-950">Ko'chirma</h1>
          <p className="mt-2 text-lg text-slate-500">Omborlar orasida tovar ko'chirish hujjatlari.</p>
        </div>
        <button
          type="button"
          onClick={() => setModal(true)}
          className="inline-flex h-14 items-center justify-center gap-2 self-start rounded-[22px] bg-[#FF5A00] px-6 text-base font-black text-white shadow-[0_12px_28px_rgba(255,90,0,.22)] transition hover:-translate-y-0.5 hover:bg-orange-600"
        >
          <Plus size={20} /> Yaratish
        </button>
      </header>

      <label className="flex h-14 w-full max-w-[480px] items-center gap-3 rounded-[22px] border border-slate-200 bg-white px-5 shadow-sm transition focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100">
        <Search size={21} className="shrink-0 text-slate-400" />
        <input
          value={qidiruv}
          onChange={(event) => setQidiruv(event.target.value)}
          placeholder="Nomi, mas'ul shaxs, ombor, sana yoki holati bo'yicha"
          className="min-w-0 flex-1 bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400"
        />
        {qidiruv && (
          <button type="button" onClick={() => setQidiruv("")} aria-label="Qidiruvni tozalash">
            <X size={17} className="text-slate-400" />
          </button>
        )}
      </label>

      {store.xatolik && (
        <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-600">
          <span>{store.xatolik}</span>
          <button type="button" onClick={store.xatolikniTozalash}>Yopish</button>
        </div>
      )}

      <section className="overflow-hidden rounded-[30px] border border-orange-100 bg-white shadow-sm">
        <div
          ref={jadvalRef}
          onScroll={scrollHolatiniYangilash}
          className="scrollbar-hidden overflow-x-auto"
        >
          <table
            className="border-collapse text-left"
            style={{ tableLayout: "fixed", width: jadvalKengligi, minWidth: "100%" }}
          >
            <colgroup>
              {korinadiganUstunlarRoyxati.map((ustun) => (
                <col key={ustun.kalit} style={{ width: ustunKengliklari[ustun.kalit] }} />
              ))}
              <col style={{ width: 80 }} />
            </colgroup>
            <thead className="bg-[#FFF9F3] text-[13px] font-black uppercase text-[#FF5A00]">
              <tr>
                {korinadiganUstunlarRoyxati.map((ustun) => (
                  <th key={ustun.kalit} className="relative h-[74px] overflow-visible px-7 py-4">
                    <span className="block max-w-[190px] truncate">{ustun.nom}</span>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`${ustun.nom} ustuni kengligini o'zgartirish`}
                      onMouseDown={(event) => ustunOlchaminiOzgartirish(ustun.kalit, event)}
                      className="group/resize absolute -right-1.5 top-0 z-20 flex h-full w-3 cursor-col-resize select-none items-center justify-center"
                    >
                      <span className="h-6 w-px bg-orange-200 transition-all group-hover/resize:h-full group-hover/resize:w-0.5 group-hover/resize:bg-[#FF5A00]" />
                    </span>
                  </th>
                ))}
                <th className="sticky right-0 z-10 w-20 min-w-20 bg-[#FFF9F3] px-5 py-4 text-right">
                  <div className="relative inline-block">
                    <button
                      ref={sozlamalarTugmaRef}
                      type="button"
                      onClick={() => {
                        if (!ustunlarMenyusi) sozlamalarJoylashuviniYangilash();
                        setUstunlarMenyusi((oldingi) => !oldingi);
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#FF5A00] hover:bg-orange-100"
                      aria-label="Ustunlarni sozlash"
                      aria-expanded={ustunlarMenyusi}
                    >
                      <Settings size={19} />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100 text-base text-slate-600">
              {store.yuklanmoqda ? (
                <tr>
                  <td colSpan={korinadiganUstunlarRoyxati.length + 1} className="h-40 p-0">
                    <div
                      className="sticky left-0 flex h-40 items-center justify-center"
                      style={{ width: scrollHolati.viewport || "100%" }}
                    >
                      <LoaderCircle className="animate-spin text-orange-500" size={30} />
                    </div>
                  </td>
                </tr>
              ) : (
                filtrlangan.map((hujjat) => (
                  <tr
                    key={hujjat.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => setTanlanganId(hujjat.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setTanlanganId(hujjat.id);
                      }
                    }}
                    className="group cursor-pointer transition hover:bg-orange-50/35 focus-visible:bg-orange-50 focus-visible:outline-none"
                  >
                    {korinadiganUstunlarRoyxati.map((ustun) => (
                      <td key={ustun.kalit} className="overflow-hidden whitespace-nowrap px-6 py-5">
                        <div className="truncate">{hujayra(hujjat, ustun.kalit)}</div>
                      </td>
                    ))}
                    <td className="sticky right-0 bg-white px-5 py-3 text-right group-hover:bg-[#FFFBF7]">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setTanlanganId(hujjat.id);
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#FF5A00] transition hover:bg-[#FF5A00] hover:text-white"
                        aria-label={`${hujjatNomi(hujjat)}ni ko'rish`}
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
              {!store.yuklanmoqda && filtrlangan.length === 0 && (
                <tr>
                  <td colSpan={korinadiganUstunlarRoyxati.length + 1} className="h-40 p-0">
                    <div
                      className="sticky left-0 flex h-40 items-center justify-center px-6 text-center font-semibold text-slate-400"
                      style={{ width: scrollHolati.viewport || "100%" }}
                    >
                      {qidiruv ? "Qidiruv bo'yicha ko'chirma topilmadi" : "Ko'chirma hujjatlari mavjud emas"}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex h-[70px] items-center gap-4 border-t border-orange-100 px-5">
          <button type="button" onClick={() => jadvalniSurish(-1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-orange-100 bg-white text-[#FF5A00] shadow-sm hover:bg-orange-50" aria-label="Chapga surish">
            <ChevronLeft size={20} />
          </button>
          <div
            ref={scrollTrackRef}
            onMouseDown={scrollTrekkaBosish}
            className={`relative h-3 flex-1 rounded-full bg-orange-50 ${scrollHolati.mavjud ? "cursor-pointer" : "opacity-55"}`}
            aria-label="Jadval gorizontal scrolli"
          >
            <div
              onMouseDown={scrollThumbniSurish}
              className={`absolute inset-y-0 rounded-full bg-[#FF5A00] transition-[background-color] hover:bg-orange-600 ${scrollHolati.mavjud ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
              style={{
                left: `${scrollHolati.chap}%`,
                width: `${scrollHolati.kenglik}%`,
              }}
            />
          </div>
          <button type="button" onClick={() => jadvalniSurish(1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-orange-100 bg-white text-[#FF5A00] shadow-sm hover:bg-orange-50" aria-label="O'ngga surish">
            <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {ustunlarMenyusi &&
        createPortal(
          <div
            ref={sozlamalarRef}
            role="menu"
            className="fixed z-[99990] w-72 overflow-hidden rounded-[22px] border border-orange-100 bg-white p-3 text-left shadow-[0_22px_70px_rgba(15,23,42,.22)]"
            style={{ top: sozlamalarJoylashuvi.top, left: sozlamalarJoylashuvi.left }}
          >
            <p className="px-2 pb-2 text-xs font-black uppercase text-slate-400">Ustunlar</p>
            <div className="scrollbar-orange max-h-[330px] overflow-y-auto pr-1">
              {USTUNLAR.map((ustun) => (
                <label
                  key={ustun.kalit}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-bold text-slate-600 hover:bg-orange-50"
                >
                  <input
                    type="checkbox"
                    checked={korinadiganUstunlar[ustun.kalit]}
                    onChange={() =>
                      setKorinadiganUstunlar((oldingi) => ({
                        ...oldingi,
                        [ustun.kalit]: !oldingi[ustun.kalit],
                      }))
                    }
                    className="h-4 w-4 accent-orange-500"
                  />
                  {ustun.nom}
                </label>
              ))}
            </div>
          </div>,
          document.body
        )}

      {modal && <KochirishYaratishModal onClose={() => setModal(false)} />}

      {tanlanganId && (
        <KochirishKorishModal id={tanlanganId} onClose={() => setTanlanganId(null)} />
      )}
    </div>
  );
}
