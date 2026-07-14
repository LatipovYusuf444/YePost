import { useMemo, useState } from "react";
import { CalendarDays, FileDown, Printer, RefreshCw, Search } from "lucide-react";
import KopTanlov from "./KopTanlov";
import {
  mockFiliallar,
  mockKategoriyalar,
  mockMahsulotlar,
  mockNarxTurlari,
  mockOmborlar,
  mockRezervlar,
  mockXarakteristikalar,
} from "./mockData";
import type { NarxTuri } from "./types";
import { pul, qoldiqlarniHisoblash, sana } from "./yordamchilar";

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

const bugun = () => new Date().toISOString().slice(0, 10);

const BOSHLANGICH_FILTR: Filtr = {
  sana: bugun(),
  omborlar: [],
  filiallar: [],
  kategoriyalar: [],
  mahsulotlar: [],
  narxTuri: "tanNarx",
  variatsiyalar: [],
  xarakteristikalar: [],
  qoldiqTuri: "hammasi",
  rezervniKorsatish: true,
  omborlarBoyichaAjratish: false,
  shtrixKodniKorsatish: false,
  variatsiyalarniKorsatish: false,
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

const variatsiyaVariantlari = Array.from(
  new Set(mockMahsulotlar.map((mahsulot) => mahsulot.variatsiya).filter(Boolean) as string[])
);

export default function Qoldiqlar() {
  const [filtr, setFiltr] = useState<Filtr>(BOSHLANGICH_FILTR);
  const [qollangan, setQollangan] = useState<Filtr>(BOSHLANGICH_FILTR);
  const [shakllantirilgan, setShakllantirilgan] = useState(bugun());
  const [jadvalQidiruvi, setJadvalQidiruvi] = useState("");

  const qoldiqlar = useMemo(() => qoldiqlarniHisoblash(), []);

  function ozgartirish<K extends keyof Filtr>(kalit: K, qiymat: Filtr[K]) {
    setFiltr((old) => ({ ...old, [kalit]: qiymat }));
  }

  function hisobotniShakllantirish() {
    setQollangan(filtr);
    setShakllantirilgan(new Date().toISOString().slice(0, 10));
  }

  const satrlar = useMemo<Satr[]>(() => {
    const tanlanganOmborlar = mockOmborlar.filter((ombor) => {
      const omborMos = qollangan.omborlar.length === 0 || qollangan.omborlar.includes(ombor.id);
      const filialMos =
        qollangan.filiallar.length === 0 ||
        (ombor.filial ? qollangan.filiallar.includes(ombor.filial) : false);
      return omborMos && filialMos;
    });

    const tanlanganMahsulotlar = mockMahsulotlar.filter((mahsulot) => {
      const mahsulotMos =
        qollangan.mahsulotlar.length === 0 || qollangan.mahsulotlar.includes(mahsulot.id);
      const kategoriyaMos =
        qollangan.kategoriyalar.length === 0 ||
        (mahsulot.kategoriya ? qollangan.kategoriyalar.includes(mahsulot.kategoriya) : false);
      const variatsiyaMos =
        qollangan.variatsiyalar.length === 0 ||
        (mahsulot.variatsiya ? qollangan.variatsiyalar.includes(mahsulot.variatsiya) : false);
      const xarakteristikaMos =
        qollangan.xarakteristikalar.length === 0 ||
        (mahsulot.xarakteristika
          ? qollangan.xarakteristikalar.includes(mahsulot.xarakteristika)
          : false);
      return mahsulotMos && kategoriyaMos && variatsiyaMos && xarakteristikaMos;
    });

    const natija: Satr[] = [];

    for (const mahsulot of tanlanganMahsulotlar) {
      const birlikNarx = mahsulot[qollangan.narxTuri];

      if (qollangan.omborlarBoyichaAjratish) {
        for (const ombor of tanlanganOmborlar) {
          const jami = qoldiqlar.get(`${ombor.id}::${mahsulot.id}`) ?? 0;
          natija.push({
            kalit: `${mahsulot.id}::${ombor.id}`,
            mahsulotNomi: mahsulot.nomi,
            birlik: mahsulot.birlik,
            shtrixKod: mahsulot.shtrixKod,
            variatsiya: mahsulot.variatsiya ?? "—",
            omborNomi: ombor.nomi,
            jami,
            rezerv: 0,
            bosh: jami,
            birlikNarx,
            umumiy: jami * birlikNarx,
          });
        }
        continue;
      }

      const jami = tanlanganOmborlar.reduce(
        (yigindi, ombor) => yigindi + (qoldiqlar.get(`${ombor.id}::${mahsulot.id}`) ?? 0),
        0
      );
      const rezerv = qollangan.rezervniKorsatish ? mockRezervlar[mahsulot.id] ?? 0 : 0;
      natija.push({
        kalit: mahsulot.id,
        mahsulotNomi: mahsulot.nomi,
        birlik: mahsulot.birlik,
        shtrixKod: mahsulot.shtrixKod,
        variatsiya: mahsulot.variatsiya ?? "—",
        omborNomi: "Barcha omborlar",
        jami,
        rezerv,
        bosh: jami - rezerv,
        birlikNarx,
        umumiy: jami * birlikNarx,
      });
    }

    const qidiruvSozi = jadvalQidiruvi.trim().toLowerCase();

    return natija
      .filter((satr) => {
        if (qollangan.qoldiqTuri === "musbat") return satr.jami > 0;
        if (qollangan.qoldiqTuri === "nol") return satr.jami === 0;
        if (qollangan.qoldiqTuri === "manfiy") return satr.jami < 0;
        return true;
      })
      .filter((satr) =>
        qidiruvSozi
          ? `${satr.mahsulotNomi} ${satr.shtrixKod} ${satr.omborNomi}`
              .toLowerCase()
              .includes(qidiruvSozi)
          : true
      );
  }, [qollangan, qoldiqlar, jadvalQidiruvi]);

  const yakun = useMemo(
    () =>
      satrlar.reduce(
        (yigindi, satr) => ({
          jami: yigindi.jami + satr.jami,
          rezerv: yigindi.rezerv + satr.rezerv,
          bosh: yigindi.bosh + satr.bosh,
          umumiy: yigindi.umumiy + satr.umumiy,
        }),
        { jami: 0, rezerv: 0, bosh: 0, umumiy: 0 }
      ),
    [satrlar]
  );

  const narxTuriNomi =
    mockNarxTurlari.find((tur) => tur.kalit === qollangan.narxTuri)?.nom ?? "Narx";

  function excelgaYuklash() {
    const sarlavhalar = [
      "Nomi",
      "O'lchov birligi",
      ...(qollangan.omborlarBoyichaAjratish ? ["Ombor"] : []),
      "Jami",
      ...(qollangan.rezervniKorsatish ? ["Rezervda", "Bo'sh"] : []),
      `${narxTuriNomi} (birlik)`,
      "Umumiy summa",
    ];
    const qatorlar = satrlar.map((satr) =>
      [
        satr.mahsulotNomi,
        satr.birlik,
        ...(qollangan.omborlarBoyichaAjratish ? [satr.omborNomi] : []),
        satr.jami,
        ...(qollangan.rezervniKorsatish ? [satr.rezerv, satr.bosh] : []),
        satr.birlikNarx,
        satr.umumiy,
      ].join(";")
    );
    const csv = [sarlavhalar.join(";"), ...qatorlar].join("\n");
    const havola = document.createElement("a");
    havola.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    havola.download = `qoldiqlar-${qollangan.sana}.csv`;
    havola.click();
    URL.revokeObjectURL(havola.href);
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Ombor uchoti</p>
        <h1 className="mt-1 text-3xl font-black text-gray-950">Ombordagi qoldiqlar</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kirim, realizatsiya, chiqim va ko'chirma hujjatlari asosida hisoblangan qoldiqlar hisoboti.
        </p>
      </header>

      <div className="space-y-4 rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-gray-500">Sana bo'yicha</span>
          <div className="relative">
            <input
              type="date"
              value={filtr.sana}
              onChange={(event) => ozgartirish("sana", event.target.value)}
              className="h-11 rounded-2xl border border-gray-200 bg-white px-4 pr-10 text-sm font-semibold outline-none focus:border-orange-400"
            />
            <CalendarDays
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
          <button
            type="button"
            onClick={() => ozgartirish("sana", bugun())}
            className="text-sm font-bold text-orange-600 hover:underline"
          >
            Bugun
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KopTanlov
            sarlavha="Ombor"
            variantlar={mockOmborlar.map((ombor) => ({ id: ombor.id, label: ombor.nomi }))}
            tanlangan={filtr.omborlar}
            onOzgarish={(qiymat) => ozgartirish("omborlar", qiymat)}
            qidiruvPlaceholder="Ombor qidirish"
          />
          <KopTanlov
            sarlavha="Filial"
            variantlar={mockFiliallar.map((filial) => ({ id: filial, label: filial }))}
            tanlangan={filtr.filiallar}
            onOzgarish={(qiymat) => ozgartirish("filiallar", qiymat)}
            qidiruvPlaceholder="Filial qidirish"
          />
          <KopTanlov
            sarlavha="Mahsulot kategoriyasi"
            variantlar={mockKategoriyalar.map((kategoriya) => ({
              id: kategoriya,
              label: kategoriya,
            }))}
            tanlangan={filtr.kategoriyalar}
            onOzgarish={(qiymat) => ozgartirish("kategoriyalar", qiymat)}
            qidiruvPlaceholder="Kategoriya qidirish"
          />
          <KopTanlov
            sarlavha="Mahsulot"
            variantlar={mockMahsulotlar.map((mahsulot) => ({
              id: mahsulot.id,
              label: mahsulot.nomi,
            }))}
            tanlangan={filtr.mahsulotlar}
            onOzgarish={(qiymat) => ozgartirish("mahsulotlar", qiymat)}
            qidiruvPlaceholder="Mahsulot qidirish"
          />

          <div className="min-w-0">
            <p className="mb-1.5 text-xs font-bold text-gray-500">Narx turi</p>
            <select
              value={filtr.narxTuri}
              onChange={(event) => ozgartirish("narxTuri", event.target.value as NarxTuri)}
              className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none focus:border-orange-400"
            >
              {mockNarxTurlari.map((tur) => (
                <option key={tur.kalit} value={tur.kalit}>
                  {tur.nom}
                </option>
              ))}
            </select>
          </div>

          <KopTanlov
            sarlavha="Variatsiyalar"
            variantlar={variatsiyaVariantlari.map((variatsiya) => ({
              id: variatsiya,
              label: variatsiya,
            }))}
            tanlangan={filtr.variatsiyalar}
            onOzgarish={(qiymat) => ozgartirish("variatsiyalar", qiymat)}
            qidiruvPlaceholder="Variatsiya qidirish"
          />
          <KopTanlov
            sarlavha="Xarakteristika"
            variantlar={mockXarakteristikalar.map((xarakteristika) => ({
              id: xarakteristika,
              label: xarakteristika,
            }))}
            tanlangan={filtr.xarakteristikalar}
            onOzgarish={(qiymat) => ozgartirish("xarakteristikalar", qiymat)}
            qidiruvPlaceholder="Xarakteristika qidirish"
          />

          <div className="min-w-0">
            <p className="mb-1.5 text-xs font-bold text-gray-500">Qoldiqlar</p>
            <select
              value={filtr.qoldiqTuri}
              onChange={(event) => ozgartirish("qoldiqTuri", event.target.value as QoldiqFiltri)}
              className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none focus:border-orange-400"
            >
              <option value="hammasi">Hammasi</option>
              <option value="musbat">Musbat qoldiq</option>
              <option value="nol">Nol qoldiq</option>
              <option value="manfiy">Manfiy qoldiq</option>
            </select>
          </div>
        </div>

        <div className="grid gap-2 border-t border-gray-100 pt-4 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              ["rezervniKorsatish", "Rezervni ko'rsatish"],
              ["omborlarBoyichaAjratish", "Omborlar bo'yicha ajratish"],
              ["shtrixKodniKorsatish", "Shtrix kodni ko'rsatish"],
              ["variatsiyalarniKorsatish", "Variatsiyalarni ko'rsatish"],
            ] as Array<[keyof Filtr, string]>
          ).map(([kalit, nom]) => (
            <label key={kalit} className="flex items-center gap-2.5 text-sm font-semibold text-gray-600">
              <input
                type="checkbox"
                checked={Boolean(filtr[kalit])}
                onChange={(event) => ozgartirish(kalit, event.target.checked as Filtr[typeof kalit])}
                className="h-[18px] w-[18px] accent-orange-500"
              />
              {nom}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={hisobotniShakllantirish}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white transition hover:bg-orange-600"
        >
          <RefreshCw size={16} />
          Hisobotni shakllantirish
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-gray-600 transition hover:border-orange-200 hover:text-orange-600"
        >
          <Printer size={16} />
          Chop etish
        </button>
        <button
          type="button"
          onClick={excelgaYuklash}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-gray-600 transition hover:border-orange-200 hover:text-orange-600"
        >
          <FileDown size={16} />
          Excelga yuklash
        </button>
        <span className="text-sm font-semibold text-gray-400">
          {sana(qollangan.sana)} holatiga (shakllantirilgan: {sana(shakllantirilgan)})
        </span>

        <div className="relative ml-auto w-full max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={jadvalQidiruvi}
            onChange={(event) => setJadvalQidiruvi(event.target.value)}
            placeholder="Jadval bo'yicha qidirish"
            className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-orange-400"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-orange-50/60 text-xs font-bold uppercase tracking-wide text-orange-500">
              <tr>
                <th rowSpan={2} className="px-5 py-3 text-left">
                  Nomi
                </th>
                {qollangan.shtrixKodniKorsatish && (
                  <th rowSpan={2} className="px-5 py-3 text-left">
                    Shtrix kod
                  </th>
                )}
                {qollangan.variatsiyalarniKorsatish && (
                  <th rowSpan={2} className="px-5 py-3 text-left">
                    Variatsiya
                  </th>
                )}
                {qollangan.omborlarBoyichaAjratish && (
                  <th rowSpan={2} className="px-5 py-3 text-left">
                    Ombor
                  </th>
                )}
                <th rowSpan={2} className="px-5 py-3 text-left">
                  O'lchov birligi
                </th>
                <th
                  colSpan={qollangan.rezervniKorsatish ? 3 : 1}
                  className="border-b border-orange-100 px-5 py-2 text-center"
                >
                  Umumiy qoldiq
                </th>
                <th colSpan={2} className="border-b border-orange-100 px-5 py-2 text-center">
                  {narxTuriNomi}
                </th>
              </tr>
              <tr>
                <th className="px-5 py-2 text-right">Jami</th>
                {qollangan.rezervniKorsatish && (
                  <>
                    <th className="px-5 py-2 text-right">Rezervda</th>
                    <th className="px-5 py-2 text-right">Bo'sh</th>
                  </>
                )}
                <th className="px-5 py-2 text-right">Birlik</th>
                <th className="px-5 py-2 text-right">Umumiy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {satrlar.map((satr) => (
                <tr key={satr.kalit} className="hover:bg-orange-50/30">
                  <td className="px-5 py-3 font-black text-gray-950">{satr.mahsulotNomi}</td>
                  {qollangan.shtrixKodniKorsatish && (
                    <td className="px-5 py-3 text-gray-500">{satr.shtrixKod || "—"}</td>
                  )}
                  {qollangan.variatsiyalarniKorsatish && (
                    <td className="px-5 py-3 text-gray-500">{satr.variatsiya}</td>
                  )}
                  {qollangan.omborlarBoyichaAjratish && (
                    <td className="px-5 py-3 text-gray-600">{satr.omborNomi}</td>
                  )}
                  <td className="px-5 py-3 text-gray-500">{satr.birlik}</td>
                  <td
                    className={`px-5 py-3 text-right font-bold ${
                      satr.jami < 0 ? "text-red-500" : "text-gray-800"
                    }`}
                  >
                    {satr.jami}
                  </td>
                  {qollangan.rezervniKorsatish && (
                    <>
                      <td className="px-5 py-3 text-right font-bold text-gray-500">{satr.rezerv}</td>
                      <td className="px-5 py-3 text-right font-bold text-emerald-600">{satr.bosh}</td>
                    </>
                  )}
                  <td className="px-5 py-3 text-right text-gray-600">{pul(satr.birlikNarx)}</td>
                  <td className="px-5 py-3 text-right font-black text-gray-900">{pul(satr.umumiy)}</td>
                </tr>
              ))}
            </tbody>
            {satrlar.length > 0 && (
              <tfoot className="border-t-2 border-orange-100 bg-orange-50/40 text-sm font-black text-gray-800">
                <tr>
                  <td
                    className="px-5 py-3"
                    colSpan={
                      2 +
                      (qollangan.shtrixKodniKorsatish ? 1 : 0) +
                      (qollangan.variatsiyalarniKorsatish ? 1 : 0) +
                      (qollangan.omborlarBoyichaAjratish ? 1 : 0)
                    }
                  >
                    Jami: {satrlar.length} ta pozitsiya
                  </td>
                  <td className="px-5 py-3 text-right">{yakun.jami}</td>
                  {qollangan.rezervniKorsatish && (
                    <>
                      <td className="px-5 py-3 text-right">{yakun.rezerv}</td>
                      <td className="px-5 py-3 text-right">{yakun.bosh}</td>
                    </>
                  )}
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3 text-right">{pul(yakun.umumiy)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {satrlar.length === 0 && (
          <div className="p-14 text-center text-gray-400">
            Tanlangan filtrlar bo'yicha qoldiq topilmadi
          </div>
        )}
      </div>
    </div>
  );
}
