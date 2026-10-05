import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Building2, Crown, Gem, Pencil, Plus, Sparkles, Tag, Trash2, Users, type LucideIcon } from "lucide-react";
import LoadingState from "@/Components/common/LoadingState";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { platformApi } from "@/api/platformApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { PlatformTarif, PlatformTarifSaqlash, TarifTuri } from "@/types/platform";
import { AdminModal, AmalTugmasi, BoshHolat, Belgi, Maydon, SahifaSarlavhasi, ShakldaTugmalar, XatoXabari, asosiyTugmaKlass, inputKlass, type BelgiRangi } from "./AdminUI";

const TARIF_TURLARI: TarifTuri[] = ["FREE", "BASIC", "PRO", "ENTERPRISE"];

// Har bir tarif turiga o'z rangi va ikonkasi beriladi — kartalar bir qarashda ajralib turadi.
const TUR_USLUBI: Record<TarifTuri, { ikonka: LucideIcon; tile: string; belgi: BelgiRangi }> = {
  FREE: { ikonka: Tag, tile: "from-slate-400 to-slate-600 shadow-slate-500/30", belgi: "kulrang" },
  BASIC: { ikonka: Sparkles, tile: "from-sky-400 to-blue-600 shadow-blue-500/30", belgi: "kok" },
  PRO: { ikonka: Gem, tile: "from-violet-400 to-purple-600 shadow-violet-500/30", belgi: "binafsha" },
  ENTERPRISE: { ikonka: Crown, tile: "from-amber-400 to-orange-600 shadow-orange-500/30", belgi: "sariq" },
};

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
    <AdminModal sarlavha={t(tahrir ? "tariflar.tahrirlash" : "tariflar.yangi")} onYopish={onYopish} ikonka={<Tag size={20} />}>
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
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-orange-200">
          <input type="checkbox" checked={faol} onChange={(event) => setFaol(event.target.checked)} className="h-4 w-4 accent-orange-500" />
          {t("common.faol")}
        </label>
        {xato && <XatoXabari matn={xato} />}
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
        ikonka={<Tag size={26} />}
        amallar={
          <button type="button" onClick={() => setModal({ tahrir: null })} className={asosiyTugmaKlass}>
            <Plus size={17} /> {t("tariflar.yangi")}
          </button>
        }
      />

      {xatolik && <XatoXabari matn={xatolik} />}

      {yuklanmoqda && royxat.length === 0 ? (
        <LoadingState matn={t("common.yuklanmoqda")} ikonka={<Tag size={24} />} />
      ) : royxat.length === 0 ? (
        <BoshHolat matn={t("tariflar.bosh")} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {royxat.map((tarif) => {
            const uslub = TUR_USLUBI[tarif.type] ?? TUR_USLUBI.BASIC;
            const Ikonka = uslub.ikonka;
            const narx = Number(tarif.monthlyPrice ?? 0);
            return (
              <article
                key={tarif.id}
                className={`group flex flex-col rounded-3xl border bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,.05)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,.12)] ${
                  tarif.isActive ? "border-slate-200/70" : "border-dashed border-slate-300 opacity-75"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${uslub.tile}`}>
                    <Ikonka size={22} />
                  </span>
                  <div className="flex items-center gap-2">
                    <Belgi rang={uslub.belgi} nuqta={false}>
                      {tarif.type}
                    </Belgi>
                    {tarif.isActive ? <Belgi rang="yashil">{t("common.faol")}</Belgi> : <Belgi rang="kulrang">{t("common.nofaol")}</Belgi>}
                  </div>
                </div>

                <h3 className="mt-5 truncate text-xl font-black text-slate-900">{tarif.name}</h3>
                <p className="mt-2 flex items-baseline gap-1.5">
                  {narx > 0 ? (
                    <>
                      <span className="text-[30px] font-black leading-none tracking-tight text-slate-900">{narx.toLocaleString("uz-UZ")}</span>
                      <span className="text-sm font-semibold text-slate-400">
                        {t("tariflar.som")} / {t("tariflar.oyiga")}
                      </span>
                    </>
                  ) : (
                    <span className="text-[30px] font-black leading-none tracking-tight text-emerald-600">{t("tariflar.bepul")}</span>
                  )}
                </p>

                <dl className="mt-5 space-y-2.5 border-t border-slate-100 pt-5">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                      <Building2 size={16} />
                    </span>
                    <dt className="flex-1 text-slate-500">{t("tariflar.maxFilial")}</dt>
                    <dd className="font-black text-slate-900">{limitMatni(tarif.maxBranches, t("tariflar.cheksiz"))}</dd>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                      <Users size={16} />
                    </span>
                    <dt className="flex-1 text-slate-500">{t("tariflar.maxFoydalanuvchi")}</dt>
                    <dd className="font-black text-slate-900">{limitMatni(tarif.maxUsers, t("tariflar.cheksiz"))}</dd>
                  </div>
                </dl>

                <div className="mt-6 flex items-center justify-end gap-1 border-t border-slate-100 pt-4">
                  <AmalTugmasi matn={t("common.tahrirlash")} ikonka={<Pencil size={16} />} onClick={() => setModal({ tahrir: tarif })} />
                  <AmalTugmasi matn={t("common.ochirish")} ikonka={<Trash2 size={16} />} ohang="qizil" onClick={() => setOchirishTasdiq(tarif)} />
                </div>
              </article>
            );
          })}
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
