import AppSelect from "@/Components/ui/AppSelect";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Building2,
  Edit3,
  LoaderCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Truck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import { useMijozlarStore } from "@/store/mijozlarStore";
import { tolovSummasiniFormatlash } from "@/utils/tolovFormatters";
import type { Mijoz, MijozKompaniyasi, YetkazibBeruvchi } from "@/types/partner";

import ModalTablari from "@/Components/common/ModalTablari";
type Tab = "xaridorlar" | "kompaniyalar" | "yetkazib-beruvchilar";
type Partner = Mijoz | MijozKompaniyasi | YetkazibBeruvchi;

const tabIkonlar = {
  xaridorlar: UsersRound,
  kompaniyalar: Building2,
  "yetkazib-beruvchilar": Truck,
} as const;

export default function Xaridorlar() {
  const { t } = useTranslation("mijozlar");
  const store = useMijozlarStore();
  const yuklash = store.yuklash;
  const [tab, setTab] = useState<Tab>("xaridorlar");
  const [qidiruv, setQidiruv] = useState("");
  const [modal, setModal] = useState<Partner | "new" | null>(null);

  const tablar = (["xaridorlar", "kompaniyalar", "yetkazib-beruvchilar"] as const).map((id) => ({
    id,
    nom: t(`tabs.${id}`),
    icon: tabIkonlar[id],
  }));

  useEffect(() => {
    void yuklash();
  }, [yuklash]);

  const items = useMemo(() => {
    const all: Partner[] =
      tab === "xaridorlar"
        ? store.mijozlar
        : tab === "kompaniyalar"
          ? store.kompaniyalar
          : store.yetkazibBeruvchilar;
    const q = qidiruv.trim().toLowerCase();
    if (!q) return all;
    return all.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
  }, [qidiruv, store.kompaniyalar, store.mijozlar, store.yetkazibBeruvchilar, tab]);

  async function olish(item: Partner) {
    store.xatolikniTozalash();
    const toliq =
      tab === "xaridorlar"
        ? await store.mijozOlish(item.id)
        : tab === "kompaniyalar"
          ? await store.kompaniyaOlish(item.id)
          : await store.yetkazibBeruvchiOlish(item.id);
    if (toliq) setModal(toliq);
  }

  async function ochirish(item: Partner) {
    if (!window.confirm(t("deleteConfirm", { name: partnerNomi(item) }))) return;
    if (tab === "xaridorlar") await store.mijozOchirish(item.id);
    else if (tab === "kompaniyalar") await store.kompaniyaOchirish(item.id);
    else await store.yetkazibBeruvchiOchirish(item.id);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-500">
            {t("eyebrow")}
          </p>
          <h1 className="mt-1 text-3xl font-black">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("subtitle")}
          </p>
        </div>
        <button
          onClick={() => void yuklash()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 font-bold text-gray-600"
        >
          <RefreshCw size={17} />
          {t("refresh")}
        </button>
      </header>

      {store.xatolik && (
        <div className="flex justify-between rounded-2xl bg-red-50 p-4 font-bold text-red-600">
          <span>{store.xatolik}</span>
          <button onClick={store.xatolikniTozalash}>{t("close")}</button>
        </div>
      )}

      <ModalTablari
        tablar={tablar.map(({ id, nom, icon: Icon }) => ({ id, nom, icon: <Icon size={16} /> }))}
        faol={tab}
        onChange={(id) => setTab(id as typeof tab)}
      />

      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row">
          <label className="flex h-11 max-w-xl flex-1 items-center gap-2 rounded-2xl border bg-white px-4">
            <Search size={17} className="text-gray-400" />
            <input
              value={qidiruv}
              onChange={(e) => setQidiruv(e.target.value)}
              className="min-w-0 flex-1 outline-none"
              placeholder={t("searchPlaceholder")}
            />
          </label>
          <button
            onClick={() => setModal("new")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white"
          >
            <Plus size={17} />
            {t("addButton", { unit: t(`addUnit.${tab}`) })}
          </button>
        </div>

        {store.yuklanmoqda ? (
          <div className="flex h-72 items-center justify-center">
            <LoaderCircle className="animate-spin text-orange-500" size={34} />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  {tab === "xaridorlar" ? (
                    <UserRound size={23} />
                  ) : tab === "kompaniyalar" ? (
                    <Building2 size={23} />
                  ) : (
                    <Truck size={23} />
                  )}
                </div>
                <h2 className="mt-4 text-xl font-black">{partnerNomi(item)}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                  <Phone size={15} />
                  {"phone" in item && item.phone ? item.phone : t("noPhone")}
                </p>

                {tab === "xaridorlar" && (
                  <>
                    <p className="mt-2 text-sm text-gray-500">
                      {t("card.address", { value: (item as Mijoz).address || t("card.notEntered") })}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {t("card.company", {
                        value:
                          (item as Mijoz).company?.name ??
                          store.kompaniyalar.find((x) => x.id === (item as Mijoz).companyId)?.name ??
                          t("card.notAssigned"),
                      })}
                    </p>
                    <p className="mt-1 text-sm font-bold text-emerald-600">
                      {t("card.balance", { value: tolovSummasiniFormatlash((item as Mijoz).balance) })}
                    </p>
                  </>
                )}

                {tab === "kompaniyalar" && (
                  <p className="mt-2 text-sm text-gray-500">
                    {t("card.inn", { value: (item as MijozKompaniyasi).inn || t("card.notEntered") })}
                  </p>
                )}

                <div className="mt-5 grid grid-cols-[1fr_42px] gap-2 border-t pt-4">
                  <button
                    onClick={() => void olish(item)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-50 py-2.5 font-bold text-orange-600"
                  >
                    <Edit3 size={15} />
                    {t("card.edit")}
                  </button>
                  <button
                    onClick={() => void ochirish(item)}
                    className="flex items-center justify-center rounded-xl bg-red-50 text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}

            {items.length === 0 && (
              <div className="col-span-full rounded-[26px] border border-dashed border-orange-200 p-12 text-center text-gray-400">
                {t("empty")}
              </div>
            )}
          </div>
        )}
      </section>

      {modal && <PartnerModal tab={tab} item={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

function PartnerModal({
  tab,
  item,
  onClose,
}: {
  tab: Tab;
  item: Partner | "new";
  onClose: () => void;
}) {
  const { t } = useTranslation("mijozlar");
  const store = useMijozlarStore();
  const editing = item !== "new";

  const xaridor = editing && tab === "xaridorlar" ? (item as Mijoz) : null;
  const kompaniya = editing && tab === "kompaniyalar" ? (item as MijozKompaniyasi) : null;
  const yetkazibBeruvchi =
    editing && tab === "yetkazib-beruvchilar" ? (item as YetkazibBeruvchi) : null;

  // Xaridor maydonlari
  const [firstName, setFirstName] = useState(xaridor?.firstName ?? "");
  const [lastName, setLastName] = useState(xaridor?.lastName ?? "");
  const [middleName, setMiddleName] = useState(xaridor?.middleName ?? "");
  const [address, setAddress] = useState(xaridor?.address ?? "");
  const [telegramId, setTelegramId] = useState(xaridor?.telegramId ?? "");
  const [companyId, setCompanyId] = useState(xaridor?.companyId ?? "");

  // Kompaniya / yetkazib beruvchi maydonlari
  const [name, setName] = useState(kompaniya?.name ?? yetkazibBeruvchi?.name ?? "");
  const [inn, setInn] = useState(kompaniya?.inn ?? "");

  // Uchala tabda ham bor
  const [phone, setPhone] = useState(
    xaridor?.phone ?? kompaniya?.phone ?? yetkazibBeruvchi?.phone ?? ""
  );

  async function save(e: FormEvent) {
    e.preventDefault();
    let ok = false;

    if (tab === "xaridorlar") {
      // Familiya majburiy emas (backend uni ixtiyoriy qabul qiladi).
      if (!firstName.trim() || !phone.trim()) return;
      ok = await store.mijozSaqlash(editing ? item.id : null, {
        firstName: firstName.trim(),
        // Yangi mijozda bo'sh familiya yuborilmaydi; mavjud mijozda tozalansa "" yuboriladi.
        lastName: lastName.trim() || (xaridor?.lastName ? "" : undefined),
        middleName: middleName.trim() || undefined,
        phone: phone.trim(),
        address: address.trim() || undefined,
        telegramId: telegramId.trim() || undefined,
        companyId: companyId || undefined,
      });
    } else if (tab === "kompaniyalar") {
      if (!name.trim()) return;
      ok = await store.kompaniyaSaqlash(editing ? item.id : null, {
        name: name.trim(),
        inn: inn.trim() || undefined,
        phone: phone.trim() || undefined,
      });
    } else {
      if (!name.trim()) return;
      ok = await store.yetkazibBeruvchiSaqlash(editing ? item.id : null, {
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
    }

    if (ok) onClose();
  }

  const title = t(`modalTitles.${tab}.${editing ? "edit" : "new"}`);

  return (
    <AppModal>
      <form
        onSubmit={save}
        className="scrollbar-hidden max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-[30px] bg-white p-8 shadow-2xl"
      >
        <div className="flex justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-orange-500">
              {t("modal.eyebrow")}
            </p>
            <h2 className="text-2xl font-black">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 hover:bg-orange-500 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {store.xatolik && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-600">{store.xatolik}</div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {tab === "xaridorlar" ? (
            <>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input"
                placeholder={t("modal.placeholders.firstName")}
              />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input"
                placeholder={t("modal.placeholders.lastName")}
              />
              <input
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="input"
                placeholder={t("modal.placeholders.middleName")}
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder={t("modal.placeholders.phoneRequired")}
              />
              <input
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                className="input"
                placeholder={t("modal.placeholders.telegramId")}
              />
              <AppSelect
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="input"
              >
                <option value="">{t("modal.companyUnassigned")}</option>
                {store.kompaniyalar.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </AppSelect>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="min-h-24 rounded-2xl border p-4 sm:col-span-2"
                placeholder={t("modal.placeholders.address")}
              />
            </>
          ) : (
            <>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input sm:col-span-2"
                placeholder={t("modal.placeholders.nameRequired")}
              />
              {tab === "kompaniyalar" && (
                <input
                  value={inn}
                  onChange={(e) => setInn(e.target.value)}
                  className="input"
                  placeholder={t("modal.placeholders.inn")}
                />
              )}
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder={t("modal.placeholders.phone")}
              />
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-2xl bg-gray-100 px-5 font-bold"
          >
            {t("modal.cancel")}
          </button>
          <button
            disabled={store.amalBajarilmoqda}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-6 font-black text-white disabled:opacity-50"
          >
            {store.amalBajarilmoqda && <LoaderCircle size={16} className="animate-spin" />}
            {t("modal.save")}
          </button>
        </div>
      </form>
    </AppModal>
  );
}

function partnerNomi(item: Partner) {
  if ("firstName" in item)
    return [item.firstName, item.lastName, item.middleName].filter(Boolean).join(" ");
  return item.name;
}
