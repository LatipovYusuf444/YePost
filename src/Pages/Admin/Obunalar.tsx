import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Ban, CalendarPlus, CreditCard, Pencil, Plus } from "lucide-react";
import LoadingState from "@/Components/common/LoadingState";
import TasdiqlashOynasi from "@/Components/common/TasdiqlashOynasi";
import { platformApi } from "@/api/platformApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { mahalliySanaKaliti } from "@/lib/sanaKaliti";
import type { ObunaDavri, ObunaHolati, PlatformKompaniya, PlatformObuna, PlatformTarif } from "@/types/platform";
import { AdminModal, AmalTugmasi, Avatar, BoshHolat, Belgi, Maydon, SahifaSarlavhasi, ShakldaTugmalar, XatoXabari, asosiyTugmaKlass, inputKlass, jadvalKlass, tbodyKlass, tdKlass, theadKlass, thKlass, trKlass } from "./AdminUI";

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

// Tugashgacha necha kun qolgani (o'tib ketgan bo'lsa manfiy). Sana noto'g'ri bo'lsa null.
function kunQoldi(tugash?: string) {
  const kalit = mahalliySanaKaliti(tugash);
  if (!kalit) return null;
  const bugun = new Date(`${mahalliySanaKaliti(new Date())}T00:00:00`).getTime();
  return Math.round((new Date(`${kalit}T00:00:00`).getTime() - bugun) / 86_400_000);
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
    <AdminModal sarlavha={t(tahrir ? "obunalar.tahrirlash" : "obunalar.yangi")} onYopish={onYopish} kenglik="max-w-xl" ikonka={<CreditCard size={20} />}>
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
        {xato && <XatoXabari matn={xato} />}
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
        ikonka={<CreditCard size={26} />}
        amallar={
          <button type="button" onClick={() => setModal({ tahrir: null })} className={asosiyTugmaKlass}>
            <Plus size={17} /> {t("obunalar.yangi")}
          </button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label={t("obunalar.holati")} className="flex flex-wrap gap-2">
          {(["ALL", ...HOLATLAR] as const).map((kalit) => {
            const faol = holatFiltri === kalit;
            const soni = kalit === "ALL" ? obunalar.length : obunalar.filter((item) => item.status === kalit).length;
            return (
              <button
                key={kalit}
                type="button"
                role="tab"
                aria-selected={faol}
                onClick={() => setHolatFiltri(kalit)}
                className={`inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-bold transition ${
                  faol ? "bg-orange-500 text-white shadow-md shadow-orange-500/25" : "border border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50"
                }`}
              >
                {kalit === "ALL" ? t("obunalar.barchaHolatlar") : t(`obunalar.holatlar.${kalit}`)}
                <span className={`rounded-md px-1.5 py-0.5 text-xs font-black ${faol ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"}`}>{soni}</span>
              </button>
            );
          })}
        </div>
        <select value={kompaniyaFiltri} onChange={(event) => setKompaniyaFiltri(event.target.value)} aria-label={t("obunalar.kompaniya")} className={`${inputKlass} lg:max-w-[280px]`}>
          <option value="ALL">{t("obunalar.barchaKompaniyalar")}</option>
          {kompaniyalar.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {xatolik && <XatoXabari matn={xatolik} />}

      {yuklanmoqda && obunalar.length === 0 ? (
        <LoadingState matn={t("common.yuklanmoqda")} ikonka={<CreditCard size={24} />} />
      ) : korinadigan.length === 0 ? (
        <BoshHolat matn={t("obunalar.bosh")} />
      ) : (
        <div className={jadvalKlass}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className={theadKlass}>
                <tr>
                  <th className={thKlass}>{t("obunalar.kompaniya")}</th>
                  <th className={thKlass}>{t("obunalar.tarif")}</th>
                  <th className={thKlass}>{t("obunalar.davr")}</th>
                  <th className={thKlass}>
                    {t("obunalar.boshlanish")} → {t("obunalar.tugash")}
                  </th>
                  <th className={thKlass}>{t("obunalar.holati")}</th>
                  <th className="w-40 px-5 py-4" />
                </tr>
              </thead>
              <tbody className={tbodyKlass}>
                {korinadigan.map((obuna) => {
                  const kompaniyaMatni = obuna.workspace?.name ?? kompaniyaNomi.get(obuna.workspaceId) ?? obuna.workspaceId;
                  const qolgan = obuna.status === "CANCELLED" ? null : kunQoldi(obuna.endDate);
                  return (
                  <tr key={obuna.id} className={trKlass}>
                    <td className={tdKlass}>
                      <div className="flex items-center gap-3">
                        <Avatar nom={kompaniyaMatni} />
                        <span className="truncate font-black text-slate-900">{kompaniyaMatni}</span>
                      </div>
                    </td>
                    <td className={tdKlass}>
                      <span className="inline-flex rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-600">{obuna.tariff?.name ?? tarifNomi.get(obuna.tariffId) ?? "—"}</span>
                    </td>
                    <td className={tdKlass}>{t(`obunalar.davrlar.${obuna.period}`, { defaultValue: obuna.period })}</td>
                    <td className={tdKlass}>
                      <div className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-slate-600">
                        {sanaKorinishi(obuna.startDate)} <ArrowRight size={13} className="text-slate-300" /> {sanaKorinishi(obuna.endDate)}
                      </div>
                      {qolgan !== null && (
                        <p className={`mt-1 text-xs font-bold ${qolgan < 0 ? "text-red-500" : qolgan <= 7 ? "text-amber-600" : "text-slate-400"}`}>
                          {qolgan < 0 ? t("obunalar.muddatiOtgan") : t("obunalar.kunQoldi", { count: qolgan })}
                        </p>
                      )}
                    </td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs font-semibold text-slate-400">{t("common.natija", { count: korinadigan.length })}</div>
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
