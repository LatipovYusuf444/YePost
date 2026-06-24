import { useEffect, useState, type FormEvent } from "react";
import { Edit3, LoaderCircle, Plus, RefreshCw, Trash2, Warehouse } from "lucide-react";
import { useOmborStore } from "@/store/omborStore";
import type { Ombor } from "@/types/ombor";
import FiliallarBoshqaruvi from "./FiliallarBoshqaruvi";
import Kompaniyalar from "./Kompaniyalar";
import OrganizationTablari, { type OrganizationTab } from "./OrganizationTablari";

export default function Ombor() {
  const {
    omborlar,
    filiallar,
    yuklanmoqda,
    amalBajarilmoqda,
    xatolik,
    malumotlarniYuklash,
    omborYaratish,
    omborOlish,
    omborYangilash,
    omborOchirish,
    filialYaratish,
    xatolikniTozalash,
  } = useOmborStore();
  const [organizationTab, setOrganizationTab] = useState<OrganizationTab>("omborlar");
  const [modalOchiq, setModalOchiq] = useState(false);
  const [tahrirOmbor, setTahrirOmbor] = useState<Ombor | null>(null);
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [yangiFilialNomi, setYangiFilialNomi] = useState("");
  const [yangiFilialManzili, setYangiFilialManzili] = useState("");

  useEffect(() => {
    void malumotlarniYuklash();
  }, [malumotlarniYuklash]);

  async function modalniOchish(ombor?: Ombor) {
    xatolikniTozalash();
    const toliqOmbor = ombor ? await omborOlish(ombor.id) : null;
    if (ombor && !toliqOmbor) return;
    setTahrirOmbor(toliqOmbor);
    setName(toliqOmbor?.name ?? "");
    setBranchId(toliqOmbor?.branchId ?? "");
    setIsActive(toliqOmbor?.isActive ?? true);
    setYangiFilialNomi("");
    setYangiFilialManzili("");
    setModalOchiq(true);
  }

  async function saqlash(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    const data = {
      name: name.trim(),
      ...(branchId ? { branchId } : {}),
      isActive,
    };
    const muvaffaqiyatli = tahrirOmbor
      ? await omborYangilash(tahrirOmbor.id, data)
      : await omborYaratish(data);

    if (muvaffaqiyatli) setModalOchiq(false);
  }

  async function filialniYaratish() {
    if (!yangiFilialNomi.trim()) return;

    const filial = await filialYaratish({
      name: yangiFilialNomi.trim(),
      address: yangiFilialManzili.trim() || undefined,
      status: "ACTIVE",
    });

    if (filial) {
      setBranchId(filial.id);
      setYangiFilialNomi("");
      setYangiFilialManzili("");
    }
  }

  async function ochirish(id: string) {
    if (!window.confirm("Omborni o'chirasizmi? Bu soft delete orqali bajariladi.")) return;
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
            Ombor boshqaruvi
          </p>
          <h1 className="mt-1 text-3xl font-black text-gray-950">Omborlar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Omborlarni yaratish, tahrirlash va soft delete qilish.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void malumotlarniYuklash()}
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
        <div className="flex h-72 items-center justify-center rounded-2xl bg-white">
          <LoaderCircle className="animate-spin text-orange-500" size={32} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {omborlar.map((ombor) => (
            <article
              key={ombor.id}
              className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                  <Warehouse size={22} />
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    ombor.isActive === false
                      ? "bg-gray-100 text-gray-500"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {ombor.isActive === false ? "Faol emas" : "Faol"}
                </span>
              </div>
              <h2 className="mt-5 text-xl font-black text-gray-950">{ombor.name}</h2>
              <p className="mt-1 text-sm text-gray-400">
                Filial: {ombor.branch?.name ?? ombor.branchId ?? "Biriktirilmagan"}
              </p>
              <div className="mt-5 flex gap-2 border-t border-gray-100 pt-4">
                <button
                  onClick={() => void modalniOchish(ombor)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-50 py-2.5 text-sm font-bold text-orange-600"
                >
                  <Edit3 size={15} />
                  Tahrirlash
                </button>
                <button
                  onClick={() => void ochirish(ombor.id)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500"
                  aria-label="Omborni o'chirish"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
          {omborlar.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-orange-200 bg-white p-14 text-center">
              <Warehouse className="mx-auto text-orange-200" size={42} />
              <p className="mt-3 font-bold text-gray-500">Ombor mavjud emas</p>
              <p className="mt-1 text-sm text-gray-400">
                “Ombor qo'shish” tugmasi orqali birinchi real omborni yarating.
              </p>
            </div>
          )}
        </div>
      )}

      {modalOchiq && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950/55 p-4 backdrop-blur-sm">
          <form onSubmit={saqlash} className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black text-gray-950">
              {tahrirOmbor ? "Omborni tahrirlash" : "Yangi ombor"}
            </h2>
            <div className="mt-6 space-y-4">
              {xatolik && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-600">
                  {xatolik}
                </div>
              )}
              <label className="block space-y-2 text-sm font-bold text-gray-700">
                <span>Ombor nomi *</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-gray-200 px-4 outline-none focus:border-orange-400"
                  placeholder="Masalan: Markaziy ombor"
                />
              </label>
              <label className="block space-y-2 text-sm font-bold text-gray-700">
                <span>Filial</span>
                <select
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-gray-200 px-4 outline-none focus:border-orange-400"
                >
                  <option value="">Biriktirilmagan</option>
                  {filiallar.map((filial) => (
                    <option key={filial.id} value={filial.id}>
                      {filial.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                <p className="text-sm font-black text-orange-700">
                  Yangi filial yaratish
                </p>
                <div className="mt-3 space-y-3">
                  <input
                    value={yangiFilialNomi}
                    onChange={(event) => setYangiFilialNomi(event.target.value)}
                    className="h-11 w-full rounded-xl border border-orange-100 bg-white px-3"
                    placeholder="Masalan: Olmazor filiali"
                  />
                  <input
                    value={yangiFilialManzili}
                    onChange={(event) => setYangiFilialManzili(event.target.value)}
                    className="h-11 w-full rounded-xl border border-orange-100 bg-white px-3"
                    placeholder="Filial manzili"
                  />
                  <button
                    type="button"
                    onClick={() => void filialniYaratish()}
                    disabled={amalBajarilmoqda || !yangiFilialNomi.trim()}
                    className="h-10 rounded-xl bg-orange-500 px-4 text-sm font-black text-white disabled:opacity-50"
                  >
                    Filial yaratish va tanlash
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-3 text-sm font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-5 w-5 accent-orange-500"
                />
                Ombor faol
              </label>
            </div>
            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOchiq(false)}
                className="h-11 rounded-2xl bg-gray-100 px-5 text-sm font-bold text-gray-600"
              >
                Bekor qilish
              </button>
              <button
                disabled={amalBajarilmoqda}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white disabled:opacity-50"
              >
                {amalBajarilmoqda && <LoaderCircle size={16} className="animate-spin" />}
                Saqlash
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
