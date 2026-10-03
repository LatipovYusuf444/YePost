import AppSelect from "@/Components/ui/AppSelect";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Edit3, GitBranch, LoaderCircle, MapPin, Plus, Trash2, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import LoadingState from "@/Components/common/LoadingState";
import TablePagination from "@/Components/common/TablePagination";
import { useOmborStore } from "@/store/omborStore";
import type { Filial } from "@/types/ombor";
import KorinishTanlash, { type RoyxatKorinishi } from "./KorinishTanlash";
import OmborJadval from "./OmborJadval";

const maydonKlass =
  "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none transition-colors focus:border-orange-400 focus:ring-4 focus:ring-orange-100 aria-invalid:border-red-400 aria-invalid:ring-4 aria-invalid:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70";

function ismBoshHarflari(nom: string) {
  return nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((qism) => qism[0]?.toUpperCase())
    .join("");
}

export default function FiliallarBoshqaruvi() {
  const { t } = useTranslation("ombor_kichik");
  const store = useOmborStore();
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState<Filial|null>(null);
  const [name,setName]=useState("");
  const [address,setAddress]=useState("");
  const [status,setStatus]=useState<"ACTIVE"|"INACTIVE">("ACTIVE");
  const [responsibleId,setResponsibleId]=useState("");
  const [korinish, setKorinish] = useState<RoyxatKorinishi>("kartochka");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const sahifadagiFiliallar = useMemo(() => store.filiallar.slice((page - 1) * pageSize, page * pageSize), [store.filiallar, page, pageSize]);
  useEffect(() => setPage(1), [store.filiallar, pageSize]);

  function yangi(){setEditing(null);setName("");setAddress("");setStatus("ACTIVE");setResponsibleId("");store.xatolikniTozalash();setModal(true)}
  async function tahrirlash(id:string){store.xatolikniTozalash();const item=await store.filialOlish(id);if(!item)return;setEditing(item);setName(item.name);setAddress(item.address??"");setStatus(item.status==="INACTIVE"?"INACTIVE":"ACTIVE");setResponsibleId(item.responsibleId??"");setModal(true)}
  async function saqlash(e:FormEvent){e.preventDefault();if(!name.trim())return;const data={name:name.trim(),address:address.trim()||undefined,status,responsibleId:responsibleId||undefined};const ok=editing?await store.filialYangilash(editing.id,data):Boolean(await store.filialYaratish(data));if(ok)setModal(false)}
  async function ochirish(id:string){if(!window.confirm(t("filiallarBoshqaruvi.confirmDelete")))return;await store.filialOchirish(id)}

  const masulNomi = (item: Filial) => store.xodimlar.find((x) => x.id === item.responsibleId)?.fullName;
  const faolmi = (item: Filial) => item.status !== "INACTIVE";

  function holatBelgisi(item: Filial) {
    const faol = faolmi(item);
    return (
      <span
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ring-1 ${
          faol ? "bg-emerald-50 text-emerald-600 ring-emerald-100" : "bg-gray-100 text-gray-500 ring-gray-200"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${faol ? "bg-emerald-500" : "bg-gray-400"}`} />
        {faol ? t("filiallarBoshqaruvi.statusActive") : t("filiallarBoshqaruvi.statusInactive")}
      </span>
    );
  }

  function masulBelgisi(item: Filial) {
    const nom = masulNomi(item);
    return nom ? (
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[11px] font-black text-sky-600 ring-1 ring-sky-100">
          {ismBoshHarflari(nom) || <UserRound size={16} />}
        </span>
        <span className="truncate text-sm font-bold text-slate-800">{nom}</span>
      </div>
    ) : (
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-100">
          <UserRound size={16} />
        </span>
        <span className="truncate text-sm font-semibold text-slate-400">{t("filiallarBoshqaruvi.unassigned")}</span>
      </div>
    );
  }

  const yuklanmoqda = store.yuklanmoqda && store.filiallar.length === 0;

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">{t("filiallarBoshqaruvi.eyebrow")}</p>
        <h1 className="text-3xl font-black">{t("filiallarBoshqaruvi.title")}</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        <KorinishTanlash
          qiymat={korinish}
          onChange={setKorinish}
          sarlavha={t("filiallarBoshqaruvi.viewToggle")}
          jadvalMatni={t("filiallarBoshqaruvi.viewTable")}
          kartochkaMatni={t("filiallarBoshqaruvi.viewCards")}
        />
        <button onClick={yangi} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 font-black text-white"><Plus size={17}/>{t("filiallarBoshqaruvi.addButton")}</button>
      </div>
    </header>

    {yuklanmoqda && <LoadingState matn={t("filiallarBoshqaruvi.loading")} ikonka={<GitBranch size={24} />} />}

    {!yuklanmoqda && korinish === "kartochka" && (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {store.filiallar.map((item) => (
          <article
            key={item.id}
            className="group flex flex-col overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-[0_10px_30px_rgba(37,99,235,.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(37,99,235,.12)]"
          >
            <div className="flex-1 p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-white text-orange-500 ring-1 ring-orange-100 transition duration-300 group-hover:-rotate-6 group-hover:scale-105">
                  <GitBranch size={22} />
                </span>
                {holatBelgisi(item)}
              </div>

              <h2 className="mt-4 truncate text-xl font-black text-slate-950">{item.name}</h2>
              <p className="mt-1.5 flex items-start gap-1.5 text-sm font-semibold text-slate-500" title={item.address || undefined}>
                <MapPin size={15} className="mt-0.5 shrink-0 text-slate-300" />
                <span className={`line-clamp-2 ${item.address ? "" : "text-slate-400"}`}>{item.address ?? t("filiallarBoshqaruvi.noAddress")}</span>
              </p>

              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
                <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">{t("filiallarBoshqaruvi.responsibleLabel")}</p>
                {masulBelgisi(item)}
              </div>
            </div>

            <div className="flex gap-2 border-t border-orange-100 bg-orange-50/40 p-4">
              <button
                onClick={() => void tahrirlash(item.id)}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-orange-600 ring-1 ring-orange-100 transition hover:bg-orange-100"
              >
                <Edit3 size={15} />
                {t("filiallarBoshqaruvi.editButton")}
              </button>
              <button
                onClick={() => void ochirish(item.id)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100"
                aria-label={t("filiallarBoshqaruvi.deleteAria", { name: item.name })}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
        {store.filiallar.length === 0 && <div className="col-span-full rounded-2xl border border-dashed p-12 text-center text-gray-400">{t("filiallarBoshqaruvi.empty")}</div>}
      </div>
    )}

    {!yuklanmoqda && korinish === "jadval" && (
      <>
        <OmborJadval>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-4! py-4">{t("filiallarBoshqaruvi.table.name")}</th>
                <th className="px-4! py-4">{t("filiallarBoshqaruvi.table.address")}</th>
                <th className="px-4! py-4">{t("filiallarBoshqaruvi.table.responsible")}</th>
                <th className="px-4! py-4">{t("filiallarBoshqaruvi.table.status")}</th>
                <th className="w-28 px-4! py-4 text-right">
                  <span className="sr-only">{t("filiallarBoshqaruvi.table.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sahifadagiFiliallar.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => void tahrirlash(item.id)}
                  className="cursor-pointer transition hover:bg-orange-50/50"
                >
                  <td className="px-4! py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 ring-1 ring-orange-100">
                        <GitBranch size={19} />
                      </span>
                      <span className="whitespace-nowrap font-black text-gray-950">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4! py-4 text-sm font-semibold">
                    <p
                      title={item.address || undefined}
                      className={`line-clamp-2 min-w-52 max-w-96 leading-5 ${item.address ? "text-gray-600" : "text-slate-400"}`}
                    >
                      {item.address ?? t("filiallarBoshqaruvi.noAddress")}
                    </p>
                  </td>
                  <td className="px-4! py-4">
                    {masulBelgisi(item)}
                  </td>
                  <td className="px-4! py-4">
                    {holatBelgisi(item)}
                  </td>
                  <td className="px-4! py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void tahrirlash(item.id);
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition hover:bg-orange-100"
                        aria-label={t("filiallarBoshqaruvi.editAria", { name: item.name })}
                        title={t("filiallarBoshqaruvi.editButton")}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void ochirish(item.id);
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100"
                        aria-label={t("filiallarBoshqaruvi.deleteAria", { name: item.name })}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {store.filiallar.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-gray-400">
                    <GitBranch className="mx-auto text-orange-200" size={42} />
                    <p className="mt-3 font-bold text-gray-500">{t("filiallarBoshqaruvi.empty")}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </OmborJadval>
        <TablePagination page={page} pageSize={pageSize} totalItems={store.filiallar.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </>
    )}

    {modal&&<AppModal><form onSubmit={saqlash} className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl"><h2 className="text-2xl font-black">{editing?t("filiallarBoshqaruvi.modalEditTitle"):t("filiallarBoshqaruvi.modalNewTitle")}</h2>{store.xatolik&&<div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{store.xatolik}</div>}<div className="mt-5 space-y-3"><input value={name} onChange={e=>setName(e.target.value)} className={maydonKlass} placeholder={t("filiallarBoshqaruvi.namePlaceholder")}/><textarea value={address} onChange={e=>setAddress(e.target.value)} className={`${maydonKlass} h-auto min-h-24 py-3`} placeholder={t("filiallarBoshqaruvi.addressPlaceholder")}/><AppSelect value={status} onChange={e=>setStatus(e.target.value as "ACTIVE"|"INACTIVE")} className={maydonKlass}><option value="ACTIVE">{t("filiallarBoshqaruvi.statusActive")}</option><option value="INACTIVE">{t("filiallarBoshqaruvi.statusInactive")}</option></AppSelect><AppSelect value={responsibleId} onChange={e=>setResponsibleId(e.target.value)} className={maydonKlass}><option value="">{t("filiallarBoshqaruvi.responsiblePlaceholder")}</option>{store.xodimlar.map(x=><option key={x.id} value={x.id}>{x.fullName??x.username??x.id}</option>)}</AppSelect></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={()=>setModal(false)} className="h-11 rounded-2xl bg-gray-100 px-5 font-bold">{t("filiallarBoshqaruvi.closeButton")}</button><button disabled={store.amalBajarilmoqda} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white disabled:opacity-50">{store.amalBajarilmoqda&&<LoaderCircle size={16} className="animate-spin"/>}{t("filiallarBoshqaruvi.saveButton")}</button></div></form></AppModal>}
  </div>
}
