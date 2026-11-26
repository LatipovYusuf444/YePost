import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Columns3, LoaderCircle, MessagesSquare, Rows3, Target, X } from "lucide-react";
import SmartTable from "@/Components/common/smart-table/SmartTable";
import AppSelect from "@/Components/ui/AppSelect";
import DateRangePicker from "@/Components/ui/DateRangePicker";
import { lidlarApi, type LidFiltri } from "@/api/crmApi";
import { xodimlar as xodimlarniOlish } from "@/api/omborApi";
import type { SahifaliRoyxat } from "@/api/response";
import { bugungiToshkentKuni, vaqtMatni } from "@/lib/hujjatSanasi";
import { faolTezDavr, suhbatNomi, tezDavrOraligi, ulush, type TezDavr } from "@/lib/savdoAgenti";
import { cn } from "@/lib/utils";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { LID_BOSQICHLARI, type Lid, type LidStatistikasi, type LidVoronkasi } from "@/types/crm";
import KanalBelgisi from "./KanalBelgisi";
import LidKartasi, { type LidXodimi } from "./LidKartasi";
import LidlarKanban from "./LidlarKanban";
import { bosqichRangi, davomiylikMatni, faolXodimlar, nisbiyVaqtMatni } from "./lidYordamchilari";

const SAHIFA_HAJMI = 20;
const KORINISH_KALITI = "yepost-lidlar-korinish";

type Korinish = "kanban" | "jadval";

function lidNomi(lid: Lid) {
  return lid.thread ? suhbatNomi(lid.thread) : `#${lid.threadId.slice(0, 8)}`;
}

function saqlanganKorinish(): Korinish {
  try {
    return window.localStorage.getItem(KORINISH_KALITI) === "jadval" ? "jadval" : "kanban";
  } catch {
    return "kanban";
  }
}

export default function Lidlar() {
  const { t } = useTranslation("savdo_agenti");
  const [params, setParams] = useSearchParams();
  const threadFiltri = params.get("thread") ?? "";
  const ochiqLidId = params.get("lid");
  const menId = useAuthProfileStore((state) => state.profil?.id ?? null);

  // Kanban — spetsifikatsiya bo'yicha asosiy ko'rinish; tanlov shu brauzerda eslab qolinadi.
  const [korinish, setKorinish] = useState<Korinish>(saqlanganKorinish);
  const [stage, setStage] = useState("");
  const [source, setSource] = useState("");
  const [owner, setOwner] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sahifa, setSahifa] = useState(1);
  const [kanbanKaliti, setKanbanKaliti] = useState(0);

  const [javob, setJavob] = useState<SahifaliRoyxat<Lid> | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [statistika, setStatistika] = useState<LidStatistikasi | null>(null);
  // Mas'ul filtri — hamma xodim (nofaol xodimning lidlarini ham topib qayta tayinlash uchun); tayinlash — faqat faollar.
  const [barchaXodimlar, setBarchaXodimlar] = useState<Array<LidXodimi & { faol: boolean }>>([]);
  const xodimlar = useMemo(() => barchaXodimlar.filter((x) => x.faol).map(({ id, nom }) => ({ id, nom })), [barchaXodimlar]);
  const sorovRaqami = useRef(0);
  // Suhbatdan "Lid" bilan kelinganda eng so'nggi lid bir marta avtomatik ochiladi.
  const avtoOchilgan = useRef<string | null>(null);
  // Suhbat filtri chipidagi nom (kanban ko'rinishida jadval ma'lumoti yo'q).
  const [threadMalumot, setThreadMalumot] = useState<Lid["thread"]>(null);

  const ownerId = owner === "me" ? (menId ?? "") : owner;
  const asosiyFiltr = useMemo<Omit<LidFiltri, "stage" | "page" | "pageSize">>(
    () => ({ source, ownerId, threadId: threadFiltri, dateFrom, dateTo }),
    [dateFrom, dateTo, ownerId, source, threadFiltri]
  );

  function korinishniTanlash(yangi: Korinish) {
    setKorinish(yangi);
    try {
      window.localStorage.setItem(KORINISH_KALITI, yangi);
    } catch {
      // xotira yopiq — tanlov faqat shu sessiyada
    }
  }

  const yuklash = useCallback(async () => {
    if (korinish !== "jadval") return;
    const raqam = ++sorovRaqami.current;
    setYuklanmoqda(true);
    try {
      const natija = await lidlarApi.royxat({ ...asosiyFiltr, stage, page: sahifa, pageSize: SAHIFA_HAJMI });
      if (raqam !== sorovRaqami.current) return;
      // Oxirgi sahifadagi yagona qator filtrdan chiqsa — bo'sh sahifada qolmasdan oxirgi mavjud sahifaga o'tiladi.
      if (natija.items.length === 0 && sahifa > 1 && natija.totalPages >= 1 && sahifa > natija.totalPages) {
        setSahifa(natija.totalPages);
        return;
      }
      setJavob(natija);
    } catch {
      if (raqam === sorovRaqami.current) setJavob((joriy) => joriy ?? { items: [], total: 0, page: 1, pageSize: SAHIFA_HAJMI, totalPages: 1 });
    } finally {
      if (raqam === sorovRaqami.current) setYuklanmoqda(false);
    }
  }, [asosiyFiltr, korinish, sahifa, stage]);

  useEffect(() => {
    void yuklash();
  }, [yuklash]);

  const statistikaniYuklash = useCallback(async () => {
    try {
      setStatistika(await lidlarApi.statistika({ dateFrom, dateTo }));
    } catch {
      setStatistika(null);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    void statistikaniYuklash();
  }, [statistikaniYuklash]);

  // Mas'ul tayinlash uchun xodimlar (ADMIN/DIREKTOR); kassir/omborchiga backend ro'yxatni bermaydi — bo'sh, "Menga" qoladi.
  useEffect(() => {
    let faol = true;
    xodimlarniOlish()
      .then((royxat) => {
        if (!faol) return;
        const faollar = new Set(faolXodimlar(royxat).map((x) => x.id));
        setBarchaXodimlar(
          royxat
            .filter((x) => Boolean(x.id))
            .map((x) => ({ id: x.id, nom: x.fullName || x.name || x.username || x.id, faol: faollar.has(x.id) }))
        );
      })
      .catch(() => {});
    return () => {
      faol = false;
    };
  }, []);

  const lidniOchish = useCallback(
    (id: string | null) => {
      setParams(
        (joriy) => {
          const yangi = new URLSearchParams(joriy);
          if (id) yangi.set("lid", id);
          else yangi.delete("lid");
          return yangi;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  // Suhbatdan kelinganda: shu suhbatning eng so'nggi lidi (ko'rinishdan qat'i nazar) ochiladi.
  useEffect(() => {
    if (!threadFiltri || ochiqLidId || avtoOchilgan.current === threadFiltri) return;
    avtoOchilgan.current = threadFiltri;
    lidlarApi
      .royxat({ threadId: threadFiltri, page: 1, pageSize: 1 })
      .then((natija) => {
        setThreadMalumot(natija.items[0]?.thread ?? null);
        if (natija.items[0]) lidniOchish(natija.items[0].id);
      })
      .catch(() => {});
  }, [lidniOchish, ochiqLidId, threadFiltri]);

  function threadFiltriniOlish() {
    setSahifa(1);
    setParams(
      (joriy) => {
        const yangi = new URLSearchParams(joriy);
        yangi.delete("thread");
        return yangi;
      },
      { replace: true }
    );
  }

  function davrniOrnatish(from: string, to: string) {
    setDateFrom(from);
    setDateTo(to);
    setSahifa(1);
  }

  const bugun = bugungiToshkentKuni();
  const faolDavr = faolTezDavr(dateFrom, dateTo, bugun);
  const items = javob?.items ?? [];
  const jami = statistika?.total;
  const threadNomi = threadFiltri
    ? (items.find((lid) => lid.threadId === threadFiltri)?.thread ?? (threadMalumot?.id === threadFiltri ? threadMalumot : null))
    : null;
  const boshqaXodimlar = barchaXodimlar.filter((x) => x.id !== menId);

  return (
    <div className="space-y-4">
      {/* Voronka */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {(
          [
            ["total", "text-slate-900", "from-slate-50"],
            ["interested", "text-sky-700", "from-sky-50"],
            ["ordered", "text-indigo-700", "from-indigo-50"],
            ["sold", "text-emerald-700", "from-emerald-50"],
            ["lost", "text-rose-700", "from-rose-50"],
          ] as const
        ).map(([kalit, rang, fon]) => {
          const son = jami?.[kalit] ?? 0;
          return (
            <div key={kalit} className={`rounded-[22px] border border-slate-200 bg-gradient-to-br ${fon} to-white p-4 shadow-sm`}>
              <p className="text-xs font-bold text-slate-500">{t(`lid.stats.${kalit}`)}</p>
              <p className={`mt-1 text-2xl font-black tabular-nums ${rang}`}>{jami ? son : "—"}</p>
              {kalit !== "total" && jami && (
                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{t("lid.stats.ofTotal", { foiz: ulush(son, jami.total) })}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Kanal bo'yicha voronka */}
      {statistika && statistika.bySource.length > 0 && (
        <div data-kanal-voronkasi className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm">
          <p className="px-1 pb-2 text-xs font-bold text-slate-500">{t("lid.funnel.title")}</p>
          <div className="space-y-2">
            {statistika.bySource.map((manba) => (
              <KanalVoronkasi key={manba.source} manba={manba} />
            ))}
          </div>
        </div>
      )}

      {/* Filtrlar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm">
        <div role="radiogroup" aria-label={t("lid.view.label")} className="inline-flex rounded-xl bg-slate-100 p-1">
          {(
            [
              ["kanban", Columns3],
              ["jadval", Rows3],
            ] as const
          ).map(([qiymat, Ikonka]) => (
            <button
              key={qiymat}
              type="button"
              role="radio"
              aria-checked={korinish === qiymat}
              data-lid-korinish={qiymat}
              onClick={() => korinishniTanlash(qiymat)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                korinish === qiymat ? "bg-white text-[#2563EB] shadow-sm ring-2 ring-blue-200" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Ikonka size={14} />
              {t(qiymat === "kanban" ? "lid.view.kanban" : "lid.view.table")}
            </button>
          ))}
        </div>
        {korinish === "jadval" && (
          <AppSelect
            value={stage}
            onChange={(event) => {
              setStage(event.target.value);
              setSahifa(1);
            }}
            aria-label={t("lid.col.stage")}
            className="h-10 min-w-[170px] flex-1 rounded-xl sm:flex-none"
          >
            <option value="">{t("lid.filter.allStages")}</option>
            {LID_BOSQICHLARI.map((bosqich) => (
              <option key={bosqich} value={bosqich}>
                {t(`lid.stage.${bosqich}`)}
              </option>
            ))}
          </AppSelect>
        )}
        <AppSelect
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
            setSahifa(1);
          }}
          aria-label={t("lid.col.source")}
          className="h-10 min-w-[160px] flex-1 rounded-xl sm:flex-none"
        >
          <option value="">{t("lid.filter.allSources")}</option>
          {/* Lid faqat Telegram Business (do'kon akkaunti) chatida ochiladi — bot chatlari lid ochmaydi. */}
          <option value="TELEGRAM_BUSINESS">{t("kanal.BUSINESS")}</option>
        </AppSelect>
        <AppSelect
          value={owner}
          onChange={(event) => {
            setOwner(event.target.value);
            setSahifa(1);
          }}
          aria-label={t("lid.col.owner")}
          className="h-10 min-w-[170px] flex-1 rounded-xl sm:flex-none"
        >
          <option value="">{t("lid.ownerFilter.all")}</option>
          {menId && <option value="me">{t("lid.ownerFilter.mine")}</option>}
          {boshqaXodimlar.map((x) => (
            <option key={x.id} value={x.id}>
              {x.faol ? x.nom : `${x.nom} (${t("lid.ownerFilter.inactive")})`}
            </option>
          ))}
        </AppSelect>
        <div role="radiogroup" aria-label={t("lid.filter.period")} className="inline-flex rounded-xl bg-slate-100 p-1">
          {(["bugun", "hafta", "oy", "hammasi"] as const).map((tur) => (
            <button
              key={tur}
              type="button"
              role="radio"
              aria-checked={faolDavr === tur}
              data-tez-davr={tur}
              onClick={() => {
                if (tur === "hammasi") davrniOrnatish("", "");
                else {
                  const oraliq = tezDavrOraligi(tur as TezDavr, bugun);
                  davrniOrnatish(oraliq.dateFrom, oraliq.dateTo);
                }
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                faolDavr === tur ? "bg-white text-[#2563EB] shadow-sm ring-2 ring-blue-200" : "text-slate-600 hover:text-slate-900"
              )}
            >
              {t(`lid.quick.${tur}`)}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-60 sm:shrink-0">
          <DateRangePicker from={dateFrom} to={dateTo} compact timeZone="Asia/Tashkent" onChange={davrniOrnatish} />
        </div>
        {threadFiltri && (
          <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-50 pl-3 pr-1.5 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
            <MessagesSquare size={14} />
            {threadNomi ? suhbatNomi(threadNomi) : `#${threadFiltri.slice(0, 8)}`}
            <button
              type="button"
              onClick={threadFiltriniOlish}
              aria-label={t("lid.filter.clearThread")}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-blue-500 hover:bg-blue-100"
            >
              <X size={14} />
            </button>
          </span>
        )}
        {korinish === "jadval" && yuklanmoqda && javob && <LoaderCircle size={18} className="ml-auto animate-spin text-blue-600" />}
      </div>

      {korinish === "kanban" ? (
        <LidlarKanban
          filtr={asosiyFiltr}
          yangilashKaliti={kanbanKaliti}
          ochiqLidId={ochiqLidId}
          onOchish={lidniOchish}
          onOzgardi={() => void statistikaniYuklash()}
          onKoproq={(bosqich) => {
            setStage(bosqich);
            setSahifa(1);
            korinishniTanlash("jadval");
          }}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
            {yuklanmoqda && !javob ? (
              <p className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-400">
                <LoaderCircle size={20} className="animate-spin text-blue-600" />
                {t("lid.loading")}
              </p>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Target size={22} />
                </span>
                <p className="text-sm font-bold text-slate-700">{t("lid.empty")}</p>
                <p className="max-w-xs text-xs font-medium text-slate-400">{t("lid.emptyText")}</p>
              </div>
            ) : (
              <>
                {/* Katta ekran: jadval */}
                <div className="hidden md:block">
                  <SmartTable tableId="SavdoAgenti/Lidlar/table-1"><table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold text-slate-500">
                      <tr>
                        <th className="px-4 py-3">{t("lid.col.contact")}</th>
                        <th className="px-4 py-3">{t("lid.col.source")}</th>
                        <th className="px-4 py-3">{t("lid.col.stage")}</th>
                        <th className="px-4 py-3">{t("lid.col.owner")}</th>
                        <th className="px-4 py-3">{t("lid.col.firstReply")}</th>
                        <th className="px-4 py-3">{t("lid.col.lastActivity")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((lid) => (
                        <tr
                          key={lid.id}
                          onClick={() => lidniOchish(lid.id)}
                          className={`cursor-pointer border-b border-slate-100 transition last:border-b-0 hover:bg-blue-50/50 ${lid.id === ochiqLidId ? "bg-blue-50/70" : ""}`}
                        >
                          <td className="max-w-[260px] px-4 py-3">
                            <span className="block truncate font-bold text-slate-800">{lidNomi(lid)}</span>
                            {lid.thread?.partnerId === null && <span className="text-[11px] font-semibold text-amber-600">{t("suhbat.unassigned")}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <KanalBelgisi kanal={lid.source} />
                          </td>
                          <td className="px-4 py-3">
                            <BosqichBelgisi lid={lid} />
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-600">{lid.owner?.fullName || <span className="text-slate-400">{t("lid.noOwner")}</span>}</td>
                          <td className="px-4 py-3 font-semibold tabular-nums text-slate-600">
                            {davomiylikMatni(lid.firstReplySeconds, t) || <span className="text-slate-400">{t("lid.noReply")}</span>}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-500" title={vaqtMatni(lid.lastActivityAt)}>
                            {nisbiyVaqtMatni(lid.lastActivityAt, t)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></SmartTable>
                </div>

                {/* Telefon: kartalar */}
                <ul className="divide-y divide-slate-100 md:hidden">
                  {items.map((lid) => (
                    <li key={lid.id}>
                      <button type="button" onClick={() => lidniOchish(lid.id)} className="w-full space-y-1.5 px-4 py-3 text-left transition hover:bg-blue-50/50">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-slate-800">{lidNomi(lid)}</span>
                          <BosqichBelgisi lid={lid} />
                        </span>
                        <span className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
                          <KanalBelgisi kanal={lid.source} ixcham />
                          <span>{nisbiyVaqtMatni(lid.lastActivityAt, t)}</span>
                          <span>· {lid.owner?.fullName || t("lid.noOwner")}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {javob && javob.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-500">
                {t("lid.page", { sahifa: javob.page, jami: javob.totalPages, soni: javob.total })}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={sahifa <= 1 || yuklanmoqda}
                  onClick={() => setSahifa((joriy) => Math.max(1, joriy - 1))}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                  {t("lid.prev")}
                </button>
                <button
                  type="button"
                  disabled={sahifa >= javob.totalPages || yuklanmoqda}
                  onClick={() => setSahifa((joriy) => joriy + 1)}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  {t("lid.next")}
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {ochiqLidId && (
        <LidKartasi
          lidId={ochiqLidId}
          xodimlar={xodimlar}
          onYopish={() => lidniOchish(null)}
          onYangilandi={(yangi) => {
            setJavob((joriy) =>
              joriy ? { ...joriy, items: joriy.items.map((lid) => (lid.id === yangi.id ? { ...lid, ...yangi } : lid)) } : joriy
            );
            // Filtr (masalan, bosqich) bo'yicha ro'yxat va jami sonlar serverdan qayta olinadi.
            void yuklash();
            setKanbanKaliti((k) => k + 1);
            void statistikaniYuklash();
          }}
          onQaytaYuklash={() => {
            void yuklash();
            setKanbanKaliti((k) => k + 1);
            void statistikaniYuklash();
          }}
        />
      )}
    </div>
  );
}

function KanalVoronkasi({ manba }: { manba: LidVoronkasi & { source: string } }) {
  const { t } = useTranslation("savdo_agenti");
  const qadamlar = [
    { kalit: "total", son: manba.total, rang: "bg-slate-400" },
    { kalit: "interested", son: manba.interested, rang: "bg-sky-500" },
    { kalit: "ordered", son: manba.ordered, rang: "bg-indigo-500" },
    { kalit: "sold", son: manba.sold, rang: "bg-emerald-500" },
  ] as const;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-slate-50 px-3 py-2.5">
      <span className="w-36 shrink-0">
        <KanalBelgisi kanal={manba.source} />
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
        {qadamlar.map((qadam, i) => (
          <span key={qadam.kalit} className="inline-flex items-center gap-2">
            {i > 0 && <span className="text-slate-300">{t("lid.funnel.arrow")}</span>}
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1 text-xs ring-1 ring-slate-200">
              <span className={cn("h-2 w-2 rounded-full", qadam.rang)} />
              <span className="font-semibold text-slate-500">{t(`lid.stats.${qadam.kalit}`)}</span>
              <span className="font-black tabular-nums text-slate-800">{qadam.son}</span>
              {i > 0 && <span className="text-[11px] font-bold text-slate-400">{ulush(qadam.son, manba.total)}%</span>}
            </span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-2.5 py-1 text-xs ring-1 ring-rose-100 sm:ml-auto">
          <span className="font-semibold text-rose-600">{t("lid.stats.lost")}</span>
          <span className="font-black tabular-nums text-rose-700">{manba.lost}</span>
        </span>
      </div>
    </div>
  );
}

function BosqichBelgisi({ lid }: { lid: Lid }) {
  const { t } = useTranslation("savdo_agenti");
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${bosqichRangi(lid.stage)}`}>
      {t(`lid.stage.${lid.stage}`, { defaultValue: lid.stage })}
      {lid.stage === "LOST" && lid.lostReason && <span className="font-semibold opacity-80">· {t(`lid.reason.${lid.lostReason}`, { defaultValue: lid.lostReason })}</span>}
    </span>
  );
}
