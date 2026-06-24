import { useState, type FormEvent } from "react";
import { Eye, LoaderCircle, Plus } from "lucide-react";
import { useTenantStore } from "@/store/tenantStore";
import type { Obuna, ObunaDavri, ObunaHolati } from "@/types/tenant";
import {
  obunaDavriMatni,
  obunaHolatiMatni,
  tarifTuriMatni,
} from "./tenantMatnlari";

function sanaMaydoni(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function Profil() {
  const store = useTenantStore();
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState<Obuna | null>(null);
  const [tariffId, setTariffId] = useState("");
  const [period, setPeriod] = useState<ObunaDavri>("MONTHLY");
  const [status, setStatus] = useState<ObunaHolati>("ACTIVE");
  const [startDate, setStartDate] = useState(sanaMaydoni(new Date()));
  const tugash = new Date();
  tugash.setMonth(tugash.getMonth() + 1);
  const [endDate, setEndDate] = useState(sanaMaydoni(tugash));

  function tarifNomi(id: string) {
    const tarif = store.tariflar.find((item) => item.id === id);
    return tarif ? `${tarifTuriMatni[tarif.type]} tarif` : "Noma'lum tarif";
  }

  async function ochish(id: string) {
    const item = await store.obunaOlish(id);
    if (item) setDetail(item);
  }

  async function saqlash(event: FormEvent) {
    event.preventDefault();
    if (!tariffId || !startDate || !endDate) return;
    if (
      !window.confirm(
        "Yangi obuna yaratilsinmi? Yaratilgan obunani keyin tahrirlash yoki o'chirish imkoniyati mavjud emas."
      )
    )
      return;

    const ok = await store.obunaYaratish({
      tariffId,
      period,
      status,
      startDate: new Date(`${startDate}T00:00:00Z`).toISOString(),
      endDate: new Date(`${endDate}T00:00:00Z`).toISOString(),
    });
    if (ok) setModal(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            Obuna boshqaruvi
          </p>
          <h2 className="text-2xl font-black">Obunalar</h2>
          <p className="text-sm text-gray-500">
            Obunalarni ko'rish, tafsilotlarini ochish va yangi obuna yaratish mumkin.
          </p>
        </div>
        <button onClick={() => { setTariffId(store.tariflar[0]?.id ?? ""); setModal(true); }} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-4 font-black text-white">
          <Plus size={17} /> Yangi obuna
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-orange-100 bg-white">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-orange-50">
            <tr>
              <th className="px-5 py-4">Ish maydoni</th>
              <th className="px-5 py-4">Tarif</th>
              <th className="px-5 py-4">Davri</th>
              <th className="px-5 py-4">Holati</th>
              <th className="px-5 py-4">Boshlanishi</th>
              <th className="px-5 py-4">Tugashi</th>
              <th className="px-5 py-4 text-right">Tafsilot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-100">
            {store.obunalar.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-4 font-bold">
                  {store.workspacelar.find((x) => x.id === item.workspaceId)?.name ??
                    item.workspaceId}
                </td>
                <td className="px-5 py-4">{tarifNomi(item.tariffId)}</td>
                <td className="px-5 py-4">{obunaDavriMatni[item.period]}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-600"}`}>
                    {obunaHolatiMatni[item.status]}
                  </span>
                </td>
                <td className="px-5 py-4">{new Date(item.startDate).toLocaleDateString("uz-UZ")}</td>
                <td className="px-5 py-4">{new Date(item.endDate).toLocaleDateString("uz-UZ")}</td>
                <td className="px-5 py-4 text-right">
                  <button onClick={() => void ochish(item.id)} className="inline-flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 font-bold text-orange-600">
                    <Eye size={15} /> Ko'rish
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4">
          <form onSubmit={saqlash} className="w-full max-w-lg rounded-[28px] bg-white p-6">
            <h2 className="text-2xl font-black">Yangi obuna</h2>
            {store.xatolik && <div className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-600">{store.xatolik}</div>}
            <div className="mt-5 space-y-3">
              <label className="block text-sm font-bold">
                Tarif *
                <select value={tariffId} onChange={(event) => setTariffId(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border px-4">
                  <option value="">Tarifni tanlang</option>
                  {store.tariflar.filter((x) => x.isActive).map((x) => (
                    <option key={x.id} value={x.id}>
                      {tarifTuriMatni[x.type]} tarif — {Number(x.monthlyPrice).toLocaleString("uz-UZ")} so'm
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-bold">
                Obuna davri
                <select value={period} onChange={(event) => setPeriod(event.target.value as ObunaDavri)} className="mt-2 h-12 w-full rounded-2xl border px-4">
                  <option value="MONTHLY">Oylik</option>
                  <option value="QUARTERLY">Choraklik</option>
                  <option value="ANNUAL">Yillik</option>
                </select>
              </label>
              <label className="block text-sm font-bold">
                Obuna holati
                <select value={status} onChange={(event) => setStatus(event.target.value as ObunaHolati)} className="mt-2 h-12 w-full rounded-2xl border px-4">
                  <option value="TRIAL">Sinov muddati</option>
                  <option value="ACTIVE">Faol</option>
                  <option value="EXPIRED">Muddati tugagan</option>
                  <option value="CANCELLED">Bekor qilingan</option>
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-bold">
                  Boshlanish sanasi
                  <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border px-4" />
                </label>
                <label className="text-sm font-bold">
                  Tugash sanasi
                  <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border px-4" />
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(false)} className="h-11 rounded-2xl bg-gray-100 px-5 font-bold">Bekor qilish</button>
              <button disabled={store.amalBajarilmoqda} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-500 px-5 font-black text-white disabled:opacity-50">
                {store.amalBajarilmoqda && <LoaderCircle size={16} className="animate-spin" />}
                Obuna yaratish
              </button>
            </div>
          </form>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6">
            <h2 className="text-2xl font-black">Obuna tafsiloti</h2>
            <div className="mt-5 space-y-3 rounded-2xl bg-gray-50 p-4 text-sm">
              <p><b>Obuna raqami:</b> {detail.id}</p>
              <p><b>Ish maydoni:</b> {store.workspacelar.find((x) => x.id === detail.workspaceId)?.name ?? detail.workspaceId}</p>
              <p><b>Tarif:</b> {tarifNomi(detail.tariffId)}</p>
              <p><b>Davri:</b> {obunaDavriMatni[detail.period]}</p>
              <p><b>Holati:</b> {obunaHolatiMatni[detail.status]}</p>
              <p><b>Boshlanishi:</b> {new Date(detail.startDate).toLocaleString("uz-UZ")}</p>
              <p><b>Tugashi:</b> {new Date(detail.endDate).toLocaleString("uz-UZ")}</p>
            </div>
            <div className="mt-6 text-right">
              <button onClick={() => setDetail(null)} className="h-11 rounded-2xl bg-orange-500 px-5 font-black text-white">Yopish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
