import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CheckSquare, LoaderCircle, PackageSearch, Search, Square, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import SmartTable from "@/Components/common/smart-table/SmartTable";
import { kategoriyalarApi, modifikatsiyalarApi } from "@/api/catalogApi";
import { katalogQidiruvQatoriniMoslash } from "@/api/catalogSearch";
import { kategoriyalarniFiltrlash } from "@/lib/kategoriyaQidiruvi";
import { cn } from "@/lib/utils";
import type { Kategoriya } from "@/types/catalog";
import type { SavdoSelectOption } from "./SavdoSelect";
import { katalogFiltrlash, katalogJami, type KatalogTanlovi } from "./katalogTanlovi";

/** Bir vaqtda chiziladigan qatorlar (minglab tovarda sekinlashmasin): qolganlari qidiruv/kategoriya bilan topiladi. */
const KORINADIGAN_QATORLAR = 300;

type Props = {
  /** Mahsulot tanlash ro'yxatining o'zi (tanlangan ombor bo'yicha): `value` — qoldiq kaliti, `disabled` — sotib bo'lmaydi. */
  variantlar: SavdoSelectOption[];
  qoldiqSoni: (kalit: string) => number;
  narx: (kalit: string) => number;
  modificationId: (kalit: string) => string;
  narxMatni: (summa: number) => string;
  omborTanlanmagan: boolean;
  onQoshish: (tanlangan: KatalogTanlovi[]) => void;
  onYopish: () => void;
};

/**
 * Savdo yaratishdagi "Katalog": chapda kategoriyalar (qidiruv bilan), o'ngda tanlangan ombordagi mahsulotlar — nomi, qoldig'i va
 * tanlangan narx turidagi narxi. Ko'p tanlash: katak bilan yoki miqdor yozilsa qator o'zi belgilanadi. "Qo'shish" — barcha tanlanganlar
 * miqdori bilan savdoga (bor tovarning miqdori qo'shiladi).
 * Klaviatura: ↑ ↓ — qatorlar, Space — belgilash, raqam — miqdorga yozish, Enter — qo'shish, Esc — yopish.
 */
export default function KatalogOynasi({ variantlar, qoldiqSoni, narx, modificationId, narxMatni, omborTanlanmagan, onQoshish, onYopish }: Props) {
  const { t } = useTranslation("savdo_yangi");
  const [qidiruv, setQidiruv] = useState("");
  const [kategoriyaQidiruv, setKategoriyaQidiruv] = useState("");
  const [kategoriyalar, setKategoriyalar] = useState<Kategoriya[]>([]);
  const [kategoriyaId, setKategoriyaId] = useState("");
  // Tanlangan kategoriyadagi variantlar (server qidiruvi `categoryId` bilan); null — hammasi.
  const [kategoriyaVariantlari, setKategoriyaVariantlari] = useState<Set<string> | null>(null);
  const [kategoriyaYuklanmoqda, setKategoriyaYuklanmoqda] = useState(false);
  const [faqatQoldiq, setFaqatQoldiq] = useState(false);
  const [miqdorlar, setMiqdorlar] = useState<Record<string, string>>({});
  const [faol, setFaol] = useState(0);
  const jadvalRef = useRef<HTMLDivElement | null>(null);
  const qidiruvRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let tirik = true;
    kategoriyalarApi.royxat(true).then((royxat) => { if (tirik) setKategoriyalar(royxat); }).catch(() => {});
    window.setTimeout(() => qidiruvRef.current?.focus(), 30);
    return () => { tirik = false; };
  }, []);

  // Kategoriya tanlansa uning mahsulotlari serverdan (sahifalab, 100 tadan, eng ko'pi 10 sahifa) olinadi.
  useEffect(() => {
    if (!kategoriyaId) { setKategoriyaVariantlari(null); return; }
    const boshqaruv = new AbortController();
    setKategoriyaYuklanmoqda(true);
    (async () => {
      const idlar = new Set<string>();
      try {
        for (let sahifa = 1; sahifa <= 10; sahifa++) {
          const javob = await modifikatsiyalarApi.qidiruvSahifasi({ search: "", categoryId: kategoriyaId, page: sahifa, pageSize: 100, signal: boshqaruv.signal });
          for (const qator of javob.items) {
            const id = katalogQidiruvQatoriniMoslash(qator)?.id;
            if (id) idlar.add(id);
          }
          if (javob.items.length < 100 || idlar.size >= javob.total) break;
        }
        if (!boshqaruv.signal.aborted) setKategoriyaVariantlari(idlar);
      } catch {
        if (!boshqaruv.signal.aborted) setKategoriyaVariantlari(idlar);
      } finally {
        if (!boshqaruv.signal.aborted) setKategoriyaYuklanmoqda(false);
      }
    })();
    return () => boshqaruv.abort();
  }, [kategoriyaId]);

  const qatorlar = useMemo(
    () =>
      katalogFiltrlash(variantlar, {
        qidiruv,
        faqatQoldiq,
        kategoriya: kategoriyaVariantlari,
        qoldiqSoni,
        modificationId,
      }),
    [variantlar, qidiruv, faqatQoldiq, kategoriyaVariantlari, qoldiqSoni, modificationId]
  );
  const korinadigan = qatorlar.slice(0, KORINADIGAN_QATORLAR);
  const tanlangan: KatalogTanlovi[] = Object.entries(miqdorlar)
    .map(([kalit, matn]) => ({ kalit, miqdor: Number(matn.replace(",", ".")) || 0 }))
    .filter((item) => item.miqdor > 0);
  const jami = katalogJami(tanlangan, narx);
  const kategoriyaRoyxati = kategoriyalarniFiltrlash(kategoriyalar, kategoriyaQidiruv);

  function miqdorniOrnat(kalit: string, matn: string) {
    const toza = matn.replace(/[^\d.,]/g, "");
    setMiqdorlar((joriy) => {
      const yangi = { ...joriy };
      if (!toza || Number(toza.replace(",", ".")) <= 0) delete yangi[kalit];
      else yangi[kalit] = toza;
      return yangi;
    });
  }

  function belgilash(kalit: string) {
    setMiqdorlar((joriy) => {
      const yangi = { ...joriy };
      if (yangi[kalit]) delete yangi[kalit];
      else yangi[kalit] = "1";
      return yangi;
    });
  }

  function qoshish() {
    if (tanlangan.length === 0) return;
    onQoshish(tanlangan);
  }

  function qatorgaOt(indeks: number) {
    const chegara = Math.max(Math.min(indeks, korinadigan.length - 1), 0);
    setFaol(chegara);
    window.requestAnimationFrame(() => {
      jadvalRef.current?.querySelector<HTMLElement>(`[data-katalog-qator="${chegara}"]`)?.scrollIntoView({ block: "nearest" });
    });
  }

  function jadvalKlavishi(event: KeyboardEvent<HTMLElement>) {
    if (event.nativeEvent.isComposing) return;
    const joriy = korinadigan[faol];
    const maydondami = (event.target as HTMLElement).tagName === "INPUT" && (event.target as HTMLElement).dataset.katalogMiqdor !== undefined;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      qatorgaOt(faol + (event.key === "ArrowDown" ? 1 : -1));
      if (maydondami) jadvalRef.current?.focus();
    } else if (event.key === "Enter") {
      event.preventDefault();
      qoshish();
    } else if (!maydondami && event.key === " " && joriy && !joriy.option.disabled) {
      event.preventDefault();
      belgilash(joriy.option.value);
    } else if (!maydondami && /^[0-9]$/.test(event.key) && joriy && !joriy.option.disabled) {
      // Raqam yozilsa faol qatorning miqdor maydoniga tushadi.
      event.preventDefault();
      miqdorniOrnat(joriy.option.value, event.key);
      window.requestAnimationFrame(() => {
        const maydon = jadvalRef.current?.querySelector<HTMLInputElement>(`input[data-katalog-miqdor="${faol}"]`);
        maydon?.focus();
        const uzunlik = maydon?.value.length ?? 0;
        maydon?.setSelectionRange(uzunlik, uzunlik);
      });
    }
  }

  return (
    // Tanlov bo'lsa Esc / yopish avval tasdiq so'raydi (AppModal); faqat shu (eng ustki) oyna javob beradi, savdo oynasi tegmaydi.
    <AppModal onClose={onYopish} actionRail={false} ozgarishBor={tanlangan.length > 0} className="p-3 sm:p-6">
      <section
        onKeyDown={(event) => {
          if (event.key !== "Escape" || event.defaultPrevented) return;
          event.preventDefault();
          event.stopPropagation();
          onYopish();
        }}
        role="dialog" aria-modal="true" aria-label={t("katalog.title")} className="flex h-[min(760px,calc(100dvh-24px))] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><PackageSearch size={22} className="text-[#2563EB]" />{t("katalog.title")}</h2>
          <label className="relative ml-auto min-w-[220px] flex-1 sm:max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={qidiruvRef}
              value={qidiruv}
              onChange={(event) => { setQidiruv(event.target.value); setFaol(0); }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") { event.preventDefault(); qatorgaOt(0); jadvalRef.current?.focus(); }
                else if (event.key === "Enter") { event.preventDefault(); qoshish(); }
              }}
              placeholder={t("katalog.search")}
              aria-label={t("katalog.search")}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600">
            <input type="checkbox" checked={faqatQoldiq} onChange={(event) => { setFaqatQoldiq(event.target.checked); setFaol(0); }} className="h-4 w-4 accent-[#2563EB]" />
            {t("katalog.inStock")}
          </label>
          <button type="button" onClick={onYopish} aria-label={t("katalog.cancel")} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </header>

        {omborTanlanmagan ? (
          <p className="m-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">{t("katalog.chooseWarehouse")}</p>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="hidden min-h-0 flex-col border-r border-slate-100 md:flex">
              <div className="p-3">
                <input
                  value={kategoriyaQidiruv}
                  onChange={(event) => setKategoriyaQidiruv(event.target.value)}
                  placeholder={t("katalog.categorySearch")}
                  aria-label={t("katalog.categorySearch")}
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#2563EB]"
                />
              </div>
              <nav aria-label={t("katalog.categories")} className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                {[{ id: "", name: t("katalog.all") }, ...kategoriyaRoyxati].map((kategoriya) => (
                  <button
                    key={kategoriya.id || "hammasi"}
                    type="button"
                    aria-pressed={kategoriyaId === kategoriya.id}
                    onClick={() => { setKategoriyaId(kategoriya.id); setFaol(0); }}
                    className={cn(
                      "flex w-full items-center gap-2 truncate rounded-lg px-3 py-2 text-left text-sm font-semibold transition",
                      kategoriyaId === kategoriya.id ? "bg-blue-50 text-[#2563EB]" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span className="text-slate-300">▸</span>
                    <span className="truncate">{kategoriya.name}</span>
                  </button>
                ))}
              </nav>
            </aside>

            <div ref={jadvalRef} tabIndex={0} onKeyDown={jadvalKlavishi} className="min-h-0 overflow-auto outline-none" aria-label={t("katalog.title")}>
              {/* Kichik ekranda kategoriya tanlovi jadval ustida */}
              <div className="border-b border-slate-100 p-3 md:hidden">
                <select value={kategoriyaId} onChange={(event) => setKategoriyaId(event.target.value)} aria-label={t("katalog.categories")} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
                  <option value="">{t("katalog.all")}</option>
                  {kategoriyalar.map((kategoriya) => <option key={kategoriya.id} value={kategoriya.id}>{kategoriya.name}</option>)}
                </select>
              </div>
              {kategoriyaYuklanmoqda ? (
                <div className="flex h-48 items-center justify-center text-slate-400"><LoaderCircle className="animate-spin" /></div>
              ) : korinadigan.length === 0 ? (
                <p className="px-5 py-16 text-center text-sm font-semibold text-slate-400">{t("katalog.empty")}</p>
              ) : (
                <SmartTable tableId="Savdo/KatalogOynasi/mahsulotlar" replaceColumnControls>
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-[2] bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-10 px-3 py-2.5" aria-label={t("katalog.select")} />
                      <th className="px-3 py-2.5">{t("katalog.product")}</th>
                      <th className="px-3 py-2.5 text-right">{t("katalog.stock")}</th>
                      <th className="px-3 py-2.5 text-right">{t("katalog.price")}</th>
                      <th className="w-28 px-3 py-2.5 text-right">{t("katalog.qty")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {korinadigan.map(({ option, nom }, indeks) => {
                      const kalit = option.value;
                      const belgilangan = Boolean(miqdorlar[kalit]);
                      return (
                        <tr
                          key={kalit}
                          data-katalog-qator={indeks}
                          aria-selected={indeks === faol}
                          onMouseDown={() => setFaol(indeks)}
                          className={cn(
                            "h-10 border-b border-slate-100",
                            option.disabled ? "text-slate-400" : "text-slate-700",
                            indeks === faol ? "bg-blue-50 outline outline-2 -outline-offset-2 outline-blue-300" : belgilangan ? "bg-emerald-50/50" : "hover:bg-slate-50"
                          )}
                        >
                          <td className="px-3 py-1.5">
                            <button type="button" disabled={option.disabled} onClick={() => belgilash(kalit)} aria-label={nom} aria-pressed={belgilangan} className="disabled:opacity-30">
                              {belgilangan ? <CheckSquare size={17} className="text-[#2563EB]" /> : <Square size={17} className="text-slate-300" />}
                            </button>
                          </td>
                          <td className="max-w-[360px] truncate px-3 py-1.5 font-semibold" title={nom}>{nom}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{qoldiqSoni(kalit).toLocaleString("uz-UZ", { maximumFractionDigits: 3 })}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{narxMatni(narx(kalit))}</td>
                          <td className="px-3 py-1.5">
                            <input
                              data-katalog-miqdor={indeks}
                              inputMode="decimal"
                              disabled={option.disabled}
                              value={miqdorlar[kalit] ?? ""}
                              onFocus={() => setFaol(indeks)}
                              onChange={(event) => miqdorniOrnat(kalit, event.target.value)}
                              aria-label={`${t("katalog.qty")}: ${nom}`}
                              placeholder="0"
                              className="h-8 w-full rounded-lg border border-slate-200 px-2 text-right text-sm font-semibold tabular-nums outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </SmartTable>
              )}
              {qatorlar.length > korinadigan.length && (
                <p className="px-5 py-3 text-center text-xs font-semibold text-slate-400">{t("katalog.more", { count: qatorlar.length - korinadigan.length })}</p>
              )}
            </div>
          </div>
        )}

        <footer className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <p className="text-sm font-bold text-slate-700" role="status">
            {t("katalog.selected", { count: tanlangan.length, qty: jami.miqdor.toLocaleString("uz-UZ", { maximumFractionDigits: 3 }), summa: narxMatni(jami.summa) })}
          </p>
          <p className="hidden text-xs font-medium text-slate-400 lg:block">{t("katalog.keysHint")}</p>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onYopish} className="h-11 rounded-xl bg-white px-5 text-sm font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100">{t("katalog.cancel")}</button>
            <button type="button" onClick={qoshish} disabled={tanlangan.length === 0} className="h-11 rounded-xl bg-[#2563EB] px-6 text-sm font-black text-white shadow-sm hover:bg-[#1D4ED8] disabled:opacity-40">{t("katalog.add")}</button>
          </div>
        </footer>
      </section>
    </AppModal>
  );
}

