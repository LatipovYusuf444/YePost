import AppSelect from "@/Components/ui/AppSelect";
import { useMemo, useState, type FormEvent } from "react";
import {
  Edit3,
  KeyRound,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useAccountStore } from "@/store/accountStore";
import type { AccountVakolati, VakolatKodi } from "@/types/account";

const vakolatMatnlari: Record<
  VakolatKodi,
  { nom: string; izoh: string }
> = {
  DELETE: {
    nom: "Ma'lumotlarni o'chirish",
    izoh: "Ruxsat etilgan bo'limlarda o'chirish amallarini bajaradi.",
  },
  REPORTS: {
    nom: "Hisobotlarni ko'rish",
    izoh: "Savdo, kassa va boshqaruv hisobotlarini ochadi.",
  },
  EXPENSE: {
    nom: "Xarajat kiritish",
    izoh: "Kassa va moliyaviy xarajatlarni ro'yxatga oladi.",
  },
  CASH_IN: {
    nom: "Kassaga kirim qilish",
    izoh: "Kassaga qo'shimcha pul kirimini amalga oshiradi.",
  },
  RETURN_CANCEL: {
    nom: "Qaytarishni bekor qilish",
    izoh: "Tasdiqlangan mahsulot qaytarishlarini bekor qiladi.",
  },
};

const vakolatKodlari = Object.keys(vakolatMatnlari) as VakolatKodi[];

export default function Ruxsatlar() {
  const store = useAccountStore();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<AccountVakolati | null>(null);
  const [userId, setUserId] = useState("");
  const [code, setCode] = useState<VakolatKodi>("REPORTS");
  const [isActive, setIsActive] = useState(true);

  const mavjudKodlar = useMemo(
    () =>
      new Set(
        store.vakolatlar
          .filter((item) => item.userId === userId)
          .map((item) => item.code)
      ),
    [store.vakolatlar, userId]
  );

  function yangi() {
    const birinchiFoydalanuvchi = store.foydalanuvchilar[0]?.id ?? "";
    setEditing(null);
    setUserId(birinchiFoydalanuvchi);
    const ishlatilmagan =
      vakolatKodlari.find(
        (item) =>
          !store.vakolatlar.some(
            (vakolat) =>
              vakolat.userId === birinchiFoydalanuvchi && vakolat.code === item
          )
      ) ?? "REPORTS";
    setCode(ishlatilmagan);
    setIsActive(true);
    store.xatolikniTozalash();
    setModal(true);
  }

  async function tahrirlash(id: string) {
    store.xatolikniTozalash();
    const item = await store.vakolatOlish(id);
    if (!item) return;
    setEditing(item);
    setUserId(item.userId);
    setCode(item.code as VakolatKodi);
    setIsActive(item.isActive);
    setModal(true);
  }

  async function saqlash(event: FormEvent) {
    event.preventDefault();
    if (!userId) return;
    const ok = editing
      ? await store.vakolatYangilash(editing.id, { isActive })
      : await store.vakolatYaratish({ userId, code, isActive });
    if (ok) setModal(false);
  }

  async function ochirish(item: AccountVakolati) {
    const matn = vakolatMatnlari[item.code as VakolatKodi]?.nom ?? item.code;
    if (!window.confirm(`"${matn}" vakolatini olib tashlaysizmi?`)) return;
    await store.vakolatOchirish(item.id);
  }

  const barchaBand = Boolean(
    userId &&
      vakolatKodlari.every((item) => mavjudKodlar.has(item))
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            Maxsus ruxsatlar
          </p>
          <h2 className="text-2xl font-black">Foydalanuvchi vakolatlari</h2>
          <p className="mt-1 text-sm text-gray-500">
            Rolga qo'shimcha ravishda xavfli yoki moliyaviy amallarga ruxsat bering.
          </p>
        </div>
        <button
          onClick={yangi}
          disabled={store.foydalanuvchilar.length === 0}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white disabled:opacity-50"
        >
          <Plus size={18} />
          Vakolat qo'shish
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {store.foydalanuvchilar.map((foydalanuvchi) => {
          const xodimVakolatlari = store.vakolatlar.filter(
            (item) => item.userId === foydalanuvchi.id
          );
          const faolSoni = xodimVakolatlari.filter((item) => item.isActive).length;
          return (
            <article
              key={foydalanuvchi.id}
              className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <UserRound size={21} />
                  </div>
                  <div>
                    <h3 className="font-black">
                      {foydalanuvchi.fullName || foydalanuvchi.username}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      @{foydalanuvchi.username} / {foydalanuvchi.role}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
                  {faolSoni}/{vakolatKodlari.length} faol
                </span>
              </div>

              <div className="mt-4 grid gap-2">
                {vakolatKodlari.map((kod) => {
                  const vakolat = xodimVakolatlari.find((item) => item.code === kod);
                  const matn = vakolatMatnlari[kod];
                  const faol = Boolean(vakolat?.isActive);
                  return (
                    <div
                      key={kod}
                      className={`grid gap-3 rounded-2xl px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center ${
                        faol ? "bg-orange-50" : "bg-gray-50"
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <ShieldCheck
                          size={18}
                          className={faol ? "mt-0.5 shrink-0 text-orange-500" : "mt-0.5 shrink-0 text-gray-300"}
                        />
                        <div className="min-w-0">
                          <p className="font-black text-gray-800">{matn.nom}</p>
                          <p className="mt-0.5 text-xs font-semibold text-gray-400">
                            {matn.izoh}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                          faol
                            ? "bg-emerald-50 text-emerald-600"
                            : vakolat
                              ? "bg-gray-200 text-gray-500"
                              : "bg-white text-gray-400"
                        }`}
                      >
                        {faol ? "Faol" : vakolat ? "Faol emas" : "Berilmagan"}
                      </span>
                      {vakolat ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => void tahrirlash(vakolat.id)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-bold text-orange-600"
                          >
                            <Edit3 size={14} />
                            Tahrirlash
                          </button>
                          <button
                            onClick={() => void ochirish(vakolat)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500"
                            aria-label="Vakolatni olib tashlash"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditing(null);
                            setUserId(foydalanuvchi.id);
                            setCode(kod);
                            setIsActive(true);
                            store.xatolikniTozalash();
                            setModal(true);
                          }}
                          className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 text-sm font-bold text-white"
                        >
                          <Plus size={14} />
                          Qo'shish
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
        {store.foydalanuvchilar.length === 0 && (
          <div className="col-span-full rounded-[26px] border border-dashed border-orange-200 bg-orange-50/30 p-12 text-center">
            <KeyRound className="mx-auto text-orange-300" size={34} />
            <h3 className="mt-3 font-black">Xodimlar yo'q</h3>
            <p className="mt-1 text-sm text-gray-500">
              Avval xodim qo'shing, keyin vakolatlarni belgilang.
            </p>
          </div>
        )}
      </div>

      {modal && (
        <AppModal>
          <form
            onSubmit={saqlash}
            className="w-full max-w-lg rounded-[30px] bg-white p-7 shadow-2xl"
          >
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
              Maxsus ruxsat
            </p>
            <h2 className="mt-1 text-2xl font-black">
              {editing ? "Vakolatni tahrirlash" : "Yangi vakolat"}
            </h2>
            {store.xatolik && (
              <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">
                {store.xatolik}
              </div>
            )}
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-bold">
                Foydalanuvchi *
                <AppSelect
                  value={userId}
                  onChange={(event) => {
                    const yangiUserId = event.target.value;
                    setUserId(yangiUserId);
                    const yangiKod =
                      vakolatKodlari.find(
                        (item) =>
                          !store.vakolatlar.some(
                            (vakolat) =>
                              vakolat.userId === yangiUserId &&
                              vakolat.code === item
                          )
                      ) ?? "REPORTS";
                    setCode(yangiKod);
                  }}
                  disabled={Boolean(editing)}
                  className="mt-2 h-12 w-full rounded-2xl border bg-white px-4 font-medium disabled:bg-gray-50"
                >
                  {store.foydalanuvchilar.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.fullName || item.username} (@{item.username})
                    </option>
                  ))}
                </AppSelect>
              </label>
              <label className="block text-sm font-bold">
                Vakolat turi *
                <AppSelect
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value as VakolatKodi)
                  }
                  disabled={Boolean(editing)}
                  className="mt-2 h-12 w-full rounded-2xl border bg-white px-4 font-medium disabled:bg-gray-50"
                >
                  {vakolatKodlari.map((item) => (
                    <option
                      key={item}
                      value={item}
                      disabled={!editing && mavjudKodlar.has(item)}
                    >
                      {vakolatMatnlari[item].nom}
                      {!editing && mavjudKodlar.has(item) ? " вЂ” mavjud" : ""}
                    </option>
                  ))}
                </AppSelect>
              </label>
              <div className="rounded-2xl bg-orange-50 p-4 text-sm text-orange-800">
                {vakolatMatnlari[code].izoh}
              </div>
              {barchaBand && !editing && (
                <div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-700">
                  Bu foydalanuvchiga barcha vakolatlar allaqachon biriktirilgan.
                </div>
              )}
              <label className="flex items-center gap-3 font-bold">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-5 w-5 accent-orange-500"
                />
                Vakolat faol
              </label>
            </div>
            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="h-11 rounded-2xl bg-gray-100 px-5 font-bold text-gray-600"
              >
                Bekor qilish
              </button>
              <button
                disabled={
                  store.amalBajarilmoqda ||
                  !userId ||
                  (!editing && (mavjudKodlar.has(code) || barchaBand))
                }
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white disabled:opacity-50"
              >
                {store.amalBajarilmoqda && (
                  <LoaderCircle size={17} className="animate-spin" />
                )}
                Saqlash
              </button>
            </div>
          </form>
        </AppModal>
      )}
    </section>
  );
}

