import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cylinder, Factory, Layers, PackagePlus, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import KorsatkichKartasi, { type KartaRangi } from "@/Components/common/KorsatkichKartasi";
import TablePagination from "@/Components/common/TablePagination";
import { ishlabChiqarishApi, yorliqniChopEtish } from "@/api/ishlabChiqarishApi";
import { kunMatni } from "@/lib/hujjatSanasi";
import { miqdorMatni, qidiruvgaMos } from "@/lib/ishlabChiqarish";
import { sahifagaRuxsatBormi } from "@/lib/roles";
import { useAuthProfileStore } from "@/store/authProfileStore";
import type { Rulon, RulonXulosasi } from "@/types/ishlabChiqarish";
import { Asboblar, HolatFiltri, Jadval, OmborTanlash, QidiruvMaydoni, Sahifa, XatoQutisi, tugmaAsosiy, tugmaIkkinchi, type Ustun } from "./umumiy";
import { useAmal, useMalumot, useOmborlar } from "./hooklar";

const STANDART_HOLAT = "IN_STOCK";
// Xulosa kartalari: shu sondan ortiq mahsulot bo'lsa "Hammasini ko'rsatish".
const KARTA_SONI = 7;
const RANGLAR: KartaRangi[] = ["violet", "amber", "emerald", "rose"];

/** Qolgan og'irlik va to'liq og'irlikka nisbatan chiziq. */
function QoldiqChizigi({ qolgan, jami, birlik }: { qolgan: unknown; jami: unknown; birlik: string }) {
  const jamiSoni = Number(jami) || 0;
  const qolganSoni = Number(qolgan) || 0;
  const foiz = jamiSoni > 0 ? Math.max(0, Math.min(100, (qolganSoni / jamiSoni) * 100)) : null;
  const rang = foiz === null ? "" : foiz > 50 ? "bg-emerald-500" : foiz > 15 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="ml-auto min-w-[150px] max-w-[190px]">
      <div className="flex items-center justify-end gap-2 text-sm">
        <span className="font-black tabular-nums text-slate-800">{miqdorMatni(qolgan)}</span>
        {miqdorMatni(qolgan) !== "—" && <span className="text-xs font-bold text-slate-400">{birlik}</span>}
        {foiz !== null && <span className="text-xs font-bold tabular-nums text-slate-400">· {Math.round(foiz)}%</span>}
      </div>
      {foiz !== null && <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${rang}`} style={{ width: `${foiz}%` }} /></div>}
    </div>
  );
}

export default function Rulonlar() {
  const { t } = useTranslation("ishlab_chiqarish");
  const navigate = useNavigate();
  const omborlar = useOmborlar();
  const profil = useAuthProfileStore((holat) => holat.profil);
  const [warehouseId, setWarehouseId] = useState("");
  const [status, setStatus] = useState(STANDART_HOLAT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [qidiruv, setQidiruv] = useState("");
  const [hammasiKorinsin, setHammasiKorinsin] = useState(false);
  const kalit = `${warehouseId}|${status}|${page}|${pageSize}`;
  const royxat = useMalumot(() => ishlabChiqarishApi.rulonlar.royxat({ warehouseId: warehouseId || undefined, status: status || "ALL", page, pageSize }), kalit);
  const xulosa = useMalumot(() => ishlabChiqarishApi.rulonlar.xulosa(warehouseId || undefined), warehouseId);
  const yorliq = useAmal();
  const nomlar = useMemo(() => new Map(omborlar.map((ombor) => [ombor.id, ombor.name])), [omborlar]);
  const kg = t("rolls.kg");
  // Qidiruv faqat joriy sahifa ichida (ro'yxat serverda sahifalanadi).
  const sahifaQatorlari = useMemo(() => royxat.malumot?.items ?? [], [royxat.malumot]);
  const qatorlar = useMemo(() => sahifaQatorlari.filter((rulon) => qidiruvgaMos(qidiruv, [rulon.serial, rulon.productName])), [sahifaQatorlari, qidiruv]);
  const xulosaQatorlari = useMemo(() => xulosa.malumot ?? [], [xulosa.malumot]);
  const jami = useMemo(
    () => xulosaQatorlari.reduce((yigindi, qator) => ({ soni: yigindi.soni + (Number(qator.rolls) || 0), ogirlik: yigindi.ogirlik + (Number(qator.weight) || 0) }), { soni: 0, ogirlik: 0 }),
    [xulosaQatorlari]
  );
  const xulosaYuklanmoqda = xulosa.yuklanmoqda && !xulosa.malumot;
  const korinadiganXulosa = hammasiKorinsin ? xulosaQatorlari : xulosaQatorlari.slice(0, KARTA_SONI);
  const ombor = (id?: string | null) => (id ? nomlar.get(id) ?? "—" : "—");
  const xulosaNomi = (qator: RulonXulosasi) => {
    const nom = qator.productName || "—";
    // Ombor tanlanmagan bo'lsa xulosa omborlar kesimida keladi.
    return !warehouseId && qator.warehouseId ? `${nom} · ${ombor(qator.warehouseId)}` : nom;
  };
  const ustunlar: Ustun<Rulon>[] = [
    { id: "rulonlar-column-1",
      nom: t("fields.serial"),
      katak: (rulon) => (
        <span className="inline-flex items-center gap-2.5">
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[#2563EB] ring-1 ring-orange-100"><Cylinder size={15} /></span>
          <span className="font-black text-slate-900">{rulon.serial ?? "—"}</span>
        </span>
      ),
    },
    { id: "rulonlar-column-2", nom: t("fields.product"), katak: (rulon) => <span className="block max-w-[260px] truncate font-bold text-slate-800">{rulon.productName ?? "—"}</span> },
    { id: "rulonlar-column-3", nom: t("fields.warehouse"), katak: (rulon) => ombor(rulon.warehouseId) },
    { id: "rulonlar-column-4",
      nom: t("rolls.weight"),
      ong: true,
      katak: (rulon) => <>{miqdorMatni(rulon.weight)}{miqdorMatni(rulon.weight) !== "—" && <span className="ml-1 text-xs font-bold text-slate-400">{kg}</span>}</>,
    },
    { id: "rulonlar-column-5", nom: t("rolls.weightLeft"), ong: true, katak: (rulon) => <QoldiqChizigi qolgan={rulon.weightLeft} jami={rulon.weight} birlik={kg} /> },
    { id: "rulonlar-column-6", nom: t("rolls.receivedAt"), katak: (rulon) => kunMatni(rulon.receivedAt ?? undefined) || "—" },
    { id: "rulonlar-column-7",
      nom: t("rolls.label"),
      katak: (rulon) => (
        <button type="button" disabled={yorliq.band} onClick={() => void yorliq.bajar(() => yorliqniChopEtish(rulon.batchId))} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-orange-200 bg-white px-3 text-xs font-black text-[#2563EB] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50">
          <Printer size={14} />{t("rolls.printLabel")}
        </button>
      ),
    },
  ];
  // Filtr yoki qidiruv standartdan farq qiladi: bo'sh natija "hech narsa mos kelmadi" deb ko'rsatiladi.
  const filtrlangan = Boolean(warehouseId) || status !== STANDART_HOLAT || (Boolean(qidiruv.trim()) && sahifaQatorlari.length > 0);
  const tozalash = () => { setWarehouseId(""); setStatus(STANDART_HOLAT); setQidiruv(""); setPage(1); };
  const jamiQator = royxat.malumot?.total ?? 0;
  return (
    <Sahifa sarlavha={t("rolls.title")} izoh={t("rolls.subtitle")}>
      {(xulosaYuklanmoqda || xulosaQatorlari.length > 0) && (
        <div className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KorsatkichKartasi
              icon={Layers}
              nom={warehouseId ? t("rolls.kpi.totalWarehouse", { ombor: ombor(warehouseId) }) : t("rolls.kpi.total")}
              qiymat={`${miqdorMatni(jami.ogirlik)} ${kg}`}
              belgi={{ matn: t("rolls.kpi.count", { soni: miqdorMatni(jami.soni) }) }}
              rang="blue"
              yuklanmoqda={xulosaYuklanmoqda}
              yuklanishMatni={t("loading")}
            />
            {korinadiganXulosa.map((qator, indeks) => {
              // Faqat ma'lumot: qidiruv joriy sahifa ichida ishlaydi, karta esa barcha sahifalar jamisini ko'rsatadi.
              return (
                <KorsatkichKartasi
                  key={`${qator.modificationId ?? qator.productName}-${qator.warehouseId ?? ""}-${indeks}`}
                  icon={Cylinder}
                  nom={xulosaNomi(qator)}
                  qiymat={`${miqdorMatni(qator.weight)} ${kg}`}
                  belgi={{ matn: t("rolls.kpi.count", { soni: miqdorMatni(qator.rolls) }) }}
                  rang={RANGLAR[indeks % RANGLAR.length]}
                />
              );
            })}
          </div>
          {xulosaQatorlari.length > KARTA_SONI && (
            <div className="flex justify-end">
              <button type="button" onClick={() => setHammasiKorinsin((oldingi) => !oldingi)} className="text-sm font-black text-[#2563EB] hover:underline">
                {hammasiKorinsin ? t("rolls.showLess") : t("rolls.showAll", { soni: xulosaQatorlari.length })}
              </button>
            </div>
          )}
        </div>
      )}
      <Asboblar>
        <QidiruvMaydoni qiymat={qidiruv} onChange={setQidiruv} placeholder={t("rolls.searchPlaceholder")} />
        <div className="w-full sm:w-64"><OmborTanlash value={warehouseId} omborlar={omborlar} ariaLabel={t("fields.warehouse")} onChange={(id) => { setWarehouseId(id); setPage(1); }} /></div>
        <HolatFiltri qiymat={status} onChange={(qiymat) => { setStatus(qiymat); setPage(1); }} holatlar={["IN_STOCK", "USED"]} />
      </Asboblar>
      <XatoQutisi matn={royxat.xato || xulosa.xato || yorliq.xato} />
      <Jadval tableId="IshlabChiqarish/Rulonlar/jadval-1"
        ustunlar={ustunlar}
        qatorlar={qatorlar}
        kalit={(rulon) => rulon.batchId}
        yuklanmoqda={royxat.yuklanmoqda && !royxat.malumot}
        boshIkonka={Cylinder}
        bosh={filtrlangan ? t("rolls.emptyFiltered") : t("rolls.emptyTitle")}
        boshIzoh={filtrlangan ? t("rolls.emptyFilteredHint") : t("rolls.emptyHint")}
        boshAmal={filtrlangan ? (
          <button type="button" onClick={tozalash} className={tugmaIkkinchi}>{t("actions.resetFilters")}</button>
        ) : (
          <>
            {sahifagaRuxsatBormi(profil, "/ombor/kirimlar") && <button type="button" onClick={() => navigate("/ombor/kirimlar")} className={tugmaAsosiy}><PackagePlus size={18} />{t("rolls.goReceive")}</button>}
            {sahifagaRuxsatBormi(profil, "/ishlab-chiqarish/smena") && <button type="button" onClick={() => navigate("/ishlab-chiqarish/smena")} className={tugmaIkkinchi}><Factory size={18} />{t("shift.title")}</button>}
          </>
        )}
        pastki={royxat.malumot && (jamiQator > 0 || page > 1) && (
          <TablePagination page={page} pageSize={pageSize} totalItems={jamiQator} onPageChange={setPage} onPageSizeChange={(hajm) => { setPageSize(hajm); setPage(1); }} />
        )}
      />
    </Sahifa>
  );
}
