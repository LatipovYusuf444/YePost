import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  FileText,
  LoaderCircle,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOmborStore } from "@/store/omborStore";
import { useSavdoStore } from "@/store/savdoStore";
import type { Sotuv } from "@/types/savdo";
import {
  sotuvHolati,
  sotuvQarzdorlikSummasi,
  sotuvSummasi,
  sotuvTolanganSummasi,
} from "@/Pages/Savdo/savdoYordamchilari";
import { OmbordanChiqarishHujjatModal } from "@/Pages/Savdo/SotuvTafsilotlariModal";
import { hujjatRaqami, pul, sana } from "./omborYordamchilari";
import OmborJadval from "./OmborJadval";

type JadvalQatori = {
  id: string;
  nomi: string;
  kontragent: string;
  ombor: string;
  masul: string;
  status: string;
  realizationDate?: string;
  summa?: number;
  tolangan?: number;
  qarz?: number;
};

function kontragentNomi(sotuv: Sotuv) {
  const mijoz = sotuv.customer;
  const jismoniyMijoz = [mijoz?.firstName, mijoz?.lastName].filter(Boolean).join(" ").trim();
  return jismoniyMijoz || mijoz?.fullName || mijoz?.name || sotuv.clientCompany?.name || "—";
}

function entityNomi(
  id: string | undefined,
  boglangan: { fullName?: string; name?: string; username?: string } | undefined,
  xarita: Map<string, { fullName?: string; name?: string; username?: string }>
) {
  const entity = boglangan ?? (id ? xarita.get(id) : undefined);
  return entity?.fullName?.trim() || entity?.name?.trim() || entity?.username?.trim() || "Biriktirilmagan";
}

function omborNomi(
  id: string | undefined,
  boglangan: { name?: string } | undefined,
  xarita: Map<string, { name?: string }>
) {
  return (
    boglangan?.name?.trim() ||
    (id ? xarita.get(id)?.name?.trim() : undefined) ||
    "Noma'lum ombor"
  );
}

type UstunKaliti =
  | "kontragent"
  | "ombor"
  | "sana"
  | "masul"
  | "status"
  | "summa"
  | "tolangan"
  | "qarz";

const ustunlar: Array<{ kalit: UstunKaliti; nom: string }> = [
  { kalit: "kontragent", nom: "Kontragent" },
  { kalit: "ombor", nom: "Ombor" },
  { kalit: "sana", nom: "Sana" },
  { kalit: "masul", nom: "Mas'ul shaxs" },
  { kalit: "status", nom: "Status" },
  { kalit: "summa", nom: "Summa" },
  { kalit: "tolangan", nom: "To'langan" },
  { kalit: "qarz", nom: "Qarz" },
];

const yaratishVariantlari = [{ nom: "Sotuv yaratish", path: "/savdo" }];

function statusMatni(value?: string) {
  const status = String(value ?? "DRAFT").toUpperCase();
  const labels: Record<string, string> = {
    DRAFT: "Qoralama",
    CONFIRMED: "Tasdiqlangan",
    CANCELLED: "Bekor qilingan",
    CANCELED: "Bekor qilingan",
    SENT: "Jo'natilgan",
    RECEIVED: "Qabul qilingan",
  };
  return labels[status] ?? status;
}

function Status({ value }: { value: string }) {
  const status = String(value).toUpperCase();
  const rang =
    status === "CONFIRMED" || status === "RECEIVED"
      ? "bg-emerald-50 text-emerald-600"
      : status === "CANCELLED" || status === "CANCELED"
        ? "bg-red-50 text-red-500"
        : status === "SENT"
          ? "bg-blue-50 text-blue-600"
          : "bg-slate-100 text-slate-500";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${rang}`}>
      {statusMatni(status)}
    </span>
  );
}

export default function AmalgaOshirilganlar() {
  const navigate = useNavigate();
  const store = useOmborStore();
  const savdo = useSavdoStore();
  const amalgaOshirilganlarniYuklash = store.amalgaOshirilganlarniYuklash;
  const [qidiruv, setQidiruv] = useState("");
  const [yaratishOchiq, setYaratishOchiq] = useState(false);
  const [sozlamaOchiq, setSozlamaOchiq] = useState(false);
  const [korinadiganUstunlar, setKorinadiganUstunlar] = useState<UstunKaliti[]>(
    ustunlar.map((ustun) => ustun.kalit)
  );

  useEffect(() => {
    void amalgaOshirilganlarniYuklash();
  }, [amalgaOshirilganlarniYuklash]);

  useEffect(() => {
    const yangilash = () => void amalgaOshirilganlarniYuklash();
    window.addEventListener("savdo:yangilandi", yangilash);
    return () => window.removeEventListener("savdo:yangilandi", yangilash);
  }, [amalgaOshirilganlarniYuklash]);

  const savdoBoshlangichMalumotlarniYuklash = savdo.boshlangichMalumotlarniYuklash;

  useEffect(() => {
    // Mijoz/kompaniya ro'yxati shu yerda yuklanmasa, hujjat ochilganda
    // sotuvga biriktirilgan real mijoz/kompaniya nomi aniqlanmay, "Donalik
    // mijoz" degan standart matnga tushib qoladi.
    void savdoBoshlangichMalumotlarniYuklash();
  }, [savdoBoshlangichMalumotlarniYuklash]);

  const savdoTanlanganSotuvniTozalash = savdo.tanlanganSotuvniTozalash;
  const savdoXatolikniTozalash = savdo.xatolikniTozalash;

  useEffect(() => {
    // Boshqa sahifada (masalan /savdo) ochilib qolgan sotuv modali yoki xatolik
    // shu sahifaga o'tilganda tasodifan chiqib ketmasin.
    savdoTanlanganSotuvniTozalash();
    savdoXatolikniTozalash();
  }, [savdoTanlanganSotuvniTozalash, savdoXatolikniTozalash]);

  const omborMap = useMemo(
    () => new Map(store.omborlar.map((ombor) => [String(ombor.id), ombor])),
    [store.omborlar]
  );
  const xodimMap = useMemo(
    () => new Map(store.xodimlar.map((xodim) => [String(xodim.id), xodim])),
    [store.xodimlar]
  );

  const rows = useMemo<JadvalQatori[]>(
    () =>
      store.sotuvlar
        .filter((sotuv) => sotuvHolati(sotuv) === "CONFIRMED")
        .map((sotuv) => ({
          id: sotuv.id,
          nomi: hujjatRaqami(sotuv),
          kontragent: kontragentNomi(sotuv),
          ombor: omborNomi(sotuv.warehouseId, sotuv.warehouse, omborMap),
          masul: entityNomi(sotuv.responsibleId, sotuv.responsible, xodimMap),
          status: String(sotuv.status ?? "CONFIRMED"),
          realizationDate: sotuv.confirmedAt ?? sotuv.createdAt,
          summa: sotuvSummasi(sotuv),
          tolangan: sotuvTolanganSummasi(sotuv),
          qarz: sotuvQarzdorlikSummasi(sotuv),
        }))
        .sort((a, b) =>
          String(b.realizationDate ?? "").localeCompare(String(a.realizationDate ?? ""))
        ),
    [omborMap, store.sotuvlar, xodimMap]
  );

  const filtrlanganRows = useMemo(() => {
    const query = qidiruv.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((item) =>
      [
        item.nomi,
        item.kontragent,
        item.ombor,
        item.masul,
        statusMatni(item.status),
        sana(item.realizationDate),
        item.summa == null ? "" : String(item.summa),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [qidiruv, rows]);

  function ustunniAlmashtirish(kalit: UstunKaliti) {
    setKorinadiganUstunlar((oldingi) =>
      oldingi.includes(kalit)
        ? oldingi.length === 1
          ? oldingi
          : oldingi.filter((item) => item !== kalit)
        : [...oldingi, kalit]
    );
  }

  function realizatsiyaniOchish(sotuvId: string) {
    void savdo.sotuvTafsilotiniYuklash(sotuvId);
  }

  function katak(item: JadvalQatori, kalit: UstunKaliti) {
    if (kalit === "kontragent") return item.kontragent || "—";
    if (kalit === "ombor") return item.ombor;
    if (kalit === "sana") return sana(item.realizationDate);
    if (kalit === "masul") return item.masul;
    if (kalit === "status") return <Status value={item.status} />;
    if (kalit === "summa") return item.summa == null ? "—" : pul(item.summa);
    if (kalit === "tolangan") return item.tolangan == null ? "—" : pul(item.tolangan);
    if (item.qarz == null) return "—";
    return (
      <span className={item.qarz > 0 ? "font-black text-red-500" : ""}>{pul(item.qarz)}</span>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Amalga oshirilganlar</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Omborda amalga oshirilgan realizatsiya (sotuv) hujjatlari.
          </p>
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setYaratishOchiq((oldingi) => !oldingi)}
            className="inline-flex h-12 items-center gap-2 rounded-[20px] bg-orange-500 px-5 text-sm font-black text-white shadow-sm transition hover:bg-orange-600"
          >
            <Plus size={18} /> Yaratish <ChevronDown size={15} />
          </button>
          {yaratishOchiq && (
            <div className="absolute right-0 top-14 z-30 w-56 overflow-hidden rounded-2xl border border-orange-100 bg-white p-2 shadow-xl">
              {yaratishVariantlari.map((variant) => (
                <button
                  key={variant.path}
                  type="button"
                  onClick={() => navigate(variant.path)}
                  className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 transition hover:bg-orange-50 hover:text-orange-600"
                >
                  {variant.nom}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-[480px]">
          <Search
            size={19}
            className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={qidiruv}
            onChange={(event) => setQidiruv(event.target.value)}
            placeholder="Nomi, kontragent, ombor, mas'ul shaxs yoki holati"
            className="h-14 w-full rounded-[20px] border border-slate-200 bg-white pl-13 pr-5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />
        </label>
      </div>

      {store.xatolik && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm font-bold text-red-600">
          {store.xatolik}
        </div>
      )}

      {savdo.xatolik && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm font-bold text-red-600">
          <span>{savdo.xatolik}</span>
          <button type="button" onClick={savdo.xatolikniTozalash} className="font-black">
            Yopish
          </button>
        </div>
      )}

      <div className="relative overflow-visible">
        <OmborJadval>
          <table className="w-full min-w-[860px] table-fixed text-left text-sm">
            <thead className="bg-orange-50/70 text-xs font-black uppercase text-orange-500">
              <tr>
                <th className="w-[210px] px-6 py-5">Nomi</th>
                {ustunlar
                  .filter((ustun) => korinadiganUstunlar.includes(ustun.kalit))
                  .map((ustun) => (
                    <th key={ustun.kalit} className="border-l border-orange-200/70 px-6 py-5">
                      {ustun.nom}
                    </th>
                  ))}
                <th className="w-[76px] px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => setSozlamaOchiq((oldingi) => !oldingi)}
                    aria-label="Ustunlarni sozlash"
                    title="Ustunlarni sozlash"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-orange-500 transition hover:bg-orange-100"
                  >
                    <Settings size={18} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100">
              {filtrlanganRows.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => realizatsiyaniOchish(item.id)}
                  className="cursor-pointer text-slate-600 transition hover:bg-orange-50/40"
                >
                  <td className="truncate px-6 py-5 font-black text-slate-900">{item.nomi}</td>
                  {ustunlar
                    .filter((ustun) => korinadiganUstunlar.includes(ustun.kalit))
                    .map((ustun) => (
                      <td
                        key={ustun.kalit}
                        className={`px-6 py-5 ${
                          ustun.kalit === "ombor" ||
                          ustun.kalit === "masul" ||
                          ustun.kalit === "kontragent"
                            ? "whitespace-normal break-words"
                            : "whitespace-nowrap"
                        }`}
                      >
                        {katak(item, ustun.kalit)}
                      </td>
                    ))}
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        realizatsiyaniOchish(item.id);
                      }}
                      title="Hujjatni ko'rish"
                      aria-label="Hujjatni ko'rish"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 transition hover:bg-orange-100"
                    >
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </OmborJadval>

        {sozlamaOchiq && (
          <div className="absolute right-4 top-14 z-40 w-56 rounded-2xl border border-orange-100 bg-white p-3 shadow-xl">
            <p className="px-2 pb-2 text-xs font-black uppercase tracking-wide text-slate-400">
              Ko'rinadigan ustunlar
            </p>
            {ustunlar.map((ustun) => (
              <label
                key={ustun.kalit}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm font-bold text-slate-700 hover:bg-orange-50"
              >
                <input
                  type="checkbox"
                  checked={korinadiganUstunlar.includes(ustun.kalit)}
                  onChange={() => ustunniAlmashtirish(ustun.kalit)}
                  className="h-4 w-4 accent-orange-500"
                />
                {ustun.nom}
              </label>
            ))}
          </div>
        )}

        {store.yuklanmoqda && rows.length === 0 && (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-bold text-slate-400">
            <LoaderCircle size={22} className="animate-spin text-orange-500" /> Hujjatlar yuklanmoqda...
          </div>
        )}

        {!store.yuklanmoqda && filtrlanganRows.length === 0 && (
          <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
            <FileText size={30} className="text-orange-200" />
            <p className="mt-3 font-bold text-slate-400">
              {qidiruv ? "Qidiruv bo'yicha hujjat topilmadi" : "Amalga oshirilgan hujjatlar mavjud emas"}
            </p>
          </div>
        )}
      </div>

      {savdo.tanlanganSotuv && (
        <OmbordanChiqarishHujjatModal
          sotuv={savdo.tanlanganSotuv}
          jami={sotuvSummasi(savdo.tanlanganSotuv)}
          onClose={savdo.tanlanganSotuvniTozalash}
        />
      )}
    </div>
  );
}
