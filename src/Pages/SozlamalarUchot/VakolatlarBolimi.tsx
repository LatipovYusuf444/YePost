import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { foydalanuvchilarApi, vakolatlarApi } from "@/api/accountsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { AccountFoydalanuvchi, AccountVakolati, VakolatKodi } from "@/types/account";
import { BolimKarta, Switch } from "./UmumiyUI";

const vakolatlar: Array<{ code: VakolatKodi; nom: string }> = [
  { code: "DELETE", nom: "O'chirish" },
  { code: "REPORTS", nom: "Hisobotlar" },
  { code: "EXPENSE", nom: "Xarajat" },
  { code: "CASH_IN", nom: "Kassa kirimi" },
  { code: "RETURN_CANCEL", nom: "Qaytarish / bekor qilish" },
];

export default function VakolatlarBolimi() {
  const [xodimlar, setXodimlar] = useState<AccountFoydalanuvchi[]>([]);
  const [grantlar, setGrantlar] = useState<AccountVakolati[]>([]);
  const [qidiruv, setQidiruv] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [amal, setAmal] = useState("");
  const [xato, setXato] = useState("");

  async function yuklash() {
    setYuklanmoqda(true); setXato("");
    try { const [users, grants] = await Promise.all([foydalanuvchilarApi.royxat(), vakolatlarApi.royxat()]); setXodimlar(users); setGrantlar(grants); }
    catch (error) { setXato(getApiErrorMessage(error)); }
    finally { setYuklanmoqda(false); }
  }
  useEffect(() => { void yuklash(); }, []);

  const korinadiganlar = useMemo(() => {
    const q = qidiruv.trim().toLowerCase();
    return xodimlar.filter((x) => !q || `${x.fullName ?? ""} ${x.username} ${x.role}`.toLowerCase().includes(q));
  }, [qidiruv, xodimlar]);

  async function almashtir(userId: string, code: VakolatKodi) {
    const key = `${userId}:${code}`;
    const mavjud = grantlar.find((g) => g.userId === userId && g.code === code && !g.isDeleted);
    setAmal(key); setXato("");
    try {
      const saved = mavjud
        ? await vakolatlarApi.yangilash(mavjud.id, { isActive: !mavjud.isActive })
        : await vakolatlarApi.yaratish({ userId, code, isActive: true });
      setGrantlar((items) => items.some((g) => g.id === saved.id) ? items.map((g) => g.id === saved.id ? saved : g) : [...items, saved]);
    } catch (error) { setXato(getApiErrorMessage(error)); }
    finally { setAmal(""); }
  }

  return <BolimKarta sarlavha="Vakolatlar" izoh="Xodimlarning qo'shimcha vakolatlari real accounts/grants orqali boshqariladi.">
    {xato && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}
    <label className="mb-4 flex h-11 max-w-md items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-orange-400"><Search size={17} className="text-slate-400"/><input value={qidiruv} onChange={(e) => setQidiruv(e.target.value)} placeholder="Xodimni qidirish" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"/></label>
    {yuklanmoqda ? <div className="flex h-40 items-center justify-center gap-2 text-sm font-bold text-slate-400"><LoaderCircle className="animate-spin" size={20}/>Vakolatlar yuklanmoqda...</div> : <div className="overflow-x-auto rounded-2xl border border-orange-100"><table className="min-w-[820px] w-full text-left"><thead className="bg-orange-50/60"><tr><th className="px-4 py-3 text-xs font-black uppercase text-orange-600">Xodim</th>{vakolatlar.map((v) => <th key={v.code} className="px-3 py-3 text-center text-xs font-black uppercase text-orange-600">{v.nom}</th>)}</tr></thead><tbody className="divide-y divide-orange-100">{korinadiganlar.map((user) => <tr key={user.id} className="hover:bg-orange-50/30"><td className="px-4 py-3"><p className="font-black text-slate-800">{user.fullName || user.username}</p><p className="text-xs font-bold text-slate-400">{user.role}</p></td>{vakolatlar.map((v) => { const grant = grantlar.find((g) => g.userId === user.id && g.code === v.code && !g.isDeleted); const key = `${user.id}:${v.code}`; return <td key={v.code} className="px-3 py-3"><div className="flex justify-center"><Switch yoniq={Boolean(grant?.isActive)} onChange={() => amal || void almashtir(user.id, v.code)}/>{amal === key && <LoaderCircle className="ml-2 animate-spin text-orange-500" size={16}/>}</div></td>; })}</tr>)}{korinadiganlar.length === 0 && <tr><td colSpan={vakolatlar.length + 1} className="p-10 text-center text-sm font-bold text-slate-400">Xodim topilmadi</td></tr>}</tbody></table></div>}
  </BolimKarta>;
}
