import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import LoadingState from "@/Components/common/LoadingState";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { platformApi } from "@/api/platformApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { PlatformTarif, PlatformTarifSaqlash, TarifTuri } from "@/types/platform";
import { AdminModal, AmalTugmasi, BoshHolat, Belgi, Maydon, SahifaSarlavhasi, ShakldaTugmalar, inputKlass, jadvalKlass, tdKlass, thKlass } from "./AdminUI";

const TARIF_TURLARI: TarifTuri[] = ["FREE", "BASIC", "PRO", "ENTERPRISE"];

function limitMatni(qiymat: number | null | undefined, cheksiz: string) {
  return qiymat === null || qiymat === undefined ? cheksiz : String(qiymat);
}

function TarifModali({ tahrir, onYopish, onSaqlandi }: { tahrir: PlatformTarif | null; onYopish: () => void; onSaqlandi: () => void }) {
  const { t } = useTranslation("admin");
  const [turi, setTuri] = useState<TarifTuri>(tahrir?.type ?? "BASIC");
  const [nomi, setNomi] = useState(tahrir?.name ?? "");
  // Bo'sh qoldirilgan limit — cheksiz (backendga null yuboriladi).
  const [maxBranches, setMaxBranches] = useState(tahrir?.maxBranches?.toString() ?? "");
  const [maxUsers, setMaxUsers] = useState(tahrir?.maxUsers?.toString() ?? "");
  const [narx, setNarx] = useState(tahrir ? String(Number(tahrir.monthlyPrice ?? 0)) : "0");
  const [faol, setFaol] = useState(tahrir?.isActive ?? true);
  const [bajarilmoqda, setBajarilmoqda] = useState(false);
  const [xato, setXato] = useState("");

  async function yuborish(event: FormEvent) {
    event.preventDefault();
    setXato("");
    if (!nomi.trim()) return setXato(t("tariflar.xatolar.nomKerak"));
    const limit = (qiymat: string) => (qiymat.trim() === "" ? null : Number(qiymat));
    const filial = limit(maxBranches);
    const foydalanuvchi = limit(maxUsers);
    const oylik = Number(narx);
    if ([filial, foydalanuvchi].some((son) => son !== null && (!Number.isInteger(son) || son < 0)) || !Number.isFinite(oylik) || oylik < 0) {
      return setXato(t("tariflar.xatolar.qiymatNotogri"));
    }
    const body: PlatformTarifSaqlash = { name: nomi.trim(), maxBranches: filial, maxUsers: foydalanuvchi, monthlyPrice: oylik, isActive: faol, ...(tahrir ? {} : { type: turi }) };
    setBajarilmoqda(true);
    try {
      if (tahrir) await platformApi.tariflar.yangilash(tahrir.id, body);
      else await platformApi.tariflar.yaratish(body);
      onSaqlandi();
      onYopish();
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setBajarilmoqda(false);
    }
  }

  return (
    <AdminModal sarlavha={t(tahrir ? "tariflar.tahrirlash" : "tariflar.yangi")} onYopish={onYopish}>
      <form onSubmit={(event) => void yuborish(event)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Maydon nom={t("tariflar.turi")}>
            <select value={turi} onChange={(event) => setTuri(event.target.value as TarifTuri)} disabled={Boolean(tahrir)} className={inputKlass}>
              {TARIF_TURLARI.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Maydon>
          <Maydon nom={t("tariflar.nomi")}>
            <input autoFocus value={nomi} onChange={(event) => setNomi(event.target.value)} className={inputKlass} />
          </Maydon>
          <Maydon nom={t("tariflar.maxFilial")} izoh={t("tariflar.cheksizIzoh")}>
            <input type="number" min={0} value={maxBranches} onChange={(event) => setMaxBranches(event.target.value)} placeholder={t("tariflar.cheksiz")} className={inputKlass} />
          </Maydon>
          <Maydon nom={t("tariflar.maxFoydalanuvchi")} izoh={t("tariflar.cheksizIzoh")}>
            <input type="number" min={0} value={maxUsers} onChange={(event) => setMaxUsers(event.target.value)} placeholder={t("tariflar.cheksiz")} className={inputKlass} />
          </Maydon>
          <div className="sm:col-span-2">
            <Maydon nom={t("tariflar.oylikNarx")}>
              <input type="number" min={0} value={narx} onChange={(event) => setNarx(event.target.value)} className={inputKlass} />
            </Maydon>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
          <input type="checkbox" checked={faol} onChange={(event) => setFaol(event.target.checked)} className="h-4 w-4 accent-orange-500" />
          {t("common.faol")}
        </label>
        {xato && <p className="rounded-2xl bg-red-50 p-3.5 text-sm font-bold text-red-600">{xato}</p>}
        <ShakldaTugmalar ortga={{ matn: t("common.bekor"), onClick: onYopish }} bajarilmoqda={bajarilmoqda} saqlashMatni={t("common.saqlash")} />
      </form>
    </AdminModal>
  );
}

export default function AdminTariflar() {
  const { t } = useTranslation("admin");
  const [royxat, setRoyxat] = useState<PlatformTarif[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xatolik, setXatolik] = useState("");
  const [modal, setModal] = useState<{ tahrir: PlatformTarif | null } | null>(null);
  const [ochirishTasdiq, setOchirishTasdiq] = useState<PlatformTarif | null>(null);

  const yuklash = useCallback(async () => {
    setYuklanmoqda(true);
    setXatolik("");
    try {
      setRoyxat(await platformApi.tariflar.royxat());
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setYuklanmoqda(false);
    }
  }, []);

  useEffect(() => {
    void yuklash();
  }, [yuklash]);

  async function ochirish(tarif: PlatformTarif) {
    try {
      await platformApi.tariflar.ochirish(tarif.id);
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
        sarlavha={t("tariflar.title")}
        tavsif={t("tariflar.subtitle")}
        amallar={
          <button type="button" onClick={() => setModal({ tahrir: null })} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-md shadow-orange-200 transition hover:bg-orange-600">
            <Plus size={17} /> {t("tariflar.yangi")}
          </button>
        }
      />

      {xatolik && <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">{xatolik}</div>}

      {yuklanmoqda && royxat.length === 0 ? (
        <LoadingState matn={t("common.yuklanmoqda")} ikonka={<Tag size={24} />} />
      ) : royxat.length === 0 ? (
        <BoshHolat matn={t("tariflar.bosh")} />
      ) : (
        <div className={jadvalKlass}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-[#FFF7F0]">
                <tr>
                  <th className={thKlass}>{t("tariflar.nomi")}</th>
                  <th className={thKlass}>{t("tariflar.turi")}</th>
                  <th className={thKlass}>{t("tariflar.maxFilial")}</th>
                  <th className={thKlass}>{t("tariflar.maxFoydalanuvchi")}</th>
                  <th className={thKlass}>{t("tariflar.oylikNarx")}</th>
                  <th className={thKlass}>{t("common.holati")}</th>
                  <th className="w-28 px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100/70">
                {royxat.map((tarif) => (
                  <tr key={tarif.id} className="transition hover:bg-orange-50/40">
                    <td className={`${tdKlass} font-black text-slate-900`}>{tarif.name}</td>
                    <td className={tdKlass}>
                      <Belgi rang="kok">{tarif.type}</Belgi>
                    </td>
                    <td className={tdKlass}>{limitMatni(tarif.maxBranches, t("tariflar.cheksiz"))}</td>
                    <td className={tdKlass}>{limitMatni(tarif.maxUsers, t("tariflar.cheksiz"))}</td>
                    <td className={`${tdKlass} font-bold text-slate-900`}>{Number(tarif.monthlyPrice ?? 0).toLocaleString("uz-UZ")} so'm</td>
                    <td className={tdKlass}>{tarif.isActive ? <Belgi rang="yashil">{t("common.faol")}</Belgi> : <Belgi rang="kulrang">{t("common.nofaol")}</Belgi>}</td>
                    <td className={`${tdKlass} text-right`}>
                      <div className="flex items-center justify-end gap-2">
                        <AmalTugmasi matn={t("common.tahrirlash")} ikonka={<Pencil size={16} />} onClick={() => setModal({ tahrir: tarif })} />
                        <AmalTugmasi matn={t("common.ochirish")} ikonka={<Trash2 size={16} />} ohang="qizil" onClick={() => setOchirishTasdiq(tarif)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && <TarifModali tahrir={modal.tahrir} onYopish={() => setModal(null)} onSaqlandi={() => void yuklash()} />}

      {ochirishTasdiq && (
        <TasdiqlashOynasi
          ikonka={<Trash2 size={24} />}
          sarlavha={t("tariflar.ochirishSarlavha")}
          nom={ochirishTasdiq.name}
          tavsif={t("tariflar.ochirishTavsif")}
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
