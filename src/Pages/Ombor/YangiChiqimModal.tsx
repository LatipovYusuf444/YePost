import AppSelect from "@/Components/ui/AppSelect";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Barcode,
  CalendarDays,
  ChevronDown,
  Clock3,
  Image,
  LoaderCircle,
  MessageSquare,
  Package,
  Plus,
  Trash2,
  Warehouse,
} from "lucide-react";
import AppModal from "@/Components/common/AppModal";
import { useTranslation } from "react-i18next";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useOmborStore } from "@/store/omborStore";
import type { ChiqimSababi } from "@/types/ombor";
import { kodBilanTopish, modificationNomi, pul, qoldiqMiqdori } from "./omborYordamchilari";
import MahsulotTanlov, { type MahsulotVarianti } from "./MahsulotTanlov";
import ShtrixKodMaydoni, { type SkanNatijasi } from "./ShtrixKodMaydoni";

type Props = { onClose: () => void };
type Qator = { id: string; modificationId: string; quantity: number };

const input =
  "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 aria-invalid:border-red-400 aria-invalid:ring-4 aria-invalid:ring-red-100 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70";
const yangiQator = (): Qator => ({ id: crypto.randomUUID(), modificationId: "", quantity: 1 });

export default function YangiChiqimModal({ onClose }: Props) {
  const { t } = useTranslation("ombor_modal");
  const store = useOmborStore();
  const chiqimSabablari: Record<ChiqimSababi, string> = {
    DAMAGE: t("yangiChiqimModal.reasons.damage"),
    EXPIRY: t("yangiChiqimModal.reasons.expiry"),
    THEFT: t("yangiChiqimModal.reasons.theft"),
    OTHER: t("yangiChiqimModal.reasons.other"),
  };
  const birinchiOmbor =
    store.omborlar.find((item) => item.isActive !== false)?.id ?? store.omborlar[0]?.id ?? "";
  const [warehouseId, setWarehouseId] = useState(birinchiOmbor);
  const [responsibleId, setResponsibleId] = useState("");
  const joriyProfil = useAuthProfileStore((state) => state.profil);
  const profilniYuklash = useAuthProfileStore((state) => state.profilniYuklash);

  useEffect(() => {
    if (!joriyProfil) void profilniYuklash();
  }, [joriyProfil, profilniYuklash]);

  useEffect(() => {
    // Chiqim hujjatining mas'ul xodimi har doim tizimga real kirgan
    // foydalanuvchi bo'lishi kerak.
    if (joriyProfil?.id) setResponsibleId(joriyProfil.id);
  }, [joriyProfil]);

  const [reason, setReason] = useState<ChiqimSababi | "">("");
  const [note, setNote] = useState("");
  const [qatorlar, setQatorlar] = useState<Qator[]>([yangiQator()]);
  const [xato, setXato] = useState("");
  // Klaviatura bilan tez kiritish: keyingi fokus (mahsulot ro'yxati yoki miqdor maydoni).
  const { t: tk } = useTranslation("ombor_kichik");
  const [fokus, setFokus] = useState<{ qatorId: string; maydon: "mahsulot" | "miqdor"; n: number } | null>(null);
  const fokusNavbati = useRef(0);
  const qatorlarRef = useRef<HTMLDivElement | null>(null);

  // Mahsulot ro'yxatini ochishni MahsulotTanlov o'zi bajaradi (`ochishSorovi`); miqdor maydoniga fokusni shu yerda beramiz.
  useEffect(() => {
    if (!fokus) return;
    if (fokus.maydon === "miqdor") {
      const maydon = qatorlarRef.current?.querySelector<HTMLInputElement>(`input[data-chiqim-miqdor="${fokus.qatorId}"]`);
      maydon?.focus();
      maydon?.select();
    }
    setFokus(null);
  }, [fokus]);

  const bugun = useMemo(
    () => new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date()),
    []
  );
  const hozir = useMemo(
    () => new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date()),
    []
  );
  const hujjatNomi = t("yangiChiqimModal.docNameTemplate", { number: store.chiqimlar.length + 1 });

  useEffect(() => {
    if (warehouseId) void store.qoldiqlarniYuklash(warehouseId);
    // Store funksiyasi Zustand ichida barqaror.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId]);

  const omborQoldiqlari = useMemo(
    () =>
      store.qoldiqlar.filter(
        (item) => item.warehouseId === warehouseId || item.warehouse?.id === warehouseId
      ),
    [store.qoldiqlar, warehouseId]
  );

  const mavjudMahsulotlar = useMemo(
    () => omborQoldiqlari.filter((item) => Number(qoldiqMiqdori(item)) > 0),
    [omborQoldiqlari]
  );

  const chiqimQiymati = useMemo(
    () =>
      qatorlar.reduce((sum, row) => {
        const mod = store.modifikatsiyalar.find((item) => item.id === row.modificationId);
        return sum + row.quantity * Number(mod?.price?.costPrice ?? 0);
      }, 0),
    [qatorlar, store.modifikatsiyalar]
  );

  function qatorniYangilash(id: string, value: Partial<Qator>) {
    setQatorlar((rows) => rows.map((row) => (row.id === id ? { ...row, ...value } : row)));
  }

  function fokusSoralish(qatorId: string, maydon: "mahsulot" | "miqdor") {
    fokusNavbati.current += 1;
    setFokus({ qatorId, maydon, n: fokusNavbati.current });
  }

  // Tanlash ro'yxati: ombordagi qoldig'i bor mahsulotlar; boshqa qatorda tanlangani ko'rinadi, lekin tanlab bo'lmaydi (takror yo'q).
  function mahsulotVariantlari(qatorId: string): MahsulotVarianti[] {
    const korilgan = new Set<string>();
    const royxat: MahsulotVarianti[] = [];
    for (const item of mavjudMahsulotlar) {
      if (korilgan.has(item.modificationId)) continue;
      korilgan.add(item.modificationId);
      royxat.push({
        id: item.modificationId,
        modification: item.modification ?? store.modifikatsiyalar.find((modification) => modification.id === item.modificationId),
        disabled: qatorlar.some((boshqa) => boshqa.id !== qatorId && boshqa.modificationId === item.modificationId),
      });
    }
    return royxat;
  }

  // Miqdorda Enter: keyingi qatorga o'tadi. Keyingi qator yo'q bo'lsa va joriy qatorda mahsulot bor bo'lsa,
  // yangi qator qo'shiladi va uning mahsulot ro'yxati ochiladi.
  function keyingiQatorgaOtish(qatorId: string) {
    const index = qatorlar.findIndex((row) => row.id === qatorId);
    const joriy = qatorlar[index];
    if (!joriy?.modificationId || !(joriy.quantity > 0)) return;
    const keyingi = qatorlar[index + 1];
    if (keyingi) {
      fokusSoralish(keyingi.id, keyingi.modificationId ? "miqdor" : "mahsulot");
      return;
    }
    const yangi = yangiQator();
    setQatorlar((rows) => [...rows, yangi]);
    fokusSoralish(yangi.id, "mahsulot");
  }

  // Shtrix-kod (yoki artikul) to'liq mos kelsa mahsulot qo'shiladi; qator bor bo'lsa miqdori 1 taga oshadi (qoldiqdan oshmaydi).
  function kodniQoshish(kod: string): SkanNatijasi {
    const mos = kodBilanTopish(
      omborQoldiqlari,
      kod,
      (item) => item.modification ?? store.modifikatsiyalar.find((modification) => modification.id === item.modificationId)
    );
    if (mos.length === 0) return { xato: true, matn: tk("shtrixKod.notFound") };
    if (new Set(mos.map((item) => item.modificationId)).size > 1) return { xato: true, matn: tk("shtrixKod.ambiguous") };
    const qoldiq = mos[0];
    const mod = qoldiq.modification ?? store.modifikatsiyalar.find((modification) => modification.id === qoldiq.modificationId);
    const nom = modificationNomi(mod);
    const mavjud = Number(qoldiqMiqdori(qoldiq));
    if (!(mavjud > 0)) return { xato: true, matn: tk("shtrixKod.outOfStock", { name: nom }) };
    const bor = qatorlar.find((row) => row.modificationId === qoldiq.modificationId);
    if (bor) {
      const yangiMiqdor = Number(bor.quantity || 0) + 1;
      if (yangiMiqdor > mavjud) return { xato: true, matn: tk("shtrixKod.notEnough", { name: nom, available: mavjud }) };
      qatorniYangilash(bor.id, { quantity: yangiMiqdor });
      return { xato: false, matn: tk("shtrixKod.added", { name: nom, qty: yangiMiqdor }) };
    }
    const bosh = qatorlar.find((row) => !row.modificationId);
    if (bosh) {
      qatorniYangilash(bosh.id, { modificationId: qoldiq.modificationId });
      return { xato: false, matn: tk("shtrixKod.added", { name: nom, qty: bosh.quantity || 1 }) };
    }
    setQatorlar((rows) => [...rows, { ...yangiQator(), modificationId: qoldiq.modificationId }]);
    return { xato: false, matn: tk("shtrixKod.added", { name: nom, qty: 1 }) };
  }

  function omborniAlmashtirish(value: string) {
    setWarehouseId(value);
    setQatorlar((rows) => rows.map((row) => ({ ...row, modificationId: "" })));
  }

  async function saqlash(tasdiqlash: boolean) {
    setXato("");
    store.xatolikniTozalash();
    if (!reason) return setXato("yangiChiqimModal.errors.reasonRequired");
    if (!warehouseId) return setXato("yangiChiqimModal.errors.warehouseRequired");
    if (!qatorlar.length || qatorlar.some((row) => !row.modificationId || row.quantity <= 0)) {
      return setXato("yangiChiqimModal.errors.rowsInvalid");
    }
    if (new Set(qatorlar.map((row) => row.modificationId)).size !== qatorlar.length) {
      return setXato("yangiChiqimModal.errors.duplicateProduct");
    }
    const ortiqcha = qatorlar.find((row) => {
      const stock = omborQoldiqlari.find((item) => item.modificationId === row.modificationId);
      return row.quantity > Number(stock ? qoldiqMiqdori(stock) : 0);
    });
    if (ortiqcha) return setXato("yangiChiqimModal.errors.exceedsStock");

    const hujjat = await store.chiqimYaratish({
      warehouseId,
      reason,
      responsibleId: responsibleId || undefined,
      note: note.trim() || undefined,
      items: qatorlar.map(({ modificationId, quantity }) => ({ modificationId, quantity })),
    });
    if (!hujjat) return;
    if (tasdiqlash && !(await store.chiqimTasdiqlash(hujjat.id))) return;
    onClose();
  }

  return (
    <AppModal onClose={onClose} className="sidebar-aligned-document-modal items-stretch p-3 sm:p-5">
      <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-[34px] border border-orange-100 bg-[#F8FAFC] shadow-[0_28px_90px_rgba(15,23,42,.32)]">
        <header className="flex shrink-0 items-center border-b border-orange-100 bg-white/80 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{t("yangiChiqimModal.title")}</h2>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-500">{t("yangiChiqimModal.badge")}</span>
          </div>
        </header>

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
          {(xato || store.xatolik) && (
            <div className="mb-4 flex items-start justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              <span>{xato ? t(xato) : store.xatolik}</span>
              <button type="button" onClick={() => { setXato(""); store.xatolikniTozalash(); }}>{t("yangiChiqimModal.errors.close")}</button>
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
              <SectionTitle icon={<Package size={18} />} text={t("yangiChiqimModal.sections.about")} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field label={t("yangiChiqimModal.fields.docName")}>
                  <input value={hujjatNomi} readOnly className={input} />
                </Field>
                <SelectField
                  label={t("yangiChiqimModal.fields.reason")}
                  value={reason}
                  onChange={(value) => setReason(value as ChiqimSababi | "")}
                  placeholder={t("yangiChiqimModal.fields.reasonPlaceholder")}
                  options={Object.entries(chiqimSabablari).map(([id, name]) => ({ id, name }))}
                />
                <Field label={t("yangiChiqimModal.fields.docDate")}>
                  <div className="relative">
                    <input value={bugun} readOnly className={`${input} pr-11`} />
                    <CalendarDays size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>
                <SelectField
                  label={t("yangiChiqimModal.fields.responsible")}
                  value={responsibleId}
                  onChange={setResponsibleId}
                  placeholder={t("yangiChiqimModal.fields.responsiblePlaceholder")}
                  options={store.xodimlar.map((item) => ({
                    id: item.id,
                    name: item.fullName ?? item.name ?? item.username ?? item.id,
                  }))}
                />
              </div>
            </section>

            <div className="space-y-5">
              <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
                <SectionTitle icon={<MessageSquare size={18} />} text={t("yangiChiqimModal.sections.comment")} />
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder={t("yangiChiqimModal.fields.commentPlaceholder")} className="w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm font-medium text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
              </section>
              <section className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
                <SectionTitle icon={<Clock3 size={18} />} text={t("yangiChiqimModal.sections.history")} />
                <div className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-orange-500" />
                  <div><p className="font-bold text-slate-700">{t("yangiChiqimModal.history.draftCreated")}</p><p className="text-xs font-semibold text-slate-400">{hozir}</p></div>
                </div>
              </section>
            </div>
          </div>

          <section className="mt-5 rounded-[26px] border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">{t("yangiChiqimModal.sections.items")}</h3>
                <p className="mt-1 text-xs font-medium text-slate-400">{t("yangiChiqimModal.items.hint")}</p>
              </div>
              <button type="button" onClick={() => setQatorlar((rows) => [...rows, yangiQator()])} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-100 transition hover:bg-orange-600">
                <Plus size={18} /> {t("yangiChiqimModal.items.addRow")}
              </button>
            </div>

            <div className="mb-4">
              <ShtrixKodMaydoni onSkan={kodniQoshish} inputClassName={input} />
            </div>

            <div className="scrollbar-orange overflow-x-auto pb-2">
              <div ref={qatorlarRef} className="min-w-[1220px] space-y-3">
                <div className="grid grid-cols-[42px_76px_2.1fr_1fr_1fr_1fr_1.35fr_1fr_1fr_48px] gap-3 px-3 text-[13px] font-semibold text-slate-600">
                  <span>{t("yangiChiqimModal.items.columns.number")}</span><span /><span>{t("yangiChiqimModal.items.columns.product")}</span><span>{t("yangiChiqimModal.items.columns.barcode")}</span><span>{t("yangiChiqimModal.items.columns.costPrice")}</span><span>{t("yangiChiqimModal.items.columns.quantity")}</span><span>{t("yangiChiqimModal.items.columns.warehouse")}</span><span>{t("yangiChiqimModal.items.columns.stock")}</span><span>{t("yangiChiqimModal.items.columns.amount")}</span><span />
                </div>
                {qatorlar.map((row, index) => {
                  const mod = store.modifikatsiyalar.find((item) => item.id === row.modificationId);
                  const stock = omborQoldiqlari.find((item) => item.modificationId === row.modificationId);
                  const mavjud = Number(stock ? qoldiqMiqdori(stock) : 0);
                  const narx = Number(mod?.price?.costPrice ?? 0);
                  return (
                    <div key={row.id} className="grid grid-cols-[42px_76px_2.1fr_1fr_1fr_1fr_1.35fr_1fr_1fr_48px] items-center gap-3 rounded-2xl border border-orange-100 bg-[#FFFFFF] p-3">
                      <span className="text-center text-sm font-black text-slate-400">{index + 1}</span>
                      <div className="flex h-12 items-center justify-center rounded-xl border border-dashed border-orange-200 bg-white text-slate-300"><Image size={20} /></div>
                      <MahsulotTanlov
                        value={row.modificationId}
                        variantlar={mahsulotVariantlari(row.id)}
                        onChange={(id) => {
                          qatorniYangilash(row.id, { modificationId: id });
                          // Mahsulot tanlangach fokus shu qatorning miqdoriga o'tadi.
                          fokusSoralish(row.id, "miqdor");
                        }}
                        placeholder={t("yangiChiqimModal.items.selectProduct")}
                        className={input}
                        tanlanganNomi={mod ? modificationNomi(mod) : undefined}
                        ochishSorovi={fokus?.maydon === "mahsulot" && fokus.qatorId === row.id ? fokus.n : 0}
                      />
                      <div className="relative"><Barcode size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={mod?.barcode ?? ""} readOnly placeholder={t("yangiChiqimModal.items.barcodePlaceholder")} className={`${input} pl-9`} /></div>
                      <input value={narx ? narx.toLocaleString("uz-UZ") : "0"} readOnly className={input} />
                      <div className="relative"><input type="number" min="0.001" max={mavjud || undefined} step="0.001" value={row.quantity} data-chiqim-miqdor={row.id} onChange={(event) => qatorniYangilash(row.id, { quantity: Number(event.target.value) })} onKeyDown={(event) => { if (event.key !== "Enter" || event.nativeEvent.isComposing) return; event.preventDefault(); keyingiQatorgaOtish(row.id); }} className={`${input} pr-14`} /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">{t("yangiChiqimModal.items.unit")}</span></div>
                      <div className="relative"><Warehouse size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><AppSelect value={warehouseId} onChange={(event) => omborniAlmashtirish(event.target.value)} className={`${input} appearance-none pl-9 pr-8`}><option value="">{t("yangiChiqimModal.items.selectWarehouse")}</option>{store.omborlar.filter((item) => item.isActive !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</AppSelect><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /></div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2.5"><p className="font-black text-slate-700">{mavjud.toLocaleString("uz-UZ")}</p><p className="truncate text-[10px] font-semibold text-slate-400">{store.omborlar.find((item) => item.id === warehouseId)?.name ?? t("yangiChiqimModal.items.warehouseFallback")}</p></div>
                      <p className="font-black text-emerald-600">{pul(row.quantity * narx)}</p>
                      <button type="button" disabled={qatorlar.length === 1} onClick={() => setQatorlar((rows) => rows.filter((item) => item.id !== row.id))} aria-label={t("yangiChiqimModal.items.removeRowAria")} className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-30"><Trash2 size={17} /></button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex justify-end border-t border-orange-100 pt-4 text-right">
              <div><p className="text-xs font-black uppercase text-slate-400">{t("yangiChiqimModal.items.total")}</p><p className="mt-1 text-2xl font-black text-slate-950">{pul(chiqimQiymati)}</p></div>
            </div>
          </section>
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-orange-100 bg-white/80 px-5 py-4 sm:flex-row sm:justify-end sm:px-8">
          <button type="button" onClick={onClose} className="h-12 rounded-2xl bg-slate-100 px-7 text-sm font-black text-slate-600 transition hover:bg-slate-200">{t("yangiChiqimModal.footer.cancel")}</button>
          <ActionButton busy={store.amalBajarilmoqda} outline onClick={() => void saqlash(false)}>{t("yangiChiqimModal.footer.save")}</ActionButton>
          <ActionButton busy={store.amalBajarilmoqda} onClick={() => void saqlash(true)}>{t("yangiChiqimModal.footer.saveAndConfirm")}</ActionButton>
        </footer>
      </div>
    </AppModal>
  );
}

function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="mb-4 flex items-center gap-2 border-b border-orange-100 pb-4 text-sm font-black uppercase tracking-wide text-slate-600"><span className="text-orange-500">{icon}</span>{text}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2 text-sm font-bold text-slate-500"><span>{label}</span>{children}</label>;
}

function SelectField({ label, value, onChange, placeholder, options }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; options: Array<{ id: string; name: string }> }) {
  return <label className="space-y-2 text-sm font-bold text-slate-500"><span>{label}</span><div className="relative"><AppSelect value={value} onChange={(event) => onChange(event.target.value)} className={`${input} appearance-none pr-10`}><option value="">{placeholder}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</AppSelect><ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" /></div></label>;
}

function ActionButton({ children, busy, outline, onClick }: { children: React.ReactNode; busy: boolean; outline?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} disabled={busy} className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-7 text-sm font-black transition disabled:opacity-50 ${outline ? "border border-orange-300 bg-white text-orange-600 hover:bg-orange-50" : "bg-orange-500 text-white shadow-lg shadow-orange-100 hover:bg-orange-600"}`}>{busy && <LoaderCircle size={17} className="animate-spin" />}{children}</button>;
}
