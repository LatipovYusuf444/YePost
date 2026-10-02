import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Ban, CalendarPlus, CreditCard, Pencil, Plus } from "lucide-react";
import LoadingState from "@/Components/common/LoadingState";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { platformApi } from "@/api/platformApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { mahalliySanaKaliti } from "@/lib/sanaKaliti";
import type { ObunaDavri, ObunaHolati, PlatformKompaniya, PlatformObuna, PlatformTarif } from "@/types/platform";
import { AdminModal, AmalTugmasi, BoshHolat, Belgi, Maydon, SahifaSarlavhasi, ShakldaTugmalar, inputKlass, jadvalKlass, tdKlass, thKlass } from "./AdminUI";

const DAVRLAR: ObunaDavri[] = ["MONTHLY", "QUARTERLY", "ANNUAL"];
const HOLATLAR: ObunaHolati[] = ["TRIAL", "ACTIVE", "EXPIRED", "CANCELLED"];
const DAVR_OYLARI: Record<ObunaDavri, number> = { MONTHLY: 1, QUARTERLY: 3, ANNUAL: 12 };
const HOLAT_RANGI: Record<ObunaHolati, "kok" | "yashil" | "sariq" | "qizil"> = { TRIAL: "kok", ACTIVE: "yashil", EXPIRED: "sariq", CANCELLED: "qizil" };

// Berilgan sanaga davr uzunligini (1/3/12 oy) qo'shadi; natija YYYY-MM-DD.
function davrQoshish(sana: string, davr: ObunaDavri) {
  const boshlanish = sana ? new Date(`${sana.slice(0, 10)}T00:00:00`) : new Date();
  const natija = new Date(boshlanish);
  natija.setMonth(natija.getMonth() + DAVR_OYLARI[davr]);
  return mahalliySanaKaliti(natija);
}

function sanaKorinishi(qiymat?: string) {
  const kalit = mahalliySanaKaliti(qiymat);
  return kalit ? kalit.split("-").reverse().join(".") : "—";
}

function ObunaModali({ tahrir, kompaniyalar, tariflar, onYopish, onSaqlandi }: { tahrir: PlatformObuna | null; kompaniyalar: PlatformKompaniya[]; tariflar: PlatformTarif[]; onYopish: () => void; onSaqlandi: () => void }) {
  const { t } = useTranslation("admin");
  const bugun = mahalliySanaKaliti(new Date());
  const [workspaceId, setWorkspaceId] = useState(tahrir?.workspaceId ?? "");
  const [tariffId, setTariffId] = useState(tahrir?.tariffId ?? tariflar.find((item) => item.isActive)?.id ?? "");
  const [davr, setDavr] = useState<ObunaDavri>(tahrir?.period ?? "MONTHLY");
  const [holat, setHolat] = useState<ObunaHolati>(tahrir?.status ?? "ACTIVE");
  const [boshlanish, setBoshlanish] = useState(tahrir ? mahalliySanaKaliti(tahrir.startDate) : bugun);
  const [tugash, setTugash] = useState(tahrir ? mahalliySanaKaliti(tahrir.endDate) : davrQoshish(bugun, "MONTHLY"));
  const [tugashQolda, setTugashQolda] = useState(Boolean(tahrir));
  const [bajarilmoqda, setBajarilmoqda] = useState(false);
  const [xato, setXato] = useState("");

  async function yuborish(event: FormEvent) {
    event.preventDefault();
    setXato("");
    if (!tahrir && !workspaceId) return setXato(t("obunalar.xatolar.kompaniyaKerak"));
    if (!tariffId) return setXato(t("obunalar.xatolar.tarifKerak"));
    if (!boshlanish || !tugash || tugash < boshlanish) return setXato(t("obunalar.xatolar.sanaNotogri"));
    setBajarilmoqda(true);
    try {
      if (tahrir) await platformApi.obunalar.yangilash(tahrir.id, { tariffId, period: davr, status: holat, endDate: tugash });
      else await platformApi.obunalar.yaratish({ workspaceId, tariffId, period: davr, status: holat, startDate: boshlanish, endDate: tugash });
      onSaqlandi();
      onYopish();
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setBajarilmoqda(false);
    }
  }

  return (
    <AdminModal sarlavha={t(tahrir ? "obunalar.tahrirlash" : "obunalar.yangi")} onYopish={onYopish} kenglik="max-w-xl">
      <form onSubmit={(event) => void yuborish(event)} className="space-y-4">
        <Maydon nom={t("obunalar.kompaniya")}>
          <select value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)} disabled={Boolean(tahrir)} className={inputKlass}>
            <option value="">{t("obunalar.kompaniyaTanlang")}</option>
            {kompaniyalar.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Maydon>
        <div className="grid gap-4 sm:grid-cols-2">
          <Maydon nom={t("obunalar.tarif")}>
            <select value={tariffId} onChange={(event) => setTariffId(event.target.value)} className={inputKlass}>
              <option value="">{t("obunalar.tarifTanlang")}</option>
              {tariflar.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.type})
                </option>
              ))}
            </select>
          </Maydon>
          <Maydon nom={t("obunalar.davr")}>
            <select
              value={davr}
              onChange={(event) => {
                const yangi = event.target.value as ObunaDavri;
                setDavr(yangi);
                if (!tugashQolda) setTugash(davrQoshish(boshlanish, yangi));
              }}
              className={inputKlass}
            >
              {DAVRLAR.map((item) => (
                <option key={item} value={item}>
                  {t(`obunalar.davrlar.${item}`)}
                </option>
              ))}
            </select>
          </Maydon>
          <Maydon nom={t("obunalar.holati")}>
            <select value={holat} onChange={(event) => setHolat(event.target.value as ObunaHolati)} className={inputKlass}>
              {HOLATLAR.map((item) => (
                <option key={item} value={item}>
                  {t(`obunalar.holatlar.${item}`)}
                </option>
              ))}
            </select>
          </Maydon>
          <div />
          <Maydon nom={t("obunalar.boshlanish")}>
            <input
              type="date"
              value={boshlanish}
              disabled={Boolean(tahrir)}
              onChange={(event) => {
                setBoshlanish(event.target.value);
                if (!tugashQolda && event.target.value) setTugash(davrQoshish(event.target.value, davr));
              }}
              className={inputKlass}
            />
          </Maydon>
          <Maydon nom={t("obunalar.tugash")}>
            <input
              type="date"
              value={tugash}
              onChange={(event) => {
                setTugash(event.target.value);
                setTugashQolda(true);
              }}
              className={inputKlass}
            />
          </Maydon>
        </div>
        {xato && <p className="rounded-2xl bg-red-50 p-3.5 text-sm font-bold text-red-600">{xato}</p>}
        <ShakldaTugmalar ortga={{ matn: t("common.bekor"), onClick: onYopish }} bajarilmoqda={bajarilmoqda} saqlashMatni={t("common.saqlash")} />
      </form>
    </AdminModal>
  );
}

export default function AdminObunalar() {
  const { t } = useTranslation("admin");
  const [obunalar, setObunalar] = useState<PlatformObuna[]>([]);
  const [kompaniyalar, setKompaniyalar] = useState<PlatformKompaniya[]>([]);
  const [tariflar, setTariflar] = useState<PlatformTarif[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xatolik, setXatolik] = useState("");
  const [holatFiltri, setHolatFiltri] = useState("ALL");
  const [kompaniyaFiltri, setKompaniyaFiltri] = useState("ALL");
  const [modal, setModal] = useState<{ tahrir: PlatformObuna | null } | null>(null);
  const [uzaytirish, setUzaytirish] = useState<PlatformObuna | null>(null);
  const [bekorTasdiq, setBekorTasdiq] = useState<PlatformObuna | null>(null);

  const yuklash = useCallback(async () => {
    setYuklanmoqda(true);
    setXatolik("");
    try {
      const [obunalarRoyxati, kompaniyalarRoyxati, tariflarRoyxati] = await Promise.all([
        platformApi.obunalar.royxat(),
        platformApi.kompaniyalar.royxat(),
        platformApi.tariflar.royxat(),
      ]);
      setObunalar(obunalarRoyxati);
      setKompaniyalar(kompaniyalarRoyxati);
      setTariflar(tariflarRoyxati);
    } catch (error) {
      setXatolik(getApiErrorMessage(error));
    } finally {
      setYuklanmoqda(false);
    }
  }, []);

  useEffect(() => {
    void yuklash();
  }, [yuklash]);

  const kompaniyaNomi = useMemo(() => new Map(kompaniyalar.map((item) => [item.id, item.name])), [kompaniyalar]);
  const tarifNomi = useMemo(() => new Map(tariflar.map((item) => [item.id, item.name])), [tariflar]);

  const korinadigan = useMemo(
    () =>
      obunalar.filter(
        (item) => (holatFiltri === "ALL" || item.status === holatFiltri) && (kompaniyaFiltri === "ALL" || item.workspaceId === kompaniyaFiltri)
      ),
    [holatFiltri, kompaniyaFiltri, obunalar]
  );

  // Uzaytirish: tugash sanasidan (o'tib ketgan bo'lsa bugundan) boshlab bir davr qo'shiladi va obuna faollashadi.
  async function uzaytirishniBajarish(obuna: PlatformObuna) {
    const bugun = mahalliySanaKaliti(new Date());
    const tugash = mahalliySanaKaliti(obuna.endDate);
    const asos = tugash > bugun ? tugash : bugun;
    try {
      await platformApi.obunalar.yangilash(obuna.id, { endDate: davrQoshish(asos, obuna.period), status: "ACTIVE" });
      return true;
    } catch {
      return false;
    } finally {
      await yuklash();
    }
  }

  async function bekorQilish(obuna: PlatformObuna) {
    try {
      await platformApi.obunalar.yangilash(obuna.id, { status: "CANCELLED" });
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
        sarlavha={t("obunalar.title")}
        tavsif={t("obunalar.subtitle")}
        amallar={
          <button type="button" onClick={() => setModal({ tahrir: null })} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-md shadow-orange-200 transition hover:bg-orange-600">
            <Plus size={17} /> {t("obunalar.yangi")}
          </button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <select value={holatFiltri} onChange={(event) => setHolatFiltri(event.target.value)} aria-label={t("obunalar.holati")} className={`${inputKlass} sm:max-w-[220px]`}>
          <option value="ALL">{t("obunalar.barchaHolatlar")}</option>
          {HOLATLAR.map((item) => (
            <option key={item} value={item}>
              {t(`obunalar.holatlar.${item}`)}
            </option>
          ))}
        </select>
        <select value={kompaniyaFiltri} onChange={(event) => setKompaniyaFiltri(event.target.value)} aria-label={t("obunalar.kompaniya")} className={`${inputKlass} sm:max-w-[280px]`}>
          <option value="ALL">{t("obunalar.barchaKompaniyalar")}</option>
          {kompaniyalar.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {xatolik && <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">{xatolik}</div>}

      {yuklanmoqda && obunalar.length === 0 ? (
        <LoadingState matn={t("common.yuklanmoqda")} ikonka={<CreditCard size={24} />} />
      ) : korinadigan.length === 0 ? (
        <BoshHolat matn={t("obunalar.bosh")} />
      ) : (
        <div className={jadvalKlass}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-[#FFF7F0]">
                <tr>
                  <th className={thKlass}>{t("obunalar.kompaniya")}</th>
                  <th className={thKlass}>{t("obunalar.tarif")}</th>
                  <th className={thKlass}>{t("obunalar.davr")}</th>
                  <th className={thKlass}>{t("obunalar.boshlanish")}</th>
                  <th className={thKlass}>{t("obunalar.tugash")}</th>
                  <th className={thKlass}>{t("obunalar.holati")}</th>
                  <th className="w-40 px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100/70">
                {korinadigan.map((obuna) => (
                  <tr key={obuna.id} className="transition hover:bg-orange-50/40">
                    <td className={`${tdKlass} font-black text-slate-900`}>{obuna.workspace?.name ?? kompaniyaNomi.get(obuna.workspaceId) ?? obuna.workspaceId}</td>
                    <td className={tdKlass}>{obuna.tariff?.name ?? tarifNomi.get(obuna.tariffId) ?? "—"}</td>
                    <td className={tdKlass}>{t(`obunalar.davrlar.${obuna.period}`, { defaultValue: obuna.period })}</td>
                    <td className={tdKlass}>{sanaKorinishi(obuna.startDate)}</td>
                    <td className={tdKlass}>{sanaKorinishi(obuna.endDate)}</td>
                    <td className={tdKlass}>
                      <Belgi rang={HOLAT_RANGI[obuna.status] ?? "kulrang"}>{t(`obunalar.holatlar.${obuna.status}`, { defaultValue: obuna.status })}</Belgi>
                    </td>
                    <td className={`${tdKlass} text-right`}>
                      <div className="flex items-center justify-end gap-2">
                        <AmalTugmasi matn={t("obunalar.uzaytirish")} ikonka={<CalendarPlus size={16} />} ohang="yashil" onClick={() => setUzaytirish(obuna)} />
                        <AmalTugmasi matn={t("common.tahrirlash")} ikonka={<Pencil size={16} />} onClick={() => setModal({ tahrir: obuna })} />
                        <AmalTugmasi matn={t("obunalar.bekorQilish")} ikonka={<Ban size={16} />} ohang="sariq" disabled={obuna.status === "CANCELLED"} onClick={() => setBekorTasdiq(obuna)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && <ObunaModali tahrir={modal.tahrir} kompaniyalar={kompaniyalar} tariflar={tariflar} onYopish={() => setModal(null)} onSaqlandi={() => void yuklash()} />}

      {uzaytirish && (
        <TasdiqlashOynasi
          ikonka={<CalendarPlus size={24} />}
          ohang="yashil"
          sarlavha={t("obunalar.uzaytirishSarlavha")}
          nom={uzaytirish.workspace?.name ?? kompaniyaNomi.get(uzaytirish.workspaceId) ?? uzaytirish.workspaceId}
          tavsif={t("obunalar.uzaytirishTavsif", { davr: t(`obunalar.davrlar.${uzaytirish.period}`, { defaultValue: uzaytirish.period }).toLowerCase() })}
          ortgaMatni={t("common.bekor")}
          tasdiqMatni={t("obunalar.uzaytirish")}
          jarayonMatni={t("common.bajarilmoqda")}
          onTasdiq={() => uzaytirishniBajarish(uzaytirish)}
          onYopish={() => setUzaytirish(null)}
        />
      )}

      {bekorTasdiq && (
        <TasdiqlashOynasi
          ikonka={<Ban size={24} />}
          ohang="sariq"
          sarlavha={t("obunalar.bekorSarlavha")}
          nom={bekorTasdiq.workspace?.name ?? kompaniyaNomi.get(bekorTasdiq.workspaceId) ?? bekorTasdiq.workspaceId}
          tavsif={t("obunalar.bekorTavsif")}
          ortgaMatni={t("common.bekor")}
          tasdiqMatni={t("obunalar.bekorQilish")}
          jarayonMatni={t("common.bajarilmoqda")}
          onTasdiq={() => bekorQilish(bekorTasdiq)}
          onYopish={() => setBekorTasdiq(null)}
        />
      )}
    </div>
  );
}
