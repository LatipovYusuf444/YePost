import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  Edit3,
  LayoutGrid,
  LoaderCircle,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Table2,
  Trash2,
  UserRound,
  Warehouse,
  X,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useOmborStore } from "@/store/omborStore";
import type { Ombor, OmborSaqlashMalumoti } from "@/types/ombor";
import FiliallarBoshqaruvi from "./FiliallarBoshqaruvi";
import Kompaniyalar from "./Kompaniyalar";
import OrganizationTablari, { type OrganizationTab } from "./OrganizationTablari";

type Korinish = "jadval" | "kartochka";

export default function Ombor() {
  const {
    omborlar,
    filiallar,
    xodimlar,
    yuklanmoqda,
    amalBajarilmoqda,
    xatolik,
    malumotlarniYuklash,
    omborMalumotlariniYuklash,
    omborYaratish,
    omborOlish,
    omborYangilash,
    omborOchirish,
    xatolikniTozalash,
  } = useOmborStore();
  const [organizationTab, setOrganizationTab] = useState<OrganizationTab>("omborlar");
  const [korinish, setKorinish] = useState<Korinish>("jadval");
  const [korinishMenuOchiq, setKorinishMenuOchiq] = useState(false);
  const [modalOchiq, setModalOchiq] = useState(false);
  const [tahrirOmbor, setTahrirOmbor] = useState<Ombor | null>(null);
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [gps, setGps] = useState("");
  const [address, setAddress] = useState("");
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("18:00");
  const [responsibleId, setResponsibleId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [gpsYuklanmoqda, setGpsYuklanmoqda] = useState(false);
  const [formaXatosi, setFormaXatosi] = useState<string | null>(null);
  const korinishMenuRef = useRef<HTMLDivElement | null>(null);
  const tanlanganMasul = xodimlar.find((xodim) => xodim.id === responsibleId);
  const yaratilganSana =
    tahrirOmbor?.createdAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (organizationTab === "omborlar") {
      void omborMalumotlariniYuklash();
      return;
    }
    void malumotlarniYuklash();
  }, [malumotlarniYuklash, omborMalumotlariniYuklash, organizationTab]);

  useEffect(() => {
    if (!korinishMenuOchiq) return;

    function tashqarigaBosish(event: MouseEvent) {
      if (!korinishMenuRef.current?.contains(event.target as Node)) {
        setKorinishMenuOchiq(false);
      }
    }

    document.addEventListener("mousedown", tashqarigaBosish);
    return () => document.removeEventListener("mousedown", tashqarigaBosish);
  }, [korinishMenuOchiq]);

  function sananiFormatlash(sana?: string) {
    if (!sana) return "—";
    const qiymat = new Date(sana);
    if (Number.isNaN(qiymat.getTime())) return "—";
    return new Intl.DateTimeFormat("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(qiymat);
  }

  async function modalniOchish(ombor?: Ombor) {
    xatolikniTozalash();
    const toliqOmbor = ombor ? await omborOlish(ombor.id) : null;
    if (ombor && !toliqOmbor) return;
    setTahrirOmbor(toliqOmbor);
    setName(toliqOmbor?.name ?? "");
    setBranchId(toliqOmbor?.branchId ?? "");
    setGps(
      toliqOmbor?.latitude != null && toliqOmbor?.longitude != null
        ? `${toliqOmbor.latitude}, ${toliqOmbor.longitude}`
        : ""
    );
    setAddress(toliqOmbor?.address ?? "");
    setOpeningTime(toliqOmbor?.openingTime ?? "09:00");
    setClosingTime(toliqOmbor?.closingTime ?? "18:00");
    setResponsibleId(toliqOmbor?.responsibleId ?? toliqOmbor?.responsible?.id ?? "");
    setIsActive(toliqOmbor?.isActive ?? true);
    setGpsYuklanmoqda(false);
    setFormaXatosi(null);
    setModalOchiq(true);
  }

  async function saqlash(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    const koordinatalar = gps
      .split(",")
      .map((qiymat) => Number(qiymat.trim()));
    if (
      gps.trim() &&
      (koordinatalar.length !== 2 ||
        koordinatalar.some((qiymat) => !Number.isFinite(qiymat)) ||
        koordinatalar[0] < -90 ||
        koordinatalar[0] > 90 ||
        koordinatalar[1] < -180 ||
        koordinatalar[1] > 180)
    ) {
      setFormaXatosi("GPS koordinatasini latitude, longitude formatida kiriting.");
      return;
    }

    setFormaXatosi(null);
    const data: OmborSaqlashMalumoti = {
      name: name.trim(),
      ...(branchId ? { branchId } : {}),
      address: address.trim() || null,
      latitude: gps.trim() ? koordinatalar[0] : null,
      longitude: gps.trim() ? koordinatalar[1] : null,
      openingTime: openingTime || null,
      closingTime: closingTime || null,
      responsibleId: responsibleId || null,
      isActive,
    };
    const muvaffaqiyatli = tahrirOmbor
      ? await omborYangilash(tahrirOmbor.id, data)
      : await omborYaratish(data);

    if (muvaffaqiyatli) setModalOchiq(false);
  }

  function gpsniAniqlash() {
    setFormaXatosi(null);
    if (!navigator.geolocation) {
      setFormaXatosi("Brauzeringiz GPS aniqlashni qo'llab-quvvatlamaydi.");
      return;
    }

    setGpsYuklanmoqda(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGps(`${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
        setGpsYuklanmoqda(false);
      },
      () => {
        setFormaXatosi("GPS joylashuvini aniqlab bo'lmadi. Brauzer ruxsatini tekshiring.");
        setGpsYuklanmoqda(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 }
    );
  }

  async function ochirish(id: string) {
    if (!window.confirm("Omborni o'chirasizmi?")) return;
    await omborOchirish(id);
  }

  if (organizationTab === "kompaniyalar") {
    return (
      <div className="space-y-5">
        <OrganizationTablari faolTab={organizationTab} onTab={setOrganizationTab} />
        {xatolik && (
          <div className="flex justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
            <span>{xatolik}</span>
            <button onClick={xatolikniTozalash}>Yopish</button>
          </div>
        )}
        <Kompaniyalar />
      </div>
    );
  }

  if (organizationTab === "filiallar") {
    return (
      <div className="space-y-5">
        <OrganizationTablari faolTab={organizationTab} onTab={setOrganizationTab} />
        {xatolik && (
          <div className="flex justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
            <span>{xatolik}</span>
            <button onClick={xatolikniTozalash}>Yopish</button>
          </div>
        )}
        <FiliallarBoshqaruvi />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <OrganizationTablari faolTab={organizationTab} onTab={setOrganizationTab} />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            Ombor uchoti
          </p>
          <h1 className="mt-1 text-3xl font-black text-gray-950">Omborlar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ombor punktlarini yaratish va tahrirlash.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div ref={korinishMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setKorinishMenuOchiq((ochiq) => !ochiq)}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-gray-600 shadow-sm ring-1 ring-orange-100 transition hover:text-orange-600"
              aria-expanded={korinishMenuOchiq}
              aria-haspopup="menu"
            >
              {korinish === "jadval" ? (
                <Table2 size={17} className="text-orange-500" />
              ) : (
                <LayoutGrid size={17} className="text-orange-500" />
              )}
              Ko'rinish
              {korinishMenuOchiq ? (
                <ChevronUp size={16} className="text-orange-500" />
              ) : (
                <ChevronDown size={16} className="text-orange-500" />
              )}
            </button>

            {korinishMenuOchiq && (
              <div
                role="menu"
                className="absolute right-0 z-30 mt-3 w-64 rounded-[22px] border border-orange-100 bg-white p-2.5 shadow-[0_18px_45px_rgba(15,23,42,.18)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setKorinish("jadval");
                    setKorinishMenuOchiq(false);
                  }}
                  className={`flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-black transition ${
                    korinish === "jadval"
                      ? "bg-orange-500 text-white"
                      : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  <Table2 size={18} />
                  Jadval
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setKorinish("kartochka");
                    setKorinishMenuOchiq(false);
                  }}
                  className={`mt-1 flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-black transition ${
                    korinish === "kartochka"
                      ? "bg-orange-500 text-white"
                      : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  <LayoutGrid size={18} />
                  Kartochka
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => void omborMalumotlariniYuklash()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-gray-600 ring-1 ring-orange-100"
          >
            <RefreshCw size={16} className={yuklanmoqda ? "animate-spin" : ""} />
            Yangilash
          </button>
          <button
            onClick={() => void modalniOchish()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white"
          >
            <Plus size={17} />
            Ombor qo'shish
          </button>
        </div>
      </header>

      {xatolik && (
        <div className="flex justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
          <span>{xatolik}</span>
          <button onClick={xatolikniTozalash}>Yopish</button>
        </div>
      )}

      {yuklanmoqda ? (
        <div className="flex h-72 items-center justify-center rounded-[24px] border border-orange-100 bg-white">
          <LoaderCircle className="animate-spin text-orange-500" size={32} />
        </div>
      ) : korinish === "jadval" ? (
        <div className="overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1480px] text-left">
              <thead className="bg-orange-50/70 text-xs font-black uppercase text-orange-600">
                <tr>
                  <th className="min-w-52 px-6 py-4">Nomi</th>
                  <th className="min-w-56 px-6 py-4">Joylashuv</th>
                  <th className="min-w-36 px-6 py-4">Ishlash vaqti</th>
                  <th className="min-w-48 px-6 py-4">Kim tomonidan yaratilgan</th>
                  <th className="min-w-40 px-6 py-4">Yaratilgan sana</th>
                  <th className="min-w-44 px-6 py-4">Mas'ul shaxs</th>
                  <th className="min-w-48 px-6 py-4">Mas'ul shaxs nomeri</th>
                  <th className="min-w-28 px-6 py-4">Status</th>
                  <th className="w-20 px-6 py-4 text-right">
                    <span className="sr-only">Amallar</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
          {omborlar.map((ombor) => (
            <tr
              key={ombor.id}
              onClick={() => void modalniOchish(ombor)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void modalniOchish(ombor);
                }
              }}
              tabIndex={0}
              className="cursor-pointer transition hover:bg-orange-50/50 focus:bg-orange-50/50 focus:outline-none"
              aria-label={`${ombor.name} omborini ochish`}
            >
              <td className="px-6 py-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                    <Warehouse size={20} />
                  </span>
                  <span className="truncate font-black text-gray-950">{ombor.name}</span>
                </div>
              </td>
              <td className="px-6 py-5 text-sm font-semibold text-gray-600">
                <p className="max-w-56 leading-5">{ombor.address || "—"}</p>
                {ombor.latitude != null && ombor.longitude != null && (
                  <p className="mt-1 flex items-start gap-1 text-xs font-bold text-slate-400">
                    <MapPin size={13} className="mt-0.5 shrink-0" />
                    <span>
                      {ombor.latitude},<br />
                      {ombor.longitude}
                    </span>
                  </p>
                )}
              </td>
              <td className="px-6 py-5 text-sm font-semibold leading-5 text-gray-600">
                {ombor.openingTime && ombor.closingTime ? (
                  <>
                    {ombor.openingTime} –<br />
                    {ombor.closingTime}
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-6 py-5 text-sm font-semibold text-gray-600">
                {ombor.createdBy?.fullName ??
                  ombor.createdBy?.username ??
                  ombor.createdBy?.name ??
                  xodimlar.find((xodim) => xodim.id === ombor.createdById)?.fullName ??
                  xodimlar.find((xodim) => xodim.id === ombor.createdById)?.username ??
                  "—"}
              </td>
              <td className="px-6 py-5 text-sm font-semibold text-gray-500">
                {sananiFormatlash(ombor.createdAt)}
              </td>
              <td className="px-6 py-5 text-sm font-semibold text-gray-600">
                {ombor.responsible?.fullName ??
                  ombor.responsible?.username ??
                  ombor.responsible?.name ??
                  xodimlar.find((xodim) => xodim.id === ombor.responsibleId)?.fullName ??
                  xodimlar.find((xodim) => xodim.id === ombor.responsibleId)?.username ??
                  "—"}
              </td>
              <td className="px-6 py-5 text-sm font-black text-gray-600">
                {ombor.responsible?.phone ??
                  xodimlar.find((xodim) => xodim.id === ombor.responsibleId)?.phone ??
                  "—"}
              </td>
              <td className="px-6 py-5 text-right">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                    ombor.isActive === false
                      ? "bg-gray-100 text-gray-500"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {ombor.isActive === false ? "Faol emas" : "Faol"}
                </span>
              </td>
              <td className="px-6 py-5">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void ochirish(ombor.id);
                    }}
                    onKeyDown={(event) => event.stopPropagation()}
                    disabled={amalBajarilmoqda}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-50"
                    aria-label={`${ombor.name} omborini o'chirish`}
                    title="O'chirish"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {omborlar.length === 0 && (
            <tr>
              <td colSpan={9} className="px-6 py-14 text-center">
                <Warehouse className="mx-auto text-orange-200" size={42} />
                <p className="mt-3 font-bold text-gray-500">Ombor mavjud emas</p>
                <p className="mt-1 text-sm text-gray-400">
                  “Ombor qo'shish” tugmasi orqali birinchi omborni yarating.
                </p>
              </td>
            </tr>
          )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {omborlar.map((ombor) => {
            const masul =
              ombor.responsible ?? xodimlar.find((xodim) => xodim.id === ombor.responsibleId);
            const filialNomi =
              ombor.branch?.name ??
              filiallar.find((filial) => filial.id === ombor.branchId)?.name;

            return (
              <article
                key={ombor.id}
                className="overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                      <Warehouse size={22} />
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        ombor.isActive === false
                          ? "bg-gray-100 text-gray-500"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {ombor.isActive === false ? "Faol emas" : "Faol"}
                    </span>
                  </div>

                  <h2 className="mt-4 truncate text-xl font-black text-slate-950">{ombor.name}</h2>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                    {ombor.address || "Manzil kiritilmagan"}
                  </p>

                  <div className="mt-4 space-y-2 text-sm text-slate-500">
                    {(ombor.latitude != null || ombor.longitude != null) && (
                      <p className="flex items-center gap-2">
                        <MapPin size={15} className="shrink-0 text-orange-500" />
                        <span className="truncate">
                          {ombor.latitude ?? "—"}, {ombor.longitude ?? "—"}
                        </span>
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <Clock3 size={15} className="shrink-0 text-orange-500" />
                      <span>
                        {ombor.openingTime || "—"} — {ombor.closingTime || "—"}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <UserRound size={15} className="shrink-0 text-orange-500" />
                      <span className="truncate">
                        {masul?.fullName ?? masul?.username ?? masul?.name ?? "Biriktirilmagan"}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <CalendarDays size={15} className="shrink-0 text-orange-500" />
                      <span>{sananiFormatlash(ombor.createdAt)}</span>
                    </p>
                    {filialNomi && (
                      <p className="truncate text-xs font-bold text-slate-400">
                        Filial: {filialNomi}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 border-t border-orange-100 bg-orange-50/40 p-4">
                  <button
                    type="button"
                    onClick={() => void modalniOchish(ombor)}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-orange-600 ring-1 ring-orange-100 transition hover:bg-orange-100"
                  >
                    <Edit3 size={16} />
                    Tahrirlash
                  </button>
                  <button
                    type="button"
                    onClick={() => void ochirish(ombor.id)}
                    disabled={amalBajarilmoqda}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-50"
                    aria-label={`${ombor.name} omborini o'chirish`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}

          {omborlar.length === 0 && (
            <div className="col-span-full rounded-[24px] border border-dashed border-orange-200 bg-white px-6 py-14 text-center">
              <Warehouse className="mx-auto text-orange-200" size={42} />
              <p className="mt-3 font-bold text-gray-500">Ombor mavjud emas</p>
              <p className="mt-1 text-sm text-gray-400">
                “Ombor qo'shish” tugmasi orqali birinchi omborni yarating.
              </p>
            </div>
          )}
        </div>
      )}

      {modalOchiq && (
        <AppModal>
          <form
            onSubmit={saqlash}
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[34px] border border-orange-100 bg-[#FFF9F1] shadow-2xl"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-orange-100 px-6 py-5 sm:px-8">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                  <Warehouse size={25} />
                </span>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-gray-950">
                    {tahrirOmbor ? "Omborni tahrirlash" : "Yangi ombor"}
                  </h2>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-orange-500">
                    {tahrirOmbor ? "Tahrirlash" : "Yangi"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOchiq(false)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-orange-200 hover:text-orange-600"
                aria-label="Modalni yopish"
              >
                <X size={22} />
              </button>
            </header>

            <div className="scrollbar-hidden flex-1 overflow-y-auto px-5 py-5 sm:px-8">
              {xatolik && (
                <div className="mb-4 flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
                  <span>{xatolik}</span>
                  <button type="button" onClick={xatolikniTozalash} className="text-xs uppercase">
                    Yopish
                  </button>
                </div>
              )}
              {formaXatosi && (
                <div className="mb-4 flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
                  <span>{formaXatosi}</span>
                  <button type="button" onClick={() => setFormaXatosi(null)} className="text-xs uppercase">
                    Yopish
                  </button>
                </div>
              )}

              <section className="rounded-[26px] border border-orange-100 bg-white p-5 sm:p-6">
                <h3 className="border-b border-orange-100 pb-4 text-sm font-black uppercase tracking-wide text-slate-600">
                  Ombor haqida
                </h3>

                <div className="mt-5 space-y-5">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-500">Ombor nomi *</span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      autoFocus
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      placeholder="Masalan: Markaziy ombor"
                    />
                  </label>

                  <div className="grid gap-2">
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-500">
                      <MapPin size={16} className="text-orange-500" />
                      Joylashuvi (GPS)
                    </span>
                    <div className="flex gap-2">
                      <input
                        value={gps}
                        onChange={(event) => setGps(event.target.value)}
                        className="h-14 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        placeholder="41.311081, 69.240562"
                      />
                      <button
                        type="button"
                        onClick={gpsniAniqlash}
                        disabled={gpsYuklanmoqda}
                        className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 text-sm font-black uppercase text-orange-600 transition hover:bg-orange-100 disabled:opacity-50"
                      >
                        {gpsYuklanmoqda ? (
                          <LoaderCircle size={17} className="animate-spin" />
                        ) : (
                          <MapPin size={17} />
                        )}
                        Aniqlash
                      </button>
                    </div>
                  </div>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-500">Manzil</span>
                    <input
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      placeholder="Toshkent, Chilonzor tumani, 12-uy"
                    />
                  </label>

                  <div className="grid gap-2">
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-500">
                      <Clock3 size={16} className="text-orange-500" />
                      Ishlash vaqti
                    </span>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <input
                        type="time"
                        value={openingTime}
                        onChange={(event) => setOpeningTime(event.target.value)}
                        className="h-14 min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                      <span className="text-slate-400">—</span>
                      <input
                        type="time"
                        value={closingTime}
                        onChange={(event) => setClosingTime(event.target.value)}
                        className="h-14 min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </div>
                  </div>

                  <label className="grid gap-2">
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-500">
                      <CalendarDays size={16} className="text-orange-500" />
                      Yaratilgan sana
                    </span>
                    <input
                      type="date"
                      value={yaratilganSana}
                      readOnly
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-700 outline-none"
                    />
                  </label>

                  <div className="rounded-[22px] border border-orange-100 bg-orange-50/40 p-4">
                    <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-600">
                      <UserRound size={17} className="text-orange-500" />
                      Mas'ul shaxs
                    </div>
                    <div className="mt-4 space-y-4">
                      <label className="grid gap-2">
                        <span className="text-sm font-bold text-slate-500">Ismi</span>
                        <select
                          value={responsibleId}
                          onChange={(event) => setResponsibleId(event.target.value)}
                          className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        >
                          <option value="">Mas'ul shaxsni tanlang</option>
                          {xodimlar.map((xodim) => (
                            <option key={xodim.id} value={xodim.id}>
                              {xodim.fullName ?? xodim.username ?? xodim.name ?? xodim.id}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="flex items-center gap-2 text-sm font-bold text-slate-500">
                          <Phone size={16} className="text-orange-500" />
                          Tel nomer
                        </span>
                        <input
                          value={tanlanganMasul?.phone ?? ""}
                          readOnly
                          className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                          placeholder="+998 90 123 45 67"
                        />
                      </label>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(event) => setIsActive(event.target.checked)}
                      className="h-5 w-5 accent-orange-500"
                    />
                    Ombor faol
                  </label>
                </div>
              </section>
            </div>

            <footer className="flex shrink-0 justify-end gap-3 border-t border-orange-100 bg-[#FFF9F1]/95 px-6 py-4 backdrop-blur sm:px-8">
              <button
                type="button"
                onClick={() => setModalOchiq(false)}
                className="h-12 rounded-2xl bg-slate-100 px-6 text-sm font-black text-slate-600 transition hover:bg-slate-200"
              >
                Bekor qilish
              </button>
              <button
                disabled={amalBajarilmoqda || !name.trim()}
                className="inline-flex h-12 min-w-32 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-7 text-sm font-black text-white shadow-[0_12px_28px_rgba(249,115,22,.24)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {amalBajarilmoqda && <LoaderCircle size={16} className="animate-spin" />}
                Saqlash
              </button>
            </footer>
          </form>
        </AppModal>
      )}
    </div>
  );
}
