import { type MouseEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Copy,
  Edit3,
  FileText,
  LoaderCircle,
  MoreHorizontal,
  PackageOpen,
  PlayCircle,
  Plus,
  Printer,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import type { DraftStatus, MijozTanlovi, QoldiqTanlovi, Sotuv, XodimTanlovi } from "@/types/savdo";
import { draftSalesService, saleToDraftSale } from "@/api/draftSalesService";
import { pulniFormatlash, sotuvHolati } from "./savdoYordamchilari";
import SavdoSelect from "./SavdoSelect";

type SavatchaProps = {
  sotuvlar: Sotuv[];
  xodimlar: XodimTanlovi[];
  mijozlar: MijozTanlovi[];
  qoldiqlar: QoldiqTanlovi[];
  amalBajarilmoqda?: boolean;
  onQoshish: () => void;
  onSotuvniOchish: (sotuv: Sotuv) => void;
  onDavomEttirish: (sotuv: Sotuv) => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
  onXabar: (xabar: string) => void;
};

const statusOptions: Array<{ value: DraftStatus | "all"; label: string }> = [
  { value: "all", label: "Barchasi" },
  { value: "draft", label: "Qoralama" },
  { value: "waiting", label: "Kutilmoqda" },
  { value: "editing", label: "Tahrirlanmoqda" },
  { value: "cancelled", label: "Bekor qilingan" },
];

const sanaOptions = [
  { value: "today", label: "Bugun" },
  { value: "yesterday", label: "Kecha" },
  { value: "7", label: "Oxirgi 7 kun" },
  { value: "30", label: "Oxirgi 30 kun" },
];

const statusMatni: Record<DraftStatus, string> = {
  draft: "Qoralama",
  waiting: "Kutilmoqda",
  editing: "Tahrirlanmoqda",
  paid: "To'lov qilindi",
  cancelled: "Bekor qilingan",
};

function sanaMatni(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sanaFilterdanOtadi(value: string | undefined, filter: string) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  if (filter === "today") return date >= start;
  if (filter === "yesterday") {
    const yesterdayStart = new Date(start);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    return date >= yesterdayStart && date < start;
  }

  const days = Number(filter);
  const since = new Date(start);
  since.setDate(since.getDate() - Math.max(days - 1, 0));
  return date >= since;
}

function qoldiqYetarlimi(sotuv: Sotuv, qoldiqlar: QoldiqTanlovi[]) {
  return (sotuv.items ?? []).every((item) => {
    const qoldiq = qoldiqlar.find((stock) => stock.modificationId === item.modificationId);
    return Number(qoldiq?.quantity ?? qoldiq?.balance ?? 0) >= Number(item.quantity ?? 0);
  });
}

function ochirilganMahsulotBormi(sotuv: Sotuv, qoldiqlar: QoldiqTanlovi[]) {
  return (sotuv.items ?? []).some(
    (item) => !qoldiqlar.some((stock) => stock.modificationId === item.modificationId)
  );
}

export default function Savatcha({
  sotuvlar,
  xodimlar,
  mijozlar,
  qoldiqlar,
  amalBajarilmoqda = false,
  onQoshish,
  onSotuvniOchish,
  onDavomEttirish,
  onRefresh,
  onXabar,
}: SavatchaProps) {
  const [qidiruv, setQidiruv] = useState("");
  const [statusFilter, setStatusFilter] = useState<DraftStatus | "all">("all");
  const [sanaFilter, setSanaFilter] = useState("30");
  const [xodimFilter, setXodimFilter] = useState("all");
  const [mijozFilter, setMijozFilter] = useState("all");
  const [ochiqMenuId, setOchiqMenuId] = useState<string | null>(null);
  const [menuJoylashuvi, setMenuJoylashuvi] = useState<{ top: number; left: number } | null>(null);
  const [amalId, setAmalId] = useState<string | null>(null);
  const [sahifa, setSahifa] = useState(1);
  const pageSize = 10;

  const qoralamaSotuvlar = useMemo(
    () => sotuvlar.filter((sotuv) => sotuvHolati(sotuv) === "DRAFT" || sotuvHolati(sotuv) === "CANCELLED"),
    [sotuvlar]
  );
  const qoralamalar = useMemo(() => qoralamaSotuvlar.map(saleToDraftSale), [qoralamaSotuvlar]);

  const filtered = useMemo(() => {
    const search = qidiruv.trim().toLowerCase();

    return qoralamalar.filter((draft) => {
      const matchesSearch =
        !search ||
        [
          draft.id,
          draft.draftNumber,
          draft.customerName,
          draft.customerPhone,
          draft.responsibleUserName,
          draft.finalAmount,
          draft.totalAmount,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);
      const matchesStatus = statusFilter === "all" || draft.status === statusFilter;
      const matchesDate = sanaFilterdanOtadi(draft.createdAt, sanaFilter);
      const matchesEmployee = xodimFilter === "all" || draft.responsibleUserId === xodimFilter;
      const matchesCustomer = mijozFilter === "all" || draft.customerId === mijozFilter;

      return matchesSearch && matchesStatus && matchesDate && matchesEmployee && matchesCustomer;
    });
  }, [mijozFilter, qidiruv, qoralamalar, sanaFilter, statusFilter, xodimFilter]);

  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const currentPage = Math.min(sahifa, totalPages);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (!ochiqMenuId) return;

    function yopish() {
      setOchiqMenuId(null);
      setMenuJoylashuvi(null);
    }

    window.addEventListener("resize", yopish);
    window.addEventListener("scroll", yopish, true);
    return () => {
      window.removeEventListener("resize", yopish);
      window.removeEventListener("scroll", yopish, true);
    };
  }, [ochiqMenuId]);

  function amallarMenyusiniOchish(event: MouseEvent<HTMLButtonElement>, draftId: string) {
    if (ochiqMenuId === draftId) {
      setOchiqMenuId(null);
      setMenuJoylashuvi(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 190;
    const viewportPadding = 12;

    setOchiqMenuId(draftId);
    setMenuJoylashuvi({
      top: rect.bottom + 8,
      left: Math.min(
        Math.max(viewportPadding, rect.right - menuWidth),
        window.innerWidth - menuWidth - viewportPadding
      ),
    });
  }

  async function actionBajarish(sotuv: Sotuv, action: "continue" | "edit" | "duplicate" | "print" | "cancel" | "delete") {
    setOchiqMenuId(null);
    setMenuJoylashuvi(null);

    if (action === "edit") {
      onSotuvniOchish(sotuv);
      return;
    }

    if (action === "continue") {
      if (ochirilganMahsulotBormi(sotuv, qoldiqlar)) {
        window.alert("Qoralamadagi ayrim mahsulotlar o'chirilgan. Mahsulotni qayta tanlang.");
      }
      if (!qoldiqYetarlimi(sotuv, qoldiqlar)) {
        window.alert("Omborda yetarli mahsulot mavjud emas.");
        return;
      }
      await draftSalesService.continueDraft(sotuv.id);
      await onDavomEttirish(sotuv);
      onXabar("Qoralama savdo oynasiga yuklandi.");
      return;
    }

    if (action === "print") {
      window.print();
      return;
    }

    setAmalId(sotuv.id);
    try {
      if (action === "duplicate") {
        await draftSalesService.duplicateDraft(sotuv.id);
        onXabar("Qoralama nusxasi yaratildi.");
      } else if (action === "cancel") {
        const reason = window.prompt("Bekor qilish sababini kiriting:");
        if (reason === null) return;
        await draftSalesService.cancelDraft(sotuv.id, reason.trim() || "Sabab kiritilmagan");
        onXabar("Qoralama bekor qilindi.");
      } else if (action === "delete") {
        const ok = window.confirm("Qoralamani o'chirasizmi? Audit backendda saqlanadi.");
        if (!ok) return;
        await draftSalesService.deleteDraft(sotuv.id);
        onXabar("Qoralama o'chirildi yoki bekor qilindi.");
      }
      await onRefresh();
    } finally {
      setAmalId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[30px] border border-orange-100/80 bg-white shadow-[0_18px_60px_rgba(249,115,22,0.08)]">
        <div className="flex flex-col gap-4 border-b border-orange-100/80 px-6 py-6 lg:flex-row lg:items-start lg:justify-between xl:px-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Savdo</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">Qoralamalar</h1>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              Qoralama saqlanganda ombor va kassa o'zgarmaydi. To'lovdan keyin savdoga aylanadi.
            </p>
          </div>
          <button
            type="button"
            onClick={onQoshish}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(249,115,22,.24)] transition hover:-translate-y-0.5 hover:bg-orange-600"
          >
            <Plus size={17} />
            Qo'shish
          </button>
        </div>

        <div className="grid gap-3 px-6 py-5 xl:grid-cols-[minmax(240px,1.2fr)_160px_170px_190px_190px] xl:px-10">
          <label className="flex h-11 items-center gap-2 rounded-2xl border border-orange-100 bg-[#FFF8EF]/70 px-4 transition focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
            <Search size={18} className="shrink-0 text-orange-300" />
            <input
              value={qidiruv}
              onChange={(event) => {
                setQidiruv(event.target.value);
                setSahifa(1);
              }}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="Qoralama ID, mijoz, telefon, mas'ul, summa"
            />
          </label>

          <SavdoSelect
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value as DraftStatus | "all");
              setSahifa(1);
            }}
            options={statusOptions}
            buttonClassName="h-11 rounded-2xl px-4 text-sm"
            dropdownClassName="min-w-[210px]"
            portal
          />
          <SavdoSelect
            value={sanaFilter}
            onChange={(value) => {
              setSanaFilter(value);
              setSahifa(1);
            }}
            options={sanaOptions}
            buttonClassName="h-11 rounded-2xl px-4 text-sm"
            dropdownClassName="min-w-[210px]"
            portal
          />
          <SavdoSelect
            value={xodimFilter}
            onChange={(value) => {
              setXodimFilter(value);
              setSahifa(1);
            }}
            options={[
              { value: "all", label: "Barcha xodimlar" },
              ...xodimlar.map((xodim) => ({
                value: xodim.id,
                label: xodim.fullName || xodim.name || xodim.username || xodim.id,
              })),
            ]}
            buttonClassName="h-11 rounded-2xl px-4 text-sm"
            dropdownClassName="min-w-[240px]"
            portal
          />
          <SavdoSelect
            value={mijozFilter}
            onChange={(value) => {
              setMijozFilter(value);
              setSahifa(1);
            }}
            options={[
              { value: "all", label: "Barcha mijozlar" },
              ...mijozlar.map((mijoz) => ({
                value: mijoz.id,
                label:
                  [mijoz.firstName, mijoz.lastName].filter(Boolean).join(" ") ||
                  mijoz.fullName ||
                  mijoz.name ||
                  mijoz.id,
              })),
            ]}
            buttonClassName="h-11 rounded-2xl px-4 text-sm"
            dropdownClassName="min-w-[260px]"
            portal
          />
        </div>

        <div className="px-6 pb-6 xl:px-10">
          <div className="overflow-x-auto rounded-[24px] border border-orange-100">
            <table className="w-full min-w-[1210px] border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[66px]" />
                <col className="w-[190px]" />
                <col className="w-[170px]" />
                <col className="w-[150px]" />
                <col className="w-[150px]" />
                <col className="w-[130px]" />
                <col className="w-[190px]" />
                <col className="w-[170px]" />
                <col className="w-[170px]" />
                <col className="w-[100px]" />
              </colgroup>
              <thead className="bg-[#FFF8EF] text-xs font-black uppercase tracking-wide text-orange-600">
                <tr>
                  {[
                    "T/r",
                    "Mijoz nomi",
                    "Telefon raqam",
                    "Mahsulotlar soni",
                    "Summa",
                    "Holat",
                    "Mas'ul shaxs",
                    "Sana",
                    "Oxirgi tahrir",
                    "Amallar",
                  ].map((title) => (
                    <th key={title} className="whitespace-nowrap border-b border-orange-100 px-4 py-3 align-middle font-black">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-[13px] text-slate-700">
                {visibleRows.map((draft, index) => {
                  const sotuv = qoralamaSotuvlar.find((item) => item.id === draft.id);
                  if (!sotuv) return null;
                  const mijozRaqami = (currentPage - 1) * pageSize + index + 1;
                  const statusTone =
                    draft.status === "cancelled"
                      ? "bg-red-50 text-red-600 ring-red-100"
                      : draft.status === "editing"
                        ? "bg-amber-50 text-amber-700 ring-amber-100"
                        : "bg-orange-50 text-orange-600 ring-orange-100";

                  return (
                    <tr
                      key={draft.id}
                      onClick={() => onSotuvniOchish(sotuv)}
                      className="cursor-pointer transition hover:bg-orange-50/45"
                      title="Qoralama tafsilotlarini ochish"
                    >
                      <td className="whitespace-nowrap border-b border-orange-50 px-4 py-4 align-middle font-black text-slate-700">
                        {mijozRaqami}
                      </td>
                      <td className="border-b border-orange-50 px-4 py-4 align-middle">
                        <span
                          className="block max-w-[170px] truncate whitespace-nowrap font-bold text-slate-800"
                          title={draft.customerName}
                        >
                          {draft.customerName}
                        </span>
                      </td>
                      <td className="whitespace-nowrap border-b border-orange-50 px-4 py-4 align-middle">{draft.customerPhone || "-"}</td>
                      <td className="whitespace-nowrap border-b border-orange-50 px-4 py-4 text-center align-middle font-semibold">{draft.items.length}</td>
                      <td className="whitespace-nowrap border-b border-orange-50 px-4 py-4 align-middle font-black text-emerald-700">{pulniFormatlash(draft.finalAmount || draft.totalAmount)}</td>
                      <td className="whitespace-nowrap border-b border-orange-50 px-4 py-4 align-middle">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${statusTone}`}>
                          {statusMatni[draft.status]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap border-b border-orange-50 px-4 py-4 align-middle">{draft.responsibleUserName}</td>
                      <td className="whitespace-nowrap border-b border-orange-50 px-4 py-4 align-middle">{sanaMatni(draft.createdAt)}</td>
                      <td className="whitespace-nowrap border-b border-orange-50 px-4 py-4 align-middle">{sanaMatni(draft.updatedAt)}</td>
                      <td className="relative whitespace-nowrap border-b border-orange-50 px-4 py-4 align-middle">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            amallarMenyusiniOchish(event, draft.id);
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition hover:bg-orange-100"
                          aria-label="Qoralama amallari"
                        >
                          {amalId === draft.id || amalBajarilmoqda ? <LoaderCircle size={16} className="animate-spin" /> : <MoreHorizontal size={18} />}
                        </button>
                        {ochiqMenuId === draft.id &&
                          menuJoylashuvi &&
                          createPortal(
                            <div
                              className="fixed z-[100020] w-[190px] rounded-xl bg-white p-1.5 shadow-[0_18px_42px_rgba(92,38,8,.18)] ring-1 ring-orange-100"
                              style={menuJoylashuvi}
                            >
                              {[
                                { key: "continue", label: "Davom ettirish", icon: PlayCircle },
                                { key: "edit", label: "Tahrirlash", icon: Edit3 },
                                { key: "duplicate", label: "Nusxa olish", icon: Copy },
                                { key: "print", label: "Chop etish", icon: Printer },
                                { key: "cancel", label: "Bekor qilish", icon: XCircle },
                                { key: "delete", label: "O'chirish", icon: Trash2, danger: true },
                              ].map((item) => {
                                const Icon = item.icon;
                                return (
                                  <button
                                    key={item.key}
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void actionBajarish(sotuv, item.key as Parameters<typeof actionBajarish>[1]);
                                    }}
                                    className={`flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm font-semibold transition ${
                                      item.danger
                                        ? "text-red-500 hover:bg-red-50"
                                        : "text-slate-700 hover:bg-orange-50 hover:text-orange-600"
                                    }`}
                                  >
                                    <Icon size={15} />
                                    {item.label}
                                  </button>
                                );
                              })}
                            </div>,
                            document.body
                          )}
                      </td>
                    </tr>
                  );
                })}

                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-20 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-orange-50 text-orange-500">
                        <PackageOpen size={32} />
                      </div>
                      <p className="mt-4 text-lg font-black text-slate-700">Qoralama sotuvlar mavjud emas</p>
                      <p className="mt-1 text-sm font-semibold text-slate-400">
                        Serverdan ma'lumot kelganda shu yerda ko'rinadi.
                      </p>
                      <button
                        type="button"
                        onClick={onQoshish}
                        className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(249,115,22,.22)] transition hover:bg-orange-600"
                      >
                        <Plus size={17} />
                        Qoralama yaratish
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Jami: {filtered.length} ta qoralama. Sahifa {currentPage}/{totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setSahifa((page) => Math.max(page - 1, 1))}
                className="h-10 rounded-xl border border-orange-100 bg-white px-4 transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-40"
              >
                Oldingi
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setSahifa((page) => Math.min(page + 1, totalPages))}
                className="h-10 rounded-xl border border-orange-100 bg-white px-4 transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-40"
              >
                Keyingi
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Jami qoralamalar" value={String(qoralamalar.length)} />
        <StatCard label="Bugungi qoralamalar" value={String(qoralamalar.filter((draft) => sanaFilterdanOtadi(draft.createdAt, "today")).length)} />
        <StatCard label="Bekor qilingan qoralamalar" value={String(qoralamalar.filter((draft) => draft.status === "cancelled").length)} />
        <StatCard label="To'lovga aylangan" value={String(sotuvlar.filter((sotuv) => sotuvHolati(sotuv) === "CONFIRMED").length)} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-orange-100 bg-white p-4 shadow-[0_14px_34px_rgba(249,115,22,.07)]">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
          <FileText size={18} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
