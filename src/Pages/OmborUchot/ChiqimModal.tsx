import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  Barcode,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  GripVertical,
  History,
  ImageIcon,
  Link,
  MessageSquare,
  Plus,
  Printer,
  Settings,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import SavdoSelect from "@/Pages/Savdo/SavdoSelect";
import { mockMasulShaxslar, mockMijozlar } from "./mockData";
import QidiruvSelect from "./QidiruvSelect";
import type { ChiqimHujjat, ChiqimSatri, Mahsulot, OmborItem } from "./types";
import { chiqimJami, pul, qoldiqlarniHisoblash } from "./yordamchilar";

type Props = {
  mahsulotlar: Mahsulot[];
  omborlar: OmborItem[];
  boshlangich: ChiqimHujjat | null;
  keyingiNomi: string;
  onYopish: () => void;
  onSaqlash: (hujjat: ChiqimHujjat, tasdiqla: boolean) => void;
};

function bosSatr(mahsulot: Mahsulot, omborId: string): ChiqimSatri {
  return {
    id: crypto.randomUUID(),
    mahsulotId: mahsulot.id,
    shtrixKod: mahsulot.shtrixKod,
    omborId,
    soni: 1,
    tanNarx: mahsulot.tanNarx,
    sotuvNarx: mahsulot.sotuvNarx,
    ulgurjiNarx: mahsulot.ulgurjiNarx,
  };
}

function bosSatrBosh(omborId: string): ChiqimSatri {
  return {
    id: crypto.randomUUID(),
    mahsulotId: "",
    shtrixKod: "",
    omborId,
    soni: 1,
    tanNarx: 0,
    sotuvNarx: 0,
    ulgurjiNarx: 0,
  };
}

function FieldSettings() {
  return <Settings size={15} className="shrink-0 text-slate-300" />;
}

type ChiqimFayl = { id: string; nomi: string; sana: string };
type ChiqimKomment = { id: string; matn: string; muallif: string; vaqt: string };
type TarixYozuvi = { id: string; matn: string; vaqt: string };

function hozirgiVaqt() {
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

type UstunKaliti =
  | "shtrixKod"
  | "tanNarx"
  | "sotuvNarx"
  | "ulgurjiNarx"
  | "soni"
  | "ombor"
  | "qoldiq"
  | "summa";

const USTUN_SOZLAMALARI: { kalit: UstunKaliti; nom: string; kenglik: number }[] = [
  { kalit: "shtrixKod", nom: "Shtrix kod", kenglik: 160 },
  { kalit: "tanNarx", nom: "Tan narhi", kenglik: 130 },
  { kalit: "sotuvNarx", nom: "Sotuv narhi", kenglik: 130 },
  { kalit: "ulgurjiNarx", nom: "Ulgurji narhi", kenglik: 130 },
  { kalit: "soni", nom: "Soni", kenglik: 110 },
  { kalit: "ombor", nom: "Ombor", kenglik: 200 },
  { kalit: "qoldiq", nom: "Qoldiq", kenglik: 140 },
  { kalit: "summa", nom: "Summa", kenglik: 150 },
];

export default function ChiqimModal({
  mahsulotlar,
  omborlar,
  boshlangich,
  keyingiNomi,
  onYopish,
  onSaqlash,
}: Props) {
  const [nomi, setNomi] = useState(boshlangich?.nomi ?? keyingiNomi);
  const [mijoz, setMijoz] = useState(boshlangich?.mijoz ?? "");
  const [sanaQiymati, setSanaQiymati] = useState(boshlangich?.sana ?? new Date().toISOString().slice(0, 10));
  const [masulShaxs, setMasulShaxs] = useState(boshlangich?.masulShaxs ?? "");
  const [satrlar, setSatrlar] = useState<ChiqimSatri[]>(
    boshlangich?.satrlar ?? [bosSatrBosh(omborlar[0]?.id ?? "")]
  );
  const [fayllar, setFayllar] = useState<ChiqimFayl[]>([]);
  const [kommentMatni, setKommentMatni] = useState("");
  const [kommentlar, setKommentlar] = useState<ChiqimKomment[]>([]);
  const [tarix, setTarix] = useState<TarixYozuvi[]>([
    {
      id: crypto.randomUUID(),
      matn: boshlangich ? "Hujjat tahrirlash uchun ochildi" : "Yangi hujjat qoralamasi ochildi",
      vaqt: hozirgiVaqt(),
    },
  ]);

  const [ustunKengliklari, setUstunKengliklari] = useState<Record<string, number>>(() => ({
    mahsulot: 320,
    ...Object.fromEntries(USTUN_SOZLAMALARI.map((ustun) => [ustun.kalit, ustun.kenglik])),
  }));
  const [korinadiganUstunlar, setKorinadiganUstunlar] = useState<Record<UstunKaliti, boolean>>(
    () =>
      Object.fromEntries(USTUN_SOZLAMALARI.map((ustun) => [ustun.kalit, true])) as Record<
        UstunKaliti,
        boolean
      >
  );
  const [ustunlarMenyusiOchiq, setUstunlarMenyusiOchiq] = useState(false);
  const ustunlarMenyusiRef = useRef<HTMLDivElement | null>(null);

  const [tanlanganSatrlar, setTanlanganSatrlar] = useState<Set<string>>(new Set());
  const [amalTuri, setAmalTuri] = useState("");
  const [hammasiUchun, setHammasiUchun] = useState(false);
  const [sudralayotganSatrId, setSudralayotganSatrId] = useState<string | null>(null);

  const [qoshimchaMahsulotlar, setQoshimchaMahsulotlar] = useState<Mahsulot[]>([]);
  const [mahsulotYaratishOchiq, setMahsulotYaratishOchiq] = useState(false);
  const [yangiMahsulotNomi, setYangiMahsulotNomi] = useState("");
  const [yangiMahsulotShtrixKod, setYangiMahsulotShtrixKod] = useState("");
  const [yangiMahsulotBirlik, setYangiMahsulotBirlik] = useState("dona");
  const [yangiMahsulotTanNarx, setYangiMahsulotTanNarx] = useState("");
  const [yangiMahsulotSotuvNarx, setYangiMahsulotSotuvNarx] = useState("");
  const [yangiMahsulotUlgurjiNarx, setYangiMahsulotUlgurjiNarx] = useState("");
  const mahsulotYaratishMenyusiRef = useRef<HTMLDivElement | null>(null);

  const jadvalScrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollHolati, setScrollHolati] = useState({ chapFoiz: 0, kengFoiz: 100, korinadimi: false });

  const birinchiOmbor = omborlar[0]?.id ?? "";
  const joriyQoldiqlar = useMemo(() => qoldiqlarniHisoblash(), []);
  const korinadiganUstunSozlamalari = USTUN_SOZLAMALARI.filter((ustun) => korinadiganUstunlar[ustun.kalit]);
  const barchaMahsulotlar = useMemo(
    () => [...mahsulotlar, ...qoshimchaMahsulotlar],
    [mahsulotlar, qoshimchaMahsulotlar]
  );

  useEffect(() => {
    if (!ustunlarMenyusiOchiq) return;
    function tashqigaBosish(event: globalThis.MouseEvent) {
      if (!ustunlarMenyusiRef.current?.contains(event.target as Node)) {
        setUstunlarMenyusiOchiq(false);
      }
    }
    document.addEventListener("mousedown", tashqigaBosish);
    return () => document.removeEventListener("mousedown", tashqigaBosish);
  }, [ustunlarMenyusiOchiq]);

  useEffect(() => {
    if (!mahsulotYaratishOchiq) return;
    function tashqigaBosish(event: globalThis.MouseEvent) {
      if (!mahsulotYaratishMenyusiRef.current?.contains(event.target as Node)) {
        setMahsulotYaratishOchiq(false);
      }
    }
    document.addEventListener("mousedown", tashqigaBosish);
    return () => document.removeEventListener("mousedown", tashqigaBosish);
  }, [mahsulotYaratishOchiq]);

  function satrTanlashniAlmashtirish(id: string) {
    setTanlanganSatrlar((old) => {
      const yangi = new Set(old);
      if (yangi.has(id)) yangi.delete(id);
      else yangi.add(id);
      return yangi;
    });
  }

  function hammasiniTanlash() {
    setTanlanganSatrlar((old) =>
      old.size === satrlar.length ? new Set() : new Set(satrlar.map((satr) => satr.id))
    );
  }

  function tanlanganlarniOchirish() {
    if (tanlanganSatrlar.size === 0) return;
    if (!window.confirm(`${tanlanganSatrlar.size} ta qatorni o'chirasizmi?`)) return;
    setSatrlar((old) => old.filter((satr) => !tanlanganSatrlar.has(satr.id)));
    setTanlanganSatrlar(new Set());
  }

  function satrSudrashBoshlandi(id: string) {
    setSudralayotganSatrId(id);
  }

  function satrUstigaOlibKelindi(event: ReactDragEvent, id: string) {
    event.preventDefault();
    if (!sudralayotganSatrId || sudralayotganSatrId === id) return;
    setSatrlar((old) => {
      const boshlanishIndex = old.findIndex((satr) => satr.id === sudralayotganSatrId);
      const maqsadIndex = old.findIndex((satr) => satr.id === id);
      if (boshlanishIndex === -1 || maqsadIndex === -1) return old;
      const yangi = [...old];
      const [kochirilgan] = yangi.splice(boshlanishIndex, 1);
      yangi.splice(maqsadIndex, 0, kochirilgan);
      return yangi;
    });
  }

  function satrSudrashTugadi() {
    setSudralayotganSatrId(null);
  }

  function mahsulotYaratish() {
    if (!yangiMahsulotNomi.trim()) return;
    const yangi: Mahsulot = {
      id: crypto.randomUUID(),
      nomi: yangiMahsulotNomi.trim(),
      birlik: yangiMahsulotBirlik.trim() || "dona",
      narx: Number(yangiMahsulotSotuvNarx) || 0,
      shtrixKod: yangiMahsulotShtrixKod.trim(),
      tanNarx: Number(yangiMahsulotTanNarx) || 0,
      sotuvNarx: Number(yangiMahsulotSotuvNarx) || 0,
      ulgurjiNarx: Number(yangiMahsulotUlgurjiNarx) || 0,
    };
    setQoshimchaMahsulotlar((old) => [...old, yangi]);
    setSatrlar((old) => [...old, bosSatr(yangi, birinchiOmbor)]);
    tarixgaYozish(`Yangi mahsulot yaratildi: ${yangi.nomi}`);
    setYangiMahsulotNomi("");
    setYangiMahsulotShtrixKod("");
    setYangiMahsulotBirlik("dona");
    setYangiMahsulotTanNarx("");
    setYangiMahsulotSotuvNarx("");
    setYangiMahsulotUlgurjiNarx("");
    setMahsulotYaratishOchiq(false);
  }

  function jadvalScrollHolatiniYangilash() {
    const elem = jadvalScrollRef.current;
    if (!elem) return;
    const { scrollLeft, scrollWidth, clientWidth } = elem;
    if (scrollWidth <= clientWidth) {
      setScrollHolati({ chapFoiz: 0, kengFoiz: 100, korinadimi: false });
      return;
    }
    setScrollHolati({
      chapFoiz: (scrollLeft / scrollWidth) * 100,
      kengFoiz: (clientWidth / scrollWidth) * 100,
      korinadimi: true,
    });
  }

  useEffect(() => {
    jadvalScrollHolatiniYangilash();
  }, [satrlar.length, korinadiganUstunSozlamalari.length, ustunKengliklari]);

  useEffect(() => {
    function oyna() {
      jadvalScrollHolatiniYangilash();
    }
    window.addEventListener("resize", oyna);
    return () => window.removeEventListener("resize", oyna);
  }, []);

  function jadvalniSurish(yonalish: 1 | -1) {
    const elem = jadvalScrollRef.current;
    if (!elem) return;
    elem.scrollBy({ left: yonalish * 220, behavior: "smooth" });
  }

  function tutqichSudrashBoshlandi(event: ReactMouseEvent) {
    event.preventDefault();
    const elem = jadvalScrollRef.current;
    if (!elem) return;
    const boshlanishX = event.clientX;
    const boshlanishScrollLeft = elem.scrollLeft;
    const trekKengligi = elem.clientWidth;
    const jadvalKengligi = elem.scrollWidth;

    function harakat(moveEvent: globalThis.MouseEvent) {
      const farq = moveEvent.clientX - boshlanishX;
      const nisbat = jadvalKengligi / trekKengligi;
      elem!.scrollLeft = boshlanishScrollLeft + farq * nisbat;
    }
    function toxtash() {
      window.removeEventListener("mousemove", harakat);
      window.removeEventListener("mouseup", toxtash);
    }
    window.addEventListener("mousemove", harakat);
    window.addEventListener("mouseup", toxtash);
  }

  function ustunOlchaminiOzgartirish(kalit: string, event: ReactMouseEvent) {
    event.preventDefault();
    const boshlanishX = event.clientX;
    const boshlanishKenglik = ustunKengliklari[kalit] ?? 100;

    function harakat(moveEvent: globalThis.MouseEvent) {
      const farq = moveEvent.clientX - boshlanishX;
      setUstunKengliklari((old) => ({ ...old, [kalit]: Math.max(60, boshlanishKenglik + farq) }));
    }
    function toxtash() {
      window.removeEventListener("mousemove", harakat);
      window.removeEventListener("mouseup", toxtash);
    }
    window.addEventListener("mousemove", harakat);
    window.addEventListener("mouseup", toxtash);
  }

  function ustunKorinishiniAlmashtirish(kalit: UstunKaliti) {
    setKorinadiganUstunlar((old) => ({ ...old, [kalit]: !old[kalit] }));
  }

  function ustunHujayrasi(kalit: UstunKaliti, satr: ChiqimSatri) {
    const mahsulot = barchaMahsulotlar.find((item) => item.id === satr.mahsulotId);
    const ombor = omborlar.find((item) => item.id === satr.omborId);
    const qoldiq = joriyQoldiqlar.get(`${satr.omborId}::${satr.mahsulotId}`) ?? 0;

    switch (kalit) {
      case "shtrixKod":
        return (
          <div className="relative">
            <Barcode size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={satr.shtrixKod}
              onChange={(event) => satrniOzgartirish(satr.id, { shtrixKod: event.target.value })}
              placeholder="Shtrix kod"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white py-1 pl-7 pr-2 text-xs font-bold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
            />
          </div>
        );
      case "tanNarx":
        return (
          <input
            type="number"
            min={0}
            value={satr.tanNarx}
            onChange={(event) => satrniOzgartirish(satr.id, { tanNarx: Number(event.target.value) })}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
          />
        );
      case "sotuvNarx":
        return (
          <input
            type="number"
            min={0}
            value={satr.sotuvNarx}
            onChange={(event) => satrniOzgartirish(satr.id, { sotuvNarx: Number(event.target.value) })}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
          />
        );
      case "ulgurjiNarx":
        return (
          <input
            type="number"
            min={0}
            value={satr.ulgurjiNarx}
            onChange={(event) => satrniOzgartirish(satr.id, { ulgurjiNarx: Number(event.target.value) })}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
          />
        );
      case "soni":
        return (
          <div className="relative">
            <input
              type="number"
              min={0}
              value={satr.soni}
              onChange={(event) => satrniOzgartirish(satr.id, { soni: Number(event.target.value) })}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white py-1 pl-2 pr-9 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
              {mahsulot?.birlik ?? "dona"}
            </span>
          </div>
        );
      case "ombor":
        return (
          <SavdoSelect
            value={satr.omborId}
            onChange={(value) => satrniOzgartirish(satr.id, { omborId: value })}
            options={omborlar.map((item) => ({ value: item.id, label: item.nomi }))}
            placeholder="Ombor qidirish"
            buttonClassName="h-9 rounded-lg border-slate-200 px-2.5 text-xs shadow-none"
            dropdownClassName="min-w-[220px]"
            qidirish
            qidiruvPlaceholder="Ombor qidirish"
            hideChevron
            portal
          />
        );
      case "qoldiq":
        return (
          <div className="text-xs font-bold text-slate-500">
            {qoldiq} {mahsulot?.birlik ?? ""}
            <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">
              {ombor?.nomi ?? "—"}
            </span>
          </div>
        );
      case "summa":
        return (
          <span className="text-sm font-black text-emerald-600">{pul(satr.soni * satr.tanNarx)}</span>
        );
      default:
        return null;
    }
  }

  function tarixgaYozish(matn: string) {
    setTarix((oldTarix) => [{ id: crypto.randomUUID(), matn, vaqt: hozirgiVaqt() }, ...oldTarix]);
  }

  function faylTanlash(event: ChangeEvent<HTMLInputElement>) {
    const tanlanganFayllar = event.target.files;
    if (!tanlanganFayllar || tanlanganFayllar.length === 0) return;

    const bugun = new Date().toISOString().slice(0, 10);
    const yangiFayllar: ChiqimFayl[] = Array.from(tanlanganFayllar).map((fayl) => ({
      id: crypto.randomUUID(),
      nomi: fayl.name,
      sana: bugun,
    }));

    setFayllar((oldFayllar) => [...oldFayllar, ...yangiFayllar]);
    yangiFayllar.forEach((fayl) => tarixgaYozish(`Fayl biriktirildi: ${fayl.nomi}`));
    event.target.value = "";
  }

  function faylNominiOzgartirish(id: string, nomi: string) {
    setFayllar((oldFayllar) => oldFayllar.map((fayl) => (fayl.id === id ? { ...fayl, nomi } : fayl)));
  }

  function faylSananiOzgartirish(id: string, sana: string) {
    setFayllar((oldFayllar) => oldFayllar.map((fayl) => (fayl.id === id ? { ...fayl, sana } : fayl)));
  }

  function faylOchirish(id: string) {
    setFayllar((oldFayllar) => oldFayllar.filter((fayl) => fayl.id !== id));
  }

  function izohQoshish() {
    if (!kommentMatni.trim()) return;
    setKommentlar((oldKommentlar) => [
      {
        id: crypto.randomUUID(),
        matn: kommentMatni.trim(),
        muallif: masulShaxs.trim() || "Siz",
        vaqt: hozirgiVaqt(),
      },
      ...oldKommentlar,
    ]);
    tarixgaYozish("Izoh qo'shildi");
    setKommentMatni("");
  }

  function qatorQoshish() {
    setSatrlar((oldSatrlar) => [...oldSatrlar, bosSatrBosh(birinchiOmbor)]);
  }

  function satrniOzgartirish(id: string, ozgarish: Partial<ChiqimSatri>) {
    setSatrlar((oldSatrlar) =>
      oldSatrlar.map((satr) => (satr.id === id ? { ...satr, ...ozgarish } : satr))
    );
  }

  function mahsulotTanlash(satrId: string, mahsulotId: string) {
    const yangiMahsulot = barchaMahsulotlar.find((item) => item.id === mahsulotId);
    setSatrlar((oldSatrlar) => {
      const joriySatr = oldSatrlar.find((satr) => satr.id === satrId);
      const boshEdi = !joriySatr?.mahsulotId;
      const oxirgiEdi = oldSatrlar[oldSatrlar.length - 1]?.id === satrId;

      const yangilangan = oldSatrlar.map((satr) =>
        satr.id === satrId
          ? {
              ...satr,
              mahsulotId,
              shtrixKod: yangiMahsulot?.shtrixKod ?? satr.shtrixKod,
              tanNarx: yangiMahsulot?.tanNarx ?? satr.tanNarx,
              sotuvNarx: yangiMahsulot?.sotuvNarx ?? satr.sotuvNarx,
              ulgurjiNarx: yangiMahsulot?.ulgurjiNarx ?? satr.ulgurjiNarx,
            }
          : satr
      );

      return boshEdi && oxirgiEdi && mahsulotId
        ? [...yangilangan, bosSatrBosh(joriySatr?.omborId || birinchiOmbor)]
        : yangilangan;
    });
  }

  function satrOchirish(id: string) {
    setSatrlar((oldSatrlar) => oldSatrlar.filter((satr) => satr.id !== id));
  }

  function yasashHujjat(): ChiqimHujjat {
    return {
      id: boshlangich?.id ?? crypto.randomUUID(),
      nomi: nomi.trim() || keyingiNomi,
      mijoz: mijoz.trim(),
      sana: sanaQiymati,
      masulShaxs: masulShaxs.trim(),
      holati: boshlangich?.holati ?? "qoralama",
      satrlar,
      omborId: satrlar[0]?.omborId ?? boshlangich?.omborId ?? "",
      yaratilganSana: boshlangich?.yaratilganSana ?? new Date().toISOString().slice(0, 10),
      ozgartirilganSana: new Date().toISOString().slice(0, 10),
      ozgartirganShaxs: masulShaxs.trim(),
    };
  }

  function nusxaOlish() {
    if (typeof window === "undefined") return;
    void navigator.clipboard?.writeText(window.location.href);
  }

  const jami = chiqimJami({ satrlar });

  return (
    <AppModal className="items-start justify-start bg-slate-950/55 p-0 py-3 pl-[78px] pr-3 backdrop-blur-[3px]">
      <div className="relative h-[calc(100vh-32px)] w-full">
        <div className="absolute -left-[46px] top-5 z-[90] flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onYopish}
            title="Yopish"
            className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#FF6A00] text-white shadow-[0_10px_22px_rgba(249,115,22,.32)] ring-1 ring-white/80 transition duration-300 hover:-translate-x-0.5 hover:scale-105 active:scale-95"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            onClick={nusxaOlish}
            title="Havolani nusxalash"
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#FF6A00] shadow-md ring-1 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <Link size={15} />
          </button>
          <button
            type="button"
            onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
            title="Yangi oynada ochish"
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#FF6A00] shadow-md ring-1 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <ExternalLink size={15} />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            title="Chop etish"
            className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-white text-[#FF6A00] shadow-md ring-1 ring-orange-100 transition hover:-translate-x-0.5 hover:bg-orange-50"
          >
            <Printer size={15} />
          </button>
        </div>

        <div className="relative h-full w-full overflow-hidden rounded-l-[48px] rounded-r-[36px] bg-gradient-to-br from-[#FFF8EF] via-[#FFFDF9] to-[#FFE7D1] text-[#253044] shadow-[0_34px_120px_rgba(92,38,8,.42)] ring-1 ring-white/80">
          <header className="sticky top-0 z-30 border-b border-orange-100/80 bg-[#FFF8EF]/88 px-7 py-3.5 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[30px] font-black tracking-tight text-slate-950">
                    {boshlangich ? "Chiqimni tahrirlash" : "Yangi chiqim"}
                  </h2>
                  <Copy size={17} className="text-slate-300" />
                  <span className="rounded-full bg-[#FFF3E2] px-3 py-1 text-xs font-black uppercase tracking-wider text-[#FF6A00]">
                    {boshlangich ? "Tahrirlash" : "Yangi"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onYopish}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-[#FF6A00] hover:text-white"
                aria-label="Oynani yopish"
              >
                <X size={19} />
              </button>
            </div>
          </header>

          <div className="scrollbar-hidden h-[calc(100%-74px)] overflow-y-auto px-7 py-4 pb-28">
            <div className="grid gap-5 xl:grid-cols-2">
              <div className="min-w-0 space-y-4">
                <section className="overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
                  <div className="mb-4 flex items-center justify-between border-b border-orange-100/80 pb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                        Chiqim haqida
                      </h3>
                      <Settings size={15} className="text-slate-300" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                      Bekor qilish
                    </span>
                  </div>

                  <div className="space-y-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-slate-400">Chiqimni nomi</span>
                      <div className="flex items-center gap-2">
                        <input
                          value={nomi}
                          onChange={(event) => setNomi(event.target.value)}
                          placeholder={keyingiNomi}
                          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                        />
                        <FieldSettings />
                      </div>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-slate-400">Mijoz</span>
                      <div className="flex items-center gap-2">
                        <QidiruvSelect
                          boshlangichMatn={mijoz}
                          onErkinMatnOzgarishi={setMijoz}
                          onTanlash={(variant) => setMijoz(variant.label)}
                          placeholder="Kimga chiqim bo'lmoqda"
                          variantlar={mockMijozlar.map((mijozNomi) => ({
                            id: mijozNomi,
                            label: mijozNomi,
                          }))}
                          className="min-w-0 flex-1"
                          inputClassName="h-11 rounded-xl"
                        />
                        <FieldSettings />
                      </div>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-slate-400">Qachon chiqim qilingan</span>
                      <div className="relative">
                        <input
                          type="date"
                          value={sanaQiymati}
                          onChange={(event) => setSanaQiymati(event.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                        />
                        <CalendarDays
                          size={18}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                      </div>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-slate-400">Mas'ul shaxs</span>
                      <SavdoSelect
                        value={masulShaxs}
                        onChange={setMasulShaxs}
                        placeholder="Mas'ul shaxsni tanlang"
                        options={mockMasulShaxslar.map((shaxs) => ({ value: shaxs, label: shaxs }))}
                        buttonClassName="h-11 rounded-xl px-3.5 text-sm"
                        dropdownClassName="min-w-[300px]"
                        portal
                      />
                    </label>
                  </div>

                  <div className="mt-5 border-t border-orange-100/80 pt-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">Fayllar</h3>
                      <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-[#FF6A00] px-3.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(249,115,22,.22)] transition hover:-translate-y-0.5 hover:bg-[#EA580C]">
                        <Upload size={15} />
                        Fayl yuklash
                        <input type="file" multiple className="hidden" onChange={faylTanlash} />
                      </label>
                    </div>

                    {fayllar.length === 0 ? (
                      <p className="py-4 text-center text-sm font-semibold text-slate-400">
                        Fayl yuklanmagan
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {fayllar.map((fayl) => (
                          <div
                            key={fayl.id}
                            className="flex flex-wrap items-center gap-2.5 rounded-xl bg-white/80 p-3 ring-1 ring-orange-50"
                          >
                            <FileText size={18} className="shrink-0 text-[#FF6A00]" />
                            <input
                              value={fayl.nomi}
                              onChange={(event) => faylNominiOzgartirish(fayl.id, event.target.value)}
                              className="min-w-0 flex-1 border-0 bg-transparent text-sm font-bold text-slate-700 outline-none"
                            />
                            <div className="relative">
                              <input
                                type="date"
                                value={fayl.sana}
                                onChange={(event) => faylSananiOzgartirish(fayl.id, event.target.value)}
                                className="h-9 rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-xs font-bold text-slate-600 outline-none focus:border-[#FF6A00]"
                              />
                              <CalendarDays
                                size={13}
                                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => faylOchirish(fayl.id)}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 transition hover:bg-red-100"
                              aria-label="Faylni o'chirish"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="min-w-0 space-y-4">
                <section className="overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
                  <div className="mb-4 flex items-center gap-2 border-b border-orange-100/80 pb-3">
                    <MessageSquare size={16} className="text-[#FF6A00]" />
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                      Kommentariya
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={kommentMatni}
                      onChange={(event) => setKommentMatni(event.target.value)}
                      rows={3}
                      placeholder="Izoh yozing..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={izohQoshish}
                        disabled={!kommentMatni.trim()}
                        className="inline-flex h-9 items-center rounded-xl bg-[#FF6A00] px-4 text-sm font-black text-white transition hover:bg-[#EA580C] disabled:opacity-40"
                      >
                        Yuborish
                      </button>
                    </div>
                  </div>

                  {kommentlar.length > 0 && (
                    <div className="mt-4 space-y-2.5 border-t border-orange-100/80 pt-4">
                      {kommentlar.map((komment) => (
                        <div key={komment.id} className="rounded-xl bg-white/80 p-3 ring-1 ring-orange-50">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-slate-600">{komment.muallif}</span>
                            <span className="text-xs font-semibold text-slate-400">{komment.vaqt}</span>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-slate-700">{komment.matn}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
                  <div className="mb-4 flex items-center gap-2 border-b border-orange-100/80 pb-3">
                    <History size={16} className="text-[#FF6A00]" />
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">Tarix</h3>
                  </div>

                  <div className="space-y-3.5">
                    {tarix.map((yozuv) => (
                      <div key={yozuv.id} className="flex items-start gap-3">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#FF6A00]" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-700">{yozuv.matn}</p>
                          <p className="text-xs font-semibold text-slate-400">{yozuv.vaqt}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <section className="mt-5 overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(255,106,0,.08)] ring-1 ring-orange-100/80 backdrop-blur">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">Tovarlar</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={qatorQoshish}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#FF6A00] px-3.5 text-sm font-black uppercase text-white shadow-[0_10px_24px_rgba(255,106,0,.28)] transition hover:-translate-y-0.5 hover:bg-[#EA580C]"
                  >
                    <Plus size={16} />
                    Qator qo'shish
                  </button>

                  <div className="relative" ref={mahsulotYaratishMenyusiRef}>
                    <button
                      type="button"
                      onClick={() => setMahsulotYaratishOchiq((old) => !old)}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-black uppercase text-slate-600 transition hover:border-[#FF6A00] hover:text-[#FF6A00]"
                    >
                      Mahsulot yaratish
                    </button>
                    {mahsulotYaratishOchiq && (
                      <div className="absolute left-0 top-11 z-20 w-72 space-y-2.5 rounded-xl border border-orange-100 bg-white p-3.5 shadow-xl">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                          Yangi mahsulot
                        </p>
                        <input
                          value={yangiMahsulotNomi}
                          onChange={(event) => setYangiMahsulotNomi(event.target.value)}
                          placeholder="Mahsulot nomi *"
                          className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm font-semibold outline-none focus:border-[#FF6A00]"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={yangiMahsulotShtrixKod}
                            onChange={(event) => setYangiMahsulotShtrixKod(event.target.value)}
                            placeholder="Shtrix kod"
                            className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm font-semibold outline-none focus:border-[#FF6A00]"
                          />
                          <input
                            value={yangiMahsulotBirlik}
                            onChange={(event) => setYangiMahsulotBirlik(event.target.value)}
                            placeholder="Birlik (dona)"
                            className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm font-semibold outline-none focus:border-[#FF6A00]"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            min={0}
                            value={yangiMahsulotTanNarx}
                            onChange={(event) => setYangiMahsulotTanNarx(event.target.value)}
                            placeholder="Tan narhi"
                            className="h-9 w-full rounded-lg border border-slate-200 px-2 text-xs font-semibold outline-none focus:border-[#FF6A00]"
                          />
                          <input
                            type="number"
                            min={0}
                            value={yangiMahsulotSotuvNarx}
                            onChange={(event) => setYangiMahsulotSotuvNarx(event.target.value)}
                            placeholder="Sotuv narhi"
                            className="h-9 w-full rounded-lg border border-slate-200 px-2 text-xs font-semibold outline-none focus:border-[#FF6A00]"
                          />
                          <input
                            type="number"
                            min={0}
                            value={yangiMahsulotUlgurjiNarx}
                            onChange={(event) => setYangiMahsulotUlgurjiNarx(event.target.value)}
                            placeholder="Ulgurji narhi"
                            className="h-9 w-full rounded-lg border border-slate-200 px-2 text-xs font-semibold outline-none focus:border-[#FF6A00]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={mahsulotYaratish}
                          disabled={!yangiMahsulotNomi.trim()}
                          className="h-9 w-full rounded-lg bg-[#FF6A00] text-sm font-black text-white transition hover:bg-[#EA580C] disabled:opacity-40"
                        >
                          Yaratish va qo'shish
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="relative" ref={ustunlarMenyusiRef}>
                    <button
                      type="button"
                      onClick={() => setUstunlarMenyusiOchiq((old) => !old)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-orange-100 transition hover:bg-orange-50 hover:text-[#FF6A00]"
                      aria-label="Ustunlarni sozlash"
                      title="Ustunlarni ko'rsatish/berkitish"
                    >
                      <Settings size={16} />
                    </button>
                    {ustunlarMenyusiOchiq && (
                      <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-orange-100 bg-white p-2 shadow-xl">
                        <p className="px-2 py-1 text-xs font-black uppercase tracking-wide text-slate-400">
                          Ustunlarni ko'rsatish
                        </p>
                        {USTUN_SOZLAMALARI.map((ustun) => (
                          <label
                            key={ustun.kalit}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-700 hover:bg-orange-50"
                          >
                            <input
                              type="checkbox"
                              checked={korinadiganUstunlar[ustun.kalit]}
                              onChange={() => ustunKorinishiniAlmashtirish(ustun.kalit)}
                              className="h-4 w-4 accent-orange-500"
                            />
                            {ustun.nom}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {satrlar.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-orange-200 bg-white/60 p-10 text-center text-sm font-semibold text-slate-400">
                  Mahsulot qo'shilmagan. "Qator qo'shish" tugmasini bosing va qatorda mahsulotni qidiring.
                </div>
              ) : (
                <>
                  <div
                    ref={jadvalScrollRef}
                    onScroll={jadvalScrollHolatiniYangilash}
                    className="scrollbar-hidden overflow-x-auto rounded-2xl border border-orange-100"
                  >
                    <table className="border-collapse text-sm" style={{ tableLayout: "fixed", width: "max-content" }}>
                      <colgroup>
                        <col style={{ width: 32 }} />
                        <col style={{ width: 48 }} />
                        <col style={{ width: ustunKengliklari.mahsulot }} />
                        {korinadiganUstunSozlamalari.map((ustun) => (
                          <col key={ustun.kalit} style={{ width: ustunKengliklari[ustun.kalit] }} />
                        ))}
                        <col style={{ width: 40 }} />
                      </colgroup>
                      <thead className="bg-orange-50/70 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={satrlar.length > 0 && tanlanganSatrlar.size === satrlar.length}
                              onChange={hammasiniTanlash}
                              className="h-4 w-4 accent-orange-500"
                              aria-label="Barchasini tanlash"
                            />
                          </th>
                          <th className="px-3 py-3">№</th>
                          <th className="relative px-3 py-3">
                            Mahsulot
                            <span
                              onMouseDown={(event) => ustunOlchaminiOzgartirish("mahsulot", event)}
                              className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none hover:bg-orange-300/70"
                            />
                          </th>
                          {korinadiganUstunSozlamalari.map((ustun) => (
                            <th key={ustun.kalit} className="relative px-3 py-3">
                              {ustun.nom}
                              <span
                                onMouseDown={(event) => ustunOlchaminiOzgartirish(ustun.kalit, event)}
                                className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none hover:bg-orange-300/70"
                              />
                            </th>
                          ))}
                          <th className="px-3 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-50">
                        {satrlar.map((satr, index) => (
                          <tr
                            key={satr.id}
                            draggable
                            onDragStart={() => satrSudrashBoshlandi(satr.id)}
                            onDragOver={(event) => satrUstigaOlibKelindi(event, satr.id)}
                            onDragEnd={satrSudrashTugadi}
                            className={`align-top hover:bg-orange-50/30 ${
                              sudralayotganSatrId === satr.id ? "opacity-40" : ""
                            }`}
                          >
                            <td className="px-3 py-2.5">
                              <input
                                type="checkbox"
                                checked={tanlanganSatrlar.has(satr.id)}
                                onChange={() => satrTanlashniAlmashtirish(satr.id)}
                                className="h-4 w-4 accent-orange-500"
                                aria-label="Qatorni tanlash"
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5 text-xs font-black text-slate-400">
                                <GripVertical size={14} className="cursor-grab text-slate-300 active:cursor-grabbing" />
                                {index + 1}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-orange-200 bg-white text-slate-300">
                                  <ImageIcon size={18} />
                                </span>
                                <SavdoSelect
                                  value={satr.mahsulotId}
                                  onChange={(value) => mahsulotTanlash(satr.id, value)}
                                  placeholder="Mahsulotni tanlang"
                                  options={barchaMahsulotlar.map((item) => ({
                                    value: item.id,
                                    label: item.nomi,
                                    searchLabel: `${item.nomi} ${item.shtrixKod}`,
                                  }))}
                                  className="min-w-0 flex-1"
                                  buttonClassName="h-9 rounded-lg px-2.5 text-sm"
                                  dropdownClassName="min-w-[320px]"
                                  qidirish
                                  qidiruvPlaceholder="Mahsulot yoki shtrix kod bo'yicha qidirish"
                                  portal
                                />
                              </div>
                            </td>
                            {korinadiganUstunSozlamalari.map((ustun) => (
                              <td key={ustun.kalit} className="px-3 py-2.5">
                                {ustunHujayrasi(ustun.kalit, satr)}
                              </td>
                            ))}
                            <td className="px-3 py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => satrOchirish(satr.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 transition hover:bg-red-100"
                                aria-label="Mahsulot qatorini o'chirish"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {scrollHolati.korinadimi && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => jadvalniSurish(-1)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[#FF6A00] transition hover:bg-orange-200"
                        aria-label="Chapga surish"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="relative h-2 flex-1 rounded-full bg-orange-100">
                        <div
                          onMouseDown={tutqichSudrashBoshlandi}
                          className="absolute -top-1.5 flex h-5 cursor-grab items-center active:cursor-grabbing"
                          style={{
                            left: `${scrollHolati.chapFoiz}%`,
                            width: `${scrollHolati.kengFoiz}%`,
                          }}
                        >
                          <div className="h-2 w-full rounded-full bg-[#FF6A00] transition-colors hover:bg-[#EA580C]" />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => jadvalniSurish(1)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[#FF6A00] transition hover:bg-orange-200"
                        aria-label="O'ngga surish"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={tanlanganlarniOchirish}
                        disabled={tanlanganSatrlar.size === 0}
                        className="inline-flex items-center gap-1.5 text-sm font-black uppercase text-slate-500 transition hover:text-red-500 disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                        O'chirish
                      </button>
                      <select
                        value={amalTuri}
                        onChange={(event) => setAmalTuri(event.target.value)}
                        disabled={tanlanganSatrlar.size === 0}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold uppercase text-slate-500 outline-none disabled:opacity-40"
                      >
                        <option value="">- Amallar -</option>
                        <option value="ombor">Omborni o'zgartirish</option>
                        <option value="narx">Narxni yangilash</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500">
                        <input
                          type="checkbox"
                          checked={hammasiUchun}
                          onChange={(event) => setHammasiUchun(event.target.checked)}
                          className="h-4 w-4 accent-orange-500"
                        />
                        Hammasi uchun
                      </label>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">Umumiy summa</p>
                      <p className="text-xl font-black text-slate-950">{pul(jami)}</p>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>

          <footer className="absolute bottom-0 left-0 right-0 z-30 flex justify-end gap-3 border-t border-orange-100 bg-[#FFF8EF]/90 px-7 py-3.5 backdrop-blur-xl">
            <button
              type="button"
              onClick={onYopish}
              className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              onClick={() => onSaqlash(yasashHujjat(), false)}
              className="rounded-2xl bg-white px-6 py-3 text-sm font-black text-[#FF6A00] shadow-sm ring-1 ring-orange-200 transition hover:-translate-y-0.5"
            >
              Saqlash
            </button>
            <button
              type="button"
              onClick={() => onSaqlash(yasashHujjat(), true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#FF6A00] px-7 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(255,106,0,.24)] transition hover:-translate-y-0.5 hover:bg-[#EA580C] hover:shadow-[0_18px_40px_rgba(234,88,12,.32)]"
            >
              Saqlash va tasdiqlash
            </button>
          </footer>
        </div>
      </div>
    </AppModal>
  );
}
