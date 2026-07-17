import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  FileDown,
  LoaderCircle,
  Printer,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  birliklarApi,
  kategoriyalarApi,
  mahsulotlarApi,
} from "@/api/catalogApi";
import {
  barchaModifikatsiyalar,
  filiallarApi,
  omborlarApi,
  omborQoldiqlari,
} from "@/api/omborApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import KopTanlov from "./KopTanlov";
import OmborJadval from "./OmborJadval";
import type {
  Kategoriya,
  Mahsulot,
  OlchovBirligi,
} from "@/types/catalog";
import type {
  Filial,
  MahsulotModifikatsiyasi,
  Ombor,
  OmborQoldigi,
} from "@/types/ombor";

type NarxTuri = "costPrice" | "retailPrice" | "wholesalePrice";
type QoldiqFiltri = "hammasi" | "musbat" | "nol" | "manfiy";

type Filtr = {
  sana: string;
  omborlar: string[];
  filiallar: string[];
  kategoriyalar: string[];
  mahsulotlar: string[];
  narxTuri: NarxTuri;
  variatsiyalar: string[];
  xarakteristikalar: string[];
  qoldiqTuri: QoldiqFiltri;
  rezervniKorsatish: boolean;
  omborlarBoyichaAjratish: boolean;
  shtrixKodniKorsatish: boolean;
  variatsiyalarniKorsatish: boolean;
};

type Satr = {
  kalit: string;
  mahsulotNomi: string;
  birlik: string;
  shtrixKod: string;
  variatsiya: string;
  omborNomi: string;
  jami: number;
  rezerv: number;
  bosh: number;
  birlikNarx: number;
  umumiy: number;
};

type KengaytirilganQoldiq = OmborQoldigi & {
  reservedQuantity?: number | string;
  reserved?: number | string;
  available?: number | string;
  totalQuantity?: number | string;
};

const bugun = () => new Date().toISOString().slice(0, 10);

const BOSHLANGICH_FILTR: Filtr = {
  sana: bugun(),
  omborlar: [],
  filiallar: [],
  kategoriyalar: [],
  mahsulotlar: [],
  narxTuri: "costPrice",
  variatsiyalar: [],
  xarakteristikalar: [],
  qoldiqTuri: "hammasi",
  rezervniKorsatish: true,
  omborlarBoyichaAjratish: false,
  shtrixKodniKorsatish: false,
  variatsiyalarniKorsatish: false,
};

const narxTurlari: Array<{ kalit: NarxTuri; nom: string }> = [
  { kalit: "costPrice", nom: "Tan narhi" },
  { kalit: "retailPrice", nom: "Sotuv narhi" },
  { kalit: "wholesalePrice", nom: "Ulgurji narhi" },
];

function raqam(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function pul(value: number) {
  return `${value.toLocaleString("uz-UZ")} so'm`;
}

function sana(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("uz-UZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
}

function mahsulotNomi(product: Mahsulot | undefined, modification: MahsulotModifikatsiyasi) {
  return product?.name ?? modification.product?.name ?? modification.name ?? "Noma'lum mahsulot";
}

function variantNomi(modification: MahsulotModifikatsiyasi) {
  const params = Object.entries(modification.params ?? {})
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim())
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
  return modification.name?.trim() || params || "Asosiy variant";
}

function qoldiqQiymatlari(item: KengaytirilganQoldiq) {
  const jami = raqam(
    item.balance ?? item.quantity ?? item.totalQuantity ?? item.availableQuantity ?? item.available
  );
  const backendRezerv = item.reservedQuantity ?? item.reserved;
  const backendBosh = item.availableQuantity ?? item.available;
  const bosh = backendBosh === undefined ? jami : raqam(backendBosh);
  const rezerv = backendRezerv === undefined ? Math.max(jami - bosh, 0) : raqam(backendRezerv);
  return { jami, rezerv, bosh };
}

export default function OmborQoldigi() {
  const [omborlar, setOmborlar] = useState<Ombor[]>([]);
  const [filiallar, setFiliallar] = useState<Filial[]>([]);
  const [kategoriyalar, setKategoriyalar] = useState<Kategoriya[]>([]);
  const [birliklar, setBirliklar] = useState<OlchovBirligi[]>([]);
  const [mahsulotlar, setMahsulotlar] = useState<Mahsulot[]>([]);
  const [modifikatsiyalar, setModifikatsiyalar] = useState<MahsulotModifikatsiyasi[]>([]);
  const [qoldiqlar, setQoldiqlar] = useState<OmborQoldigi[]>([]);
  const [filtr, setFiltr] = useState<Filtr>(BOSHLANGICH_FILTR);
  const [qollangan, setQollangan] = useState<Filtr>(BOSHLANGICH_FILTR);
  const [shakllantirilgan, setShakllantirilgan] = useState(bugun());
  const [jadvalQidiruvi, setJadvalQidiruvi] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xatolik, setXatolik] = useState<string | null>(null);

  const malumotlarniYuklash = useCallback(async () => {
    setYuklanmoqda(true);
    setXatolik(null);
    try {
      const [
        warehouses,
        branches,
        categories,
        units,
        products,
        modifications,
        stocks,
      ] = await Promise.all([
        omborlarApi.royxat(),
        filiallarApi.royxat(),
        kategoriyalarApi.royxat(),
        birliklarApi.royxat(),
        mahsulotlarApi.royxat(),
        barchaModifikatsiyalar(),
        omborQoldiqlari(),
      ]);
      setOmborlar(warehouses);
      setFiliallar(branches);
      setKategoriyalar(categories);
      setBirliklar(units);
      setMahsulotlar(products);
      setModifikatsiyalar(modifications);
      setQoldiqlar(stocks);
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setYuklanmoqda(false);
    }
  }, []);

  useEffect(() => {
    void malumotlarniYuklash();
  }, [malumotlarniYuklash]);

  function ozgartirish<K extends keyof Filtr>(kalit: K, qiymat: Filtr[K]) {
    setFiltr((old) => ({ ...old, [kalit]: qiymat }));
  }

  async function hisobotniShakllantirish() {
    await malumotlarniYuklash();
    setQollangan({ ...filtr });
    setShakllantirilgan(bugun());
  }

  const productMap = useMemo(
    () => new Map(mahsulotlar.map((item) => [item.id, item])),
    [mahsulotlar]
  );
  const unitMap = useMemo(() => new Map(birliklar.map((item) => [item.id, item])), [birliklar]);
  const omborMap = useMemo(() => new Map(omborlar.map((item) => [item.id, item])), [omborlar]);
  const modificationMap = useMemo(
    () => new Map(modifikatsiyalar.map((item) => [item.id, item])),
    [modifikatsiyalar]
  );

  const variatsiyaVariantlari = useMemo(
    () =>
      modifikatsiyalar.map((item) => ({
        id: item.id,
        label: `${mahsulotNomi(productMap.get(item.productId ?? item.product?.id ?? ""), item)} — ${variantNomi(item)}`,
      })),
    [modifikatsiyalar, productMap]
  );

  const xarakteristikaVariantlari = useMemo(() => {
    const variants = new Map<string, string>();
    for (const modification of modifikatsiyalar) {
      for (const [key, value] of Object.entries(modification.params ?? {})) {
        if (value === null || value === undefined || !String(value).trim()) continue;
        const id = `${key}:${String(value)}`;
        variants.set(id, `${key}: ${String(value)}`);
      }
    }
    return Array.from(variants, ([id, label]) => ({ id, label }));
  }, [modifikatsiyalar]);

  const satrlar = useMemo<Satr[]>(() => {
    const groups = new Map<string, Satr>();

    for (const rawStock of qoldiqlar) {
      const stock = rawStock as KengaytirilganQoldiq;
      const modification = rawStock.modification ?? modificationMap.get(rawStock.modificationId);
      if (!modification) continue;
      const productId = modification.productId ?? modification.product?.id ?? "";
      const product = productMap.get(productId);
      const warehouse = rawStock.warehouse ?? omborMap.get(rawStock.warehouseId ?? "");
      const warehouseId = rawStock.warehouseId ?? warehouse?.id ?? "";

      if (qollangan.omborlar.length && !qollangan.omborlar.includes(warehouseId)) continue;
      if (
        qollangan.filiallar.length &&
        (!warehouse?.branchId || !qollangan.filiallar.includes(warehouse.branchId))
      ) continue;
      if (qollangan.kategoriyalar.length && (!product || !qollangan.kategoriyalar.includes(product.categoryId))) continue;
      if (qollangan.mahsulotlar.length && !qollangan.mahsulotlar.includes(productId)) continue;
      if (qollangan.variatsiyalar.length && !qollangan.variatsiyalar.includes(modification.id)) continue;

      const params = Object.entries(modification.params ?? {}).map(
        ([key, value]) => `${key}:${String(value)}`
      );
      if (
        qollangan.xarakteristikalar.length &&
        !qollangan.xarakteristikalar.every((item) => params.includes(item))
      ) continue;

      const { jami, rezerv, bosh } = qoldiqQiymatlari(stock);
      const birlikNarx = raqam(modification.price?.[qollangan.narxTuri]);
      const groupKey = qollangan.omborlarBoyichaAjratish
        ? `${modification.id}::${warehouseId}`
        : modification.id;
      const mavjud = groups.get(groupKey);

      if (mavjud) {
        mavjud.jami += jami;
        mavjud.rezerv += rezerv;
        mavjud.bosh += bosh;
        mavjud.umumiy = mavjud.jami * mavjud.birlikNarx;
        continue;
      }

      const unit = product ? unitMap.get(product.unitId) : undefined;
      groups.set(groupKey, {
        kalit: groupKey,
        mahsulotNomi: mahsulotNomi(product, modification),
        birlik: unit?.shortName || unit?.name || "—",
        shtrixKod: modification.barcode ?? product?.barcode ?? "",
        variatsiya: variantNomi(modification),
        omborNomi: warehouse?.name ?? "Noma'lum ombor",
        jami,
        rezerv,
        bosh,
        birlikNarx,
        umumiy: jami * birlikNarx,
      });
    }

    const search = jadvalQidiruvi.trim().toLowerCase();
    return Array.from(groups.values())
      .filter((item) => {
        if (qollangan.qoldiqTuri === "musbat") return item.jami > 0;
        if (qollangan.qoldiqTuri === "nol") return item.jami === 0;
        if (qollangan.qoldiqTuri === "manfiy") return item.jami < 0;
        return true;
      })
      .filter((item) =>
        search
          ? `${item.mahsulotNomi} ${item.shtrixKod} ${item.variatsiya} ${item.omborNomi}`
              .toLowerCase()
              .includes(search)
          : true
      )
      .sort((a, b) => a.mahsulotNomi.localeCompare(b.mahsulotNomi, "uz"));
  }, [
    jadvalQidiruvi,
    modificationMap,
    omborMap,
    productMap,
    qoldiqlar,
    qollangan,
    unitMap,
  ]);

  const yakun = useMemo(
    () =>
      satrlar.reduce(
        (sum, item) => ({
          jami: sum.jami + item.jami,
          rezerv: sum.rezerv + item.rezerv,
          bosh: sum.bosh + item.bosh,
          umumiy: sum.umumiy + item.umumiy,
        }),
        { jami: 0, rezerv: 0, bosh: 0, umumiy: 0 }
      ),
    [satrlar]
  );

  const narxTuriNomi =
    narxTurlari.find((item) => item.kalit === qollangan.narxTuri)?.nom ?? "Narx";

  function excelgaYuklash() {
    const headers = [
      "Nomi",
      "O'lchov birligi",
      ...(qollangan.shtrixKodniKorsatish ? ["Shtrix kod"] : []),
      ...(qollangan.variatsiyalarniKorsatish ? ["Variatsiya"] : []),
      ...(qollangan.omborlarBoyichaAjratish ? ["Ombor"] : []),
      "Jami",
      ...(qollangan.rezervniKorsatish ? ["Rezervda", "Bo'sh"] : []),
      `${narxTuriNomi} (birlik)`,
      "Umumiy summa",
    ];
    const rows = satrlar.map((item) =>
      [
        item.mahsulotNomi,
        item.birlik,
        ...(qollangan.shtrixKodniKorsatish ? [item.shtrixKod] : []),
        ...(qollangan.variatsiyalarniKorsatish ? [item.variatsiya] : []),
        ...(qollangan.omborlarBoyichaAjratish ? [item.omborNomi] : []),
        item.jami,
        ...(qollangan.rezervniKorsatish ? [item.rezerv, item.bosh] : []),
        item.birlikNarx,
        item.umumiy,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(";")
    );
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + [headers.join(";"), ...rows].join("\n")], {
        type: "text/csv;charset=utf-8",
      })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `ombor-qoldiqlari-${qollangan.sana}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Ombor</p>
        <h1 className="mt-1 text-3xl font-black text-gray-950">Ombordagi qoldiqlar</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kirim, realizatsiya, chiqim va ko'chirma hujjatlari asosida hisoblangan qoldiqlar hisoboti.
        </p>
      </header>

      {xatolik && (
        <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
          <span>{xatolik}</span>
          <button type="button" onClick={() => void malumotlarniYuklash()}>Qayta urinish</button>
        </div>
      )}

      <section className="space-y-4 rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-gray-500">Sana bo'yicha</span>
          <div className="relative">
            <input
              type="date"
              value={filtr.sana}
              onChange={(event) => ozgartirish("sana", event.target.value)}
              className="h-12 rounded-2xl border border-gray-200 bg-white px-5 pr-11 text-sm font-semibold outline-none focus:border-orange-400"
            />
            <CalendarDays size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <button type="button" onClick={() => ozgartirish("sana", bugun())} className="text-sm font-black text-orange-600 hover:underline">
            Bugun
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KopTanlov sarlavha="Ombor" variantlar={omborlar.map((item) => ({ id: item.id, label: item.name }))} tanlangan={filtr.omborlar} onOzgarish={(value) => ozgartirish("omborlar", value)} qidiruvPlaceholder="Ombor qidirish" />
          <KopTanlov sarlavha="Filial" variantlar={filiallar.map((item) => ({ id: item.id, label: item.name }))} tanlangan={filtr.filiallar} onOzgarish={(value) => ozgartirish("filiallar", value)} qidiruvPlaceholder="Filial qidirish" />
          <KopTanlov sarlavha="Mahsulot kategoriyasi" variantlar={kategoriyalar.map((item) => ({ id: item.id, label: item.name }))} tanlangan={filtr.kategoriyalar} onOzgarish={(value) => ozgartirish("kategoriyalar", value)} qidiruvPlaceholder="Kategoriya qidirish" />
          <KopTanlov sarlavha="Mahsulot" variantlar={mahsulotlar.map((item) => ({ id: item.id, label: item.name }))} tanlangan={filtr.mahsulotlar} onOzgarish={(value) => ozgartirish("mahsulotlar", value)} qidiruvPlaceholder="Mahsulot qidirish" />

          <div className="min-w-0">
            <p className="mb-1.5 text-xs font-bold text-gray-500">Narx turi</p>
            <select value={filtr.narxTuri} onChange={(event) => ozgartirish("narxTuri", event.target.value as NarxTuri)} className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 outline-none focus:border-orange-400">
              {narxTurlari.map((item) => <option key={item.kalit} value={item.kalit}>{item.nom}</option>)}
            </select>
          </div>
          <KopTanlov sarlavha="Variatsiyalar" variantlar={variatsiyaVariantlari} tanlangan={filtr.variatsiyalar} onOzgarish={(value) => ozgartirish("variatsiyalar", value)} qidiruvPlaceholder="Variatsiya qidirish" />
          <KopTanlov sarlavha="Xarakteristika" variantlar={xarakteristikaVariantlari} tanlangan={filtr.xarakteristikalar} onOzgarish={(value) => ozgartirish("xarakteristikalar", value)} qidiruvPlaceholder="Xarakteristika qidirish" />
          <div className="min-w-0">
            <p className="mb-1.5 text-xs font-bold text-gray-500">Qoldiqlar</p>
            <select value={filtr.qoldiqTuri} onChange={(event) => ozgartirish("qoldiqTuri", event.target.value as QoldiqFiltri)} className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 outline-none focus:border-orange-400">
              <option value="hammasi">Hammasi</option>
              <option value="musbat">Musbat qoldiq</option>
              <option value="nol">Nol qoldiq</option>
              <option value="manfiy">Manfiy qoldiq</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 xl:grid-cols-4">
          {([
            ["rezervniKorsatish", "Rezervni ko'rsatish"],
            ["omborlarBoyichaAjratish", "Omborlar bo'yicha ajratish"],
            ["shtrixKodniKorsatish", "Shtrix kodni ko'rsatish"],
            ["variatsiyalarniKorsatish", "Variatsiyalarni ko'rsatish"],
          ] as Array<["rezervniKorsatish" | "omborlarBoyichaAjratish" | "shtrixKodniKorsatish" | "variatsiyalarniKorsatish", string]>).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2.5 text-sm font-bold text-gray-600">
              <input type="checkbox" checked={filtr[key]} onChange={(event) => ozgartirish(key, event.target.checked)} className="h-[18px] w-[18px] accent-orange-500" />
              {label}
            </label>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void hisobotniShakllantirish()} disabled={yuklanmoqda} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-100 transition hover:bg-orange-600 disabled:opacity-60">
          {yuklanmoqda ? <LoaderCircle size={17} className="animate-spin" /> : <RefreshCw size={17} />}
          Hisobotni shakllantirish
        </button>
        <button type="button" onClick={() => window.print()} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-5 text-sm font-bold text-gray-600 hover:text-orange-600"><Printer size={17} />Chop etish</button>
        <button type="button" onClick={excelgaYuklash} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-5 text-sm font-bold text-gray-600 hover:text-orange-600"><FileDown size={17} />Excelga yuklash</button>
        <span className="text-sm font-bold text-gray-400">{sana(qollangan.sana)} holatiga (shakllantirilgan: {sana(shakllantirilgan)})</span>
        <label className="relative ml-auto w-full max-w-sm">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={jadvalQidiruvi} onChange={(event) => setJadvalQidiruvi(event.target.value)} placeholder="Jadval bo'yicha qidirish" className="h-12 w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-orange-400" />
        </label>
      </div>

      {qollangan.sana !== bugun() && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          Backend hozir tarixiy sanadagi qoldiqni bermaydi. Jadvalda joriy qoldiq ko'rsatilmoqda; sana filtri uchun alohida endpoint talab qilinadi.
        </div>
      )}

      <OmborJadval className="[&_thead_th]:!h-auto [&_thead_th]:!py-3">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-orange-50/60 text-xs font-black uppercase tracking-wide text-orange-500">
              <tr>
                <th rowSpan={2} className="px-5 py-3 text-left">Nomi</th>
                {qollangan.shtrixKodniKorsatish && <th rowSpan={2} className="px-5 py-3 text-left">Shtrix kod</th>}
                {qollangan.variatsiyalarniKorsatish && <th rowSpan={2} className="px-5 py-3 text-left">Variatsiya</th>}
                {qollangan.omborlarBoyichaAjratish && <th rowSpan={2} className="px-5 py-3 text-left">Ombor</th>}
                <th rowSpan={2} className="px-5 py-3 text-left">O'lchov birligi</th>
                <th colSpan={qollangan.rezervniKorsatish ? 3 : 1} className="border-b border-orange-100 px-5 py-2 text-center">Umumiy qoldiq</th>
                <th colSpan={2} className="border-b border-orange-100 px-5 py-2 text-center">{narxTuriNomi}</th>
              </tr>
              <tr>
                <th className="px-5 py-2 text-right">Jami</th>
                {qollangan.rezervniKorsatish && <><th className="px-5 py-2 text-right">Rezervda</th><th className="px-5 py-2 text-right">Bo'sh</th></>}
                <th className="px-5 py-2 text-right">Birlik</th>
                <th className="px-5 py-2 text-right">Umumiy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {satrlar.map((item) => (
                <tr key={item.kalit} className="hover:bg-orange-50/30">
                  <td className="px-5 py-3 font-black text-gray-950">{item.mahsulotNomi}</td>
                  {qollangan.shtrixKodniKorsatish && <td className="px-5 py-3 text-gray-500">{item.shtrixKod || "—"}</td>}
                  {qollangan.variatsiyalarniKorsatish && <td className="px-5 py-3 text-gray-500">{item.variatsiya}</td>}
                  {qollangan.omborlarBoyichaAjratish && <td className="px-5 py-3 text-gray-600">{item.omborNomi}</td>}
                  <td className="px-5 py-3 text-gray-500">{item.birlik}</td>
                  <td className={`px-5 py-3 text-right font-bold ${item.jami < 0 ? "text-red-500" : "text-gray-800"}`}>{item.jami}</td>
                  {qollangan.rezervniKorsatish && <><td className="px-5 py-3 text-right font-bold text-gray-500">{item.rezerv}</td><td className="px-5 py-3 text-right font-bold text-emerald-600">{item.bosh}</td></>}
                  <td className="px-5 py-3 text-right text-gray-600">{pul(item.birlikNarx)}</td>
                  <td className="px-5 py-3 text-right font-black text-gray-900">{pul(item.umumiy)}</td>
                </tr>
              ))}
            </tbody>
            {satrlar.length > 0 && (
              <tfoot className="border-t-2 border-orange-100 bg-orange-50/40 font-black text-gray-800">
                <tr>
                  <td className="px-5 py-3" colSpan={1 + (qollangan.shtrixKodniKorsatish ? 1 : 0) + (qollangan.variatsiyalarniKorsatish ? 1 : 0) + (qollangan.omborlarBoyichaAjratish ? 1 : 0)}>Jami: {satrlar.length} ta pozitsiya</td>
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3 text-right">{yakun.jami}</td>
                  {qollangan.rezervniKorsatish && <><td className="px-5 py-3 text-right">{yakun.rezerv}</td><td className="px-5 py-3 text-right">{yakun.bosh}</td></>}
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3 text-right">{pul(yakun.umumiy)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        {!yuklanmoqda && satrlar.length === 0 && <div className="p-14 text-center font-semibold text-gray-400">Tanlangan filtrlar bo'yicha qoldiq topilmadi</div>}
        {yuklanmoqda && satrlar.length === 0 && <div className="p-14 text-center"><LoaderCircle className="mx-auto animate-spin text-orange-500" size={28} /></div>}
      </OmborJadval>
    </div>
  );
}
