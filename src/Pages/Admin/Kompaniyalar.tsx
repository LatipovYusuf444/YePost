import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, Pencil, Plus, Power, PowerOff, Search, Trash2, Users } from "lucide-react";
import LoadingState from "@/Components/common/LoadingState";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { platformApi } from "@/api/platformApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { PlatformKompaniya, PlatformKompaniyaYaratish } from "@/types/platform";
import { AdminModal, AmalTugmasi, BoshHolat, Belgi, Maydon, SahifaSarlavhasi, ShakldaTugmalar, inputKlass, jadvalKlass, tdKlass, thKlass } from "./AdminUI";

const VAQT_ZONALARI = ["Asia/Tashkent", "Asia/Samarkand", "Asia/Almaty", "Asia/Bishkek", "Europe/Moscow", "UTC"];

function slugYasash(matn: string) {
  return matn
    .toLowerCase()
    .replace(/[ʻʼ'’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type FormaHolati = {
  name: string;
  slug: string;
  slugQolda: boolean;
  timezone: string;
  isActive: boolean;
  direktorYaratish: boolean;
  username: string;
  password: string;
  fullName: string;
};

const BOSH_FORMA: FormaHolati = {
  name: "",
  slug: "",
  slugQolda: false,
  timezone: "Asia/Tashkent",
  isActive: true,
  direktorYaratish: true,
  username: "",
  password: "",
  fullName: "",
};

function KompaniyaModali({ tahrir, onYopish, onSaqlandi }: { tahrir: PlatformKompaniya | null; onYopish: () => void; onSaqlandi: () => void }) {
  const { t } = useTranslation("admin");
  const [forma, setForma] = useState<FormaHolati>(() =>
    tahrir ? { ...BOSH_FORMA, name: tahrir.name, slug: tahrir.slug, slugQolda: true, timezone: tahrir.timezone || "Asia/Tashkent", isActive: tahrir.isActive, direktorYaratish: false } : BOSH_FORMA
  );
  const [bajarilmoqda, setBajarilmoqda] = useState(false);
  const [xato, setXato] = useState("");

  function ozgartirish<K extends keyof FormaHolati>(kalit: K, qiymat: FormaHolati[K]) {
    setForma((joriy) => ({ ...joriy, [kalit]: qiymat }));
  }

  async function yuborish(event: FormEvent) {
    event.preventDefault();
    setXato("");
    if (!forma.name.trim()) return setXato(t("kompaniyalar.xatolar.nomKerak"));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(forma.slug)) return setXato(t("kompaniyalar.xatolar.slugNotogri"));
    const direktor = !tahrir && forma.direktorYaratish;
    if (direktor) {
      if (forma.username.trim().length < 3) return setXato(t("kompaniyalar.xatolar.loginKerak"));
      if (forma.password.length < 6) return setXato(t("kompaniyalar.xatolar.parolQisqa"));
    }
    setBajarilmoqda(true);
    try {
      if (tahrir) {
        await platformApi.kompaniyalar.yangilash(tahrir.id, { name: forma.name.trim(), slug: forma.slug, timezone: forma.timezone });
      } else {
        const body: PlatformKompaniyaYaratish = {
          name: forma.name.trim(),
          slug: forma.slug,
          timezone: forma.timezone,
          isActive: forma.isActive,
          ...(direktor ? { director: { username: forma.username.trim(), password: forma.password, ...(forma.fullName.trim() ? { fullName: forma.fullName.trim() } : {}) } } : {}),
        };
        await platformApi.kompaniyalar.yaratish(body);
      }
      onSaqlandi();
      onYopish();
    } catch (error) {
      // Masalan, 409 errors.user.username_exists: kompaniya ham yaratilmaydi.
      setXato(getApiErrorMessage(error));
    } finally {
      setBajarilmoqda(false);
    }
  }

  return (
    <AdminModal sarlavha={t(tahrir ? "kompaniyalar.tahrirlash" : "kompaniyalar.yangi")} onYopish={onYopish} kenglik="max-w-xl">
      <form onSubmit={(event) => void yuborish(event)} className="space-y-4">
        <Maydon nom={t("kompaniyalar.nomi")}>
          <input
            autoFocus
            value={forma.name}
            onChange={(event) => {
              const nom = event.target.value;
              setForma((joriy) => ({ ...joriy, name: nom, slug: joriy.slugQolda ? joriy.slug : slugYasash(nom) }));
            }}
            placeholder={t("kompaniyalar.nomiPlaceholder")}
            className={inputKlass}
          />
        </Maydon>
        <div className="grid gap-4 sm:grid-cols-2">
          <Maydon nom="Slug" izoh={t("kompaniyalar.slugIzoh")}>
            <input
              value={forma.slug}
              onChange={(event) => setForma((joriy) => ({ ...joriy, slug: slugYasash(event.target.value), slugQolda: true }))}
              placeholder="my-company"
              className={inputKlass}
            />
          </Maydon>
          <Maydon nom={t("kompaniyalar.vaqtZonasi")}>
            <select value={forma.timezone} onChange={(event) => ozgartirish("timezone", event.target.value)} className={inputKlass}>
              {[...new Set([forma.timezone, ...VAQT_ZONALARI])].map((zona) => (
                <option key={zona} value={zona}>
                  {zona}
                </option>
              ))}
            </select>
          </Maydon>
        </div>

        {!tahrir && (
          <>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={forma.isActive} onChange={(event) => ozgartirish("isActive", event.target.checked)} className="h-4 w-4 accent-orange-500" />
              {t("kompaniyalar.faolBoshlash")}
            </label>

            <div className="rounded-2xl border border-orange-100 p-4">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-black text-slate-800">
                <input type="checkbox" checked={forma.direktorYaratish} onChange={(event) => ozgartirish("direktorYaratish", event.target.checked)} className="h-4 w-4 accent-orange-500" />
                {t("kompaniyalar.direktorYaratish")}
              </label>
              <p className="mt-1 pl-7 text-xs font-medium text-slate-400">{t("kompaniyalar.direktorIzoh")}</p>
              {forma.direktorYaratish && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Maydon nom={t("kompaniyalar.login")}>
                    <input value={forma.username} onChange={(event) => ozgartirish("username", event.target.value.replace(/\s/g, ""))} autoComplete="off" className={inputKlass} />
                  </Maydon>
                  <Maydon nom={t("kompaniyalar.parol")} izoh={t("kompaniyalar.parolIzoh")}>
                    <input type="password" value={forma.password} onChange={(event) => ozgartirish("password", event.target.value)} autoComplete="new-password" className={inputKlass} />
                  </Maydon>
                  <div className="sm:col-span-2">
                    <Maydon nom={t("kompaniyalar.toliqIsm")}>
                      <input value={forma.fullName} onChange={(event) => ozgartirish("fullName", event.target.value)} className={inputKlass} />
                    </Maydon>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {xato && <p className="rounded-2xl bg-red-50 p-3.5 text-sm font-bold text-red-600">{xato}</p>}
        <ShakldaTugmalar ortga={{ matn: t("common.bekor"), onClick: onYopish }} bajarilmoqda={bajarilmoqda} saqlashMatni={t(tahrir ? "common.saqlash" : "kompaniyalar.yaratish")} />
      </form>
    </AdminModal>
  );
}

export default function AdminKompaniyalar() {
  const { t } = useTranslation("admin");
  const [royxat, setRoyxat] = useState<PlatformKompaniya[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xatolik, setXatolik] = useState("");
  const [qidiruv, setQidiruv] = useState("");
  const [modal, setModal] = useState<{ tahrir: PlatformKompaniya | null } | null>(null);
  const [holatTasdiq, setHolatTasdiq] = useState<PlatformKompaniya | null>(null);
  const [ochirishTasdiq, setOchirishTasdiq] = useState<PlatformKompaniya | null>(null);

  const yuklash = useCallback(async () => {
    setYuklanmoqda(true);
    setXatolik("");
    try {
      setRoyxat(await platformApi.kompaniyalar.royxat());
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setYuklanmoqda(false);
    }
  }, []);

  useEffect(() => {
    void yuklash();
  }, [yuklash]);

  const korinadigan = useMemo(() => {
    const soz = qidiruv.trim().toLowerCase();
    return soz ? royxat.filter((item) => `${item.name} ${item.slug}`.toLowerCase().includes(soz)) : royxat;
  }, [qidiruv, royxat]);

  async function holatniOzgartirish(kompaniya: PlatformKompaniya) {
    try {
      await platformApi.kompaniyalar.holat(kompaniya.id, !kompaniya.isActive);
      return true;
    } catch {
      return false;
    } finally {
      await yuklash();
    }
  }

  async function ochirish(kompaniya: PlatformKompaniya) {
    try {
      await platformApi.kompaniyalar.ochirish(kompaniya.id);
      return true;
    } catch {
      return false;
    } finally {
      await yuklash();
    }
  }

  return (
    <div className="space-y-6">
      <SahifaSarlavhasi
        eyebrow={t("eyebrow")}
        sarlavha={t("kompaniyalar.title")}
        tavsif={t("kompaniyalar.subtitle")}
        amallar={
          <button type="button" onClick={() => setModal({ tahrir: null })} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-md shadow-orange-200 transition hover:bg-orange-600">
            <Plus size={17} /> {t("kompaniyalar.yangi")}
          </button>
        }
      />

      <label className="flex h-12 w-full items-center gap-3 rounded-2xl border border-orange-100 bg-white px-4 shadow-sm focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-50 sm:max-w-md">
        <Search size={18} className="text-orange-400" />
        <input value={qidiruv} onChange={(event) => setQidiruv(event.target.value)} placeholder={t("kompaniyalar.qidiruv")} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none" />
      </label>

      {xatolik && <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">{xatolik}</div>}

      {yuklanmoqda && royxat.length === 0 ? (
        <LoadingState matn={t("common.yuklanmoqda")} ikonka={<Building2 size={24} />} />
      ) : korinadigan.length === 0 ? (
        <BoshHolat matn={t("kompaniyalar.bosh")} />
      ) : (
        <div className={jadvalKlass}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-[#FFF7F0]">
                <tr>
                  <th className={thKlass}>{t("kompaniyalar.nomi")}</th>
                  <th className={thKlass}>{t("kompaniyalar.vaqtZonasi")}</th>
                  <th className={thKlass}>{t("common.holati")}</th>
                  <th className={thKlass}>{t("common.yaratilgan")}</th>
                  <th className="w-52 px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100/70">
                {korinadigan.map((kompaniya) => (
                  <tr key={kompaniya.id} className="transition hover:bg-orange-50/40">
                    <td className={tdKlass}>
                      <p className="font-black text-slate-900">{kompaniya.name}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-400">{kompaniya.slug}</p>
                    </td>
                    <td className={tdKlass}>{kompaniya.timezone || "—"}</td>
                    <td className={tdKlass}>{kompaniya.isActive ? <Belgi rang="yashil">{t("common.faol")}</Belgi> : <Belgi rang="kulrang">{t("common.nofaol")}</Belgi>}</td>
                    <td className={tdKlass}>{kompaniya.createdAt ? new Date(kompaniya.createdAt).toLocaleDateString("uz-UZ") : "—"}</td>
                    <td className={`${tdKlass} text-right`}>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/foydalanuvchilar?workspaceId=${kompaniya.id}`}
                          title={t("kompaniyalar.foydalanuvchilar")}
                          aria-label={t("kompaniyalar.foydalanuvchilar")}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition hover:bg-blue-600 hover:text-white"
                        >
                          <Users size={16} />
                        </Link>
                        <AmalTugmasi matn={t("common.tahrirlash")} ikonka={<Pencil size={16} />} onClick={() => setModal({ tahrir: kompaniya })} />
                        <AmalTugmasi
                          matn={t(kompaniya.isActive ? "kompaniyalar.ochirib" : "kompaniyalar.yoqish")}
                          ikonka={kompaniya.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                          ohang={kompaniya.isActive ? "sariq" : "yashil"}
                          onClick={() => setHolatTasdiq(kompaniya)}
                        />
                        <AmalTugmasi matn={t("common.ochirish")} ikonka={<Trash2 size={16} />} ohang="qizil" onClick={() => setOchirishTasdiq(kompaniya)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && <KompaniyaModali tahrir={modal.tahrir} onYopish={() => setModal(null)} onSaqlandi={() => void yuklash()} />}

      {holatTasdiq && (
        <TasdiqlashOynasi
          ikonka={holatTasdiq.isActive ? <PowerOff size={24} /> : <Power size={24} />}
          ohang={holatTasdiq.isActive ? "sariq" : "yashil"}
          sarlavha={t(holatTasdiq.isActive ? "kompaniyalar.ochirishSarlavha" : "kompaniyalar.yoqishSarlavha")}
          nom={holatTasdiq.name}
          tavsif={t(holatTasdiq.isActive ? "kompaniyalar.ochirishTavsif" : "kompaniyalar.yoqishTavsif")}
          ortgaMatni={t("common.bekor")}
          tasdiqMatni={t("common.ha")}
          jarayonMatni={t("common.bajarilmoqda")}
          onTasdiq={() => holatniOzgartirish(holatTasdiq)}
          onYopish={() => setHolatTasdiq(null)}
        />
      )}

      {ochirishTasdiq && (
        <TasdiqlashOynasi
          ikonka={<Trash2 size={24} />}
          sarlavha={t("kompaniyalar.ochirishSarlavhaButunlay")}
          nom={ochirishTasdiq.name}
          tavsif={t("kompaniyalar.ochirishButunlayTavsif")}
          ortgaMatni={t("common.bekor")}
          tasdiqMatni={t("common.ochirish")}
          jarayonMatni={t("common.bajarilmoqda")}
          onTasdiq={() => ochirish(ochirishTasdiq)}
          onYopish={() => setOchirishTasdiq(null)}
        />
      )}
    </div>
  );
}
