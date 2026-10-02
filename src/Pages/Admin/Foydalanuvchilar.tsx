import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { KeyRound, Lock, Search, ShieldCheck, Unlock, Users } from "lucide-react";
import LoadingState from "@/Components/common/LoadingState";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { platformApi } from "@/api/platformApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useAuthProfileStore } from "@/store/authProfileStore";
import type { PlatformFoydalanuvchi, PlatformKompaniya } from "@/types/platform";
import { AdminModal, AmalTugmasi, BoshHolat, Belgi, Maydon, SahifaSarlavhasi, ShakldaTugmalar, inputKlass, jadvalKlass, tdKlass, thKlass } from "./AdminUI";

const ROLLAR = ["DIRECTOR", "ADMIN", "STOREKEEPER", "CASHIER"] as const;

function ParolModali({ foydalanuvchi, onYopish }: { foydalanuvchi: PlatformFoydalanuvchi; onYopish: () => void }) {
  const { t } = useTranslation("admin");
  const [parol, setParol] = useState("");
  const [bajarilmoqda, setBajarilmoqda] = useState(false);
  const [xato, setXato] = useState("");

  async function yuborish(event: FormEvent) {
    event.preventDefault();
    setXato("");
    if (parol.length < 6) return setXato(t("foydalanuvchilar.parolQisqa"));
    setBajarilmoqda(true);
    try {
      await platformApi.foydalanuvchilar.parolniTiklash(foydalanuvchi.id, parol);
      onYopish();
    } catch (error) {
      // 403 errors.user.cannot_modify_self / cannot_modify_staff
      setXato(getApiErrorMessage(error));
    } finally {
      setBajarilmoqda(false);
    }
  }

  return (
    <AdminModal sarlavha={t("foydalanuvchilar.parolniTiklash")} tavsif={`${foydalanuvchi.fullName || foydalanuvchi.username} (@${foydalanuvchi.username})`} onYopish={onYopish}>
      <form onSubmit={(event) => void yuborish(event)} className="space-y-4">
        <Maydon nom={t("foydalanuvchilar.yangiParol")} izoh={t("foydalanuvchilar.parolIzoh")}>
          <input autoFocus type="password" value={parol} onChange={(event) => setParol(event.target.value)} autoComplete="new-password" className={inputKlass} />
        </Maydon>
        {xato && <p className="rounded-2xl bg-red-50 p-3.5 text-sm font-bold text-red-600">{xato}</p>}
        <ShakldaTugmalar ortga={{ matn: t("common.bekor"), onClick: onYopish }} bajarilmoqda={bajarilmoqda} saqlashMatni={t("common.saqlash")} />
      </form>
    </AdminModal>
  );
}

export default function AdminFoydalanuvchilar() {
  const { t } = useTranslation("admin");
  const [params, setParams] = useSearchParams();
  const joriyProfil = useAuthProfileStore((state) => state.profil);
  const workspaceId = params.get("workspaceId") ?? "";
  const [role, setRole] = useState("");
  const [qidiruv, setQidiruv] = useState("");
  const [qidiruvSoz, setQidiruvSoz] = useState("");
  const [royxat, setRoyxat] = useState<PlatformFoydalanuvchi[]>([]);
  const [kompaniyalar, setKompaniyalar] = useState<PlatformKompaniya[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xatolik, setXatolik] = useState("");
  const [holatTasdiq, setHolatTasdiq] = useState<PlatformFoydalanuvchi | null>(null);
  const [parolModal, setParolModal] = useState<PlatformFoydalanuvchi | null>(null);

  // Kompaniyalar ro'yxati filtr va jadvaldagi kompaniya nomlari uchun.
  useEffect(() => {
    platformApi.kompaniyalar.royxat().then(setKompaniyalar).catch(() => setKompaniyalar([]));
  }, []);

  // Qidiruv matni yozilib bo'lgach (400 ms) so'rov yuboriladi.
  useEffect(() => {
    const timer = window.setTimeout(() => setQidiruvSoz(qidiruv.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [qidiruv]);

  const yuklash = useCallback(async () => {
    setYuklanmoqda(true);
    setXatolik("");
    try {
      setRoyxat(await platformApi.foydalanuvchilar.royxat({ workspaceId: workspaceId || undefined, search: qidiruvSoz || undefined, role: role || undefined }));
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setYuklanmoqda(false);
    }
  }, [qidiruvSoz, role, workspaceId]);

  useEffect(() => {
    void yuklash();
  }, [yuklash]);

  const kompaniyaNomi = (foydalanuvchi: PlatformFoydalanuvchi) =>
    foydalanuvchi.workspace?.name ?? kompaniyalar.find((item) => item.id === foydalanuvchi.workspaceId)?.name ?? (foydalanuvchi.isStaff ? t("foydalanuvchilar.platforma") : "—");

  async function holatniOzgartirish(foydalanuvchi: PlatformFoydalanuvchi) {
    try {
      await platformApi.foydalanuvchilar.holat(foydalanuvchi.id, !foydalanuvchi.isActive);
      return true;
    } catch {
      return false;
    } finally {
      await yuklash();
    }
  }

  return (
    <div className="space-y-6">
      <SahifaSarlavhasi eyebrow={t("eyebrow")} sarlavha={t("foydalanuvchilar.title")} tavsif={t("foydalanuvchilar.subtitle")} />

      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="flex h-11 w-full items-center gap-3 rounded-2xl border border-orange-100 bg-white px-4 shadow-sm focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-50 lg:max-w-md">
          <Search size={18} className="text-orange-400" />
          <input value={qidiruv} onChange={(event) => setQidiruv(event.target.value)} placeholder={t("foydalanuvchilar.qidiruv")} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none" />
        </label>
        <select
          value={workspaceId}
          onChange={(event) => {
            const yangi = new URLSearchParams(params);
            if (event.target.value) yangi.set("workspaceId", event.target.value);
            else yangi.delete("workspaceId");
            setParams(yangi, { replace: true });
          }}
          aria-label={t("foydalanuvchilar.kompaniya")}
          className={`${inputKlass} lg:max-w-[280px]`}
        >
          <option value="">{t("foydalanuvchilar.barchaKompaniyalar")}</option>
          {kompaniyalar.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select value={role} onChange={(event) => setRole(event.target.value)} aria-label={t("foydalanuvchilar.rol")} className={`${inputKlass} lg:max-w-[200px]`}>
          <option value="">{t("foydalanuvchilar.barchaRollar")}</option>
          {ROLLAR.map((item) => (
            <option key={item} value={item}>
              {t(`foydalanuvchilar.rollar.${item}`)}
            </option>
          ))}
        </select>
      </div>

      {xatolik && <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">{xatolik}</div>}

      {yuklanmoqda && royxat.length === 0 ? (
        <LoadingState matn={t("common.yuklanmoqda")} ikonka={<Users size={24} />} />
      ) : royxat.length === 0 ? (
        <BoshHolat matn={t("foydalanuvchilar.bosh")} />
      ) : (
        <div className={jadvalKlass}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-[#FFF7F0]">
                <tr>
                  <th className={thKlass}>{t("foydalanuvchilar.foydalanuvchi")}</th>
                  <th className={thKlass}>{t("foydalanuvchilar.rol")}</th>
                  <th className={thKlass}>{t("foydalanuvchilar.kompaniya")}</th>
                  <th className={thKlass}>{t("common.holati")}</th>
                  <th className="w-32 px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100/70">
                {royxat.map((foydalanuvchi) => {
                  const oziMi = foydalanuvchi.id === joriyProfil?.id;
                  // Super adminlar (shu jumladan o'zi) ustida amal bajarib bo'lmaydi — backend 403 qaytaradi.
                  const cheklangan = oziMi || Boolean(foydalanuvchi.isStaff);
                  return (
                    <tr key={foydalanuvchi.id} className="transition hover:bg-orange-50/40">
                      <td className={tdKlass}>
                        <p className="flex items-center gap-2 font-black text-slate-900">
                          {foydalanuvchi.fullName || foydalanuvchi.username}
                          {foydalanuvchi.isStaff && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-600 ring-1 ring-violet-100">
                              <ShieldCheck size={11} /> {t("foydalanuvchilar.superAdmin")}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-400">@{foydalanuvchi.username}</p>
                      </td>
                      <td className={tdKlass}>{foydalanuvchi.role ? t(`foydalanuvchilar.rollar.${foydalanuvchi.role}`, { defaultValue: foydalanuvchi.role }) : "—"}</td>
                      <td className={tdKlass}>{kompaniyaNomi(foydalanuvchi)}</td>
                      <td className={tdKlass}>{foydalanuvchi.isActive ? <Belgi rang="yashil">{t("common.faol")}</Belgi> : <Belgi rang="qizil">{t("foydalanuvchilar.bloklangan")}</Belgi>}</td>
                      <td className={`${tdKlass} text-right`}>
                        <div className="flex items-center justify-end gap-2">
                          <AmalTugmasi matn={t("foydalanuvchilar.parolniTiklash")} ikonka={<KeyRound size={16} />} disabled={cheklangan} onClick={() => setParolModal(foydalanuvchi)} />
                          <AmalTugmasi
                            matn={t(foydalanuvchi.isActive ? "foydalanuvchilar.bloklash" : "foydalanuvchilar.blokdanChiqarish")}
                            ikonka={foydalanuvchi.isActive ? <Lock size={16} /> : <Unlock size={16} />}
                            ohang={foydalanuvchi.isActive ? "qizil" : "yashil"}
                            disabled={cheklangan}
                            onClick={() => setHolatTasdiq(foydalanuvchi)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {parolModal && <ParolModali foydalanuvchi={parolModal} onYopish={() => setParolModal(null)} />}

      {holatTasdiq && (
        <TasdiqlashOynasi
          ikonka={holatTasdiq.isActive ? <Lock size={24} /> : <Unlock size={24} />}
          ohang={holatTasdiq.isActive ? "qizil" : "yashil"}
          sarlavha={t(holatTasdiq.isActive ? "foydalanuvchilar.bloklashSarlavha" : "foydalanuvchilar.blokdanSarlavha")}
          nom={`${holatTasdiq.fullName || holatTasdiq.username} (@${holatTasdiq.username})`}
          tavsif={t(holatTasdiq.isActive ? "foydalanuvchilar.bloklashTavsif" : "foydalanuvchilar.blokdanTavsif")}
          ortgaMatni={t("common.bekor")}
          tasdiqMatni={t("common.ha")}
          jarayonMatni={t("common.bajarilmoqda")}
          onTasdiq={() => holatniOzgartirish(holatTasdiq)}
          onYopish={() => setHolatTasdiq(null)}
        />
      )}
    </div>
  );
}
