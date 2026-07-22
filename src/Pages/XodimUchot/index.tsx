import { useCallback, useEffect, useState } from "react";
import TashkilotTuzilmasi from "./TashkilotTuzilmasi";
import Xodimlar from "./Xodimlar";
import { foydalanuvchilarApi, vakolatlarApi } from "@/api/accountsApi";
import { filiallarApi } from "@/api/omborApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { AccountFoydalanuvchi, AccountRoli, AccountVakolati, VakolatKodi } from "@/types/account";
import type { Filial } from "@/types/ombor";
import { backendLavozimlar } from "./backendMetadata";
import type { Bolim, Lavozim, Xodim } from "./types";

// Vakolatlar endi Sozlamalarda (SozlamalarUchot/VakolatlarBolimi).
// "Tashkilot tuzilmasi" — tab emas: bosilganda to'liq ekranli oyna ochadi.
type Tab = "xodimlar";

const tablar: Array<{ id: Tab; nom: string }> = [{ id: "xodimlar", nom: "Xodimlar" }];

function ismniAjratish(fullName?: string | null) {
  const qismlar = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return { ism: qismlar[0] ?? "", familiya: qismlar.slice(1).join(" ") };
}

function filialBolimi(filial: Filial): Bolim {
  return { id: filial.id, nomi: filial.name, otaId: "", rahbarIdlar: filial.responsibleId ? [filial.responsibleId] : [] };
}

function accountXodimi(user: AccountFoydalanuvchi, filiallar: Filial[]): Xodim {
  const ism = ismniAjratish(user.fullName || user.username);
  const filial = filiallar.find((item) => item.id === user.branchId);
  return {
    id: user.id,
    ism: ism.ism,
    familiya: ism.familiya,
    telefonlar: user.phone ? [user.phone] : [],
    login: user.username,
    lavozimId: user.role,
    bolimId: user.branchId ?? "",
    filial: filial?.name ?? "",
    manzil: filial?.address ?? "",
    ishBoshlaganSana: user.createdAt?.slice(0, 10) ?? "",
    oylik: 0,
    holat: user.isActive ? "faol" : "ishdan-ketgan",
    izoh: user.position ?? "",
    vakolatlar: (user.grants ?? []).filter((grant) => grant.isActive).map((grant) => grant.code),
    yaratganMasul: "Tizim",
    yaratilganSana: user.createdAt ?? "",
    ozgartirilganSana: user.updatedAt ?? user.createdAt ?? "",
    ozgartirganMasul: "Tizim",
  };
}

export default function XodimUchot() {
  const [faolTab, setFaolTab] = useState<Tab>("xodimlar");
  const [tuzilmaOchiq, setTuzilmaOchiq] = useState(false);
  const [xodimlar, setXodimlar] = useState<Xodim[]>([]);
  const [lavozimlar] = useState<Lavozim[]>(backendLavozimlar);
  const [bolimlar, setBolimlar] = useState<Bolim[]>([]);
  const [filiallar, setFiliallar] = useState<Filial[]>([]);
  const [grantlar, setGrantlar] = useState<AccountVakolati[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState("");

  const yuklash = useCallback(async () => {
    setYuklanmoqda(true);
    setXato("");
    try {
      const [users, branches, grants] = await Promise.all([
        foydalanuvchilarApi.royxat(),
        filiallarApi.royxat(),
        vakolatlarApi.royxat(),
      ]);
      setFiliallar(branches);
      setGrantlar(grants);
      setBolimlar(branches.map(filialBolimi));
      setXodimlar(users.map((user) => accountXodimi({ ...user, grants: grants.filter((grant) => grant.userId === user.id) }, branches)));
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setYuklanmoqda(false);
    }
  }, []);

  useEffect(() => { void yuklash(); }, [yuklash]);

  async function xodimniSaqlash(xodim: Xodim) {
    setXato("");
    try {
      const mavjud = xodimlar.some((item) => item.id === xodim.id);
      const filialId = bolimlar.find((item) => item.nomi === xodim.filial)?.id || xodim.bolimId || undefined;
      const payload = {
        username: xodim.login,
        fullName: [xodim.ism, xodim.familiya].filter(Boolean).join(" "),
        phone: xodim.telefonlar[0] ?? "",
        position: xodim.izoh,
        role: (xodim.lavozimId || "CASHIER") as AccountRoli,
        branchId: filialId,
        isActive: xodim.holat === "faol",
      };
      const saved = mavjud
        ? await foydalanuvchilarApi.yangilash(xodim.id, payload)
        : await foydalanuvchilarApi.yaratish({ ...payload, password: xodim.parol ?? "" });

      const userGrantlari = grantlar.filter((grant) => grant.userId === saved.id);
      const kerakli = new Set(xodim.vakolatlar);
      await Promise.all([
        ...userGrantlari.map((grant) =>
          vakolatlarApi.yangilash(grant.id, { isActive: kerakli.has(grant.code) })
        ),
        ...[...kerakli]
          .filter((code) => !userGrantlari.some((grant) => grant.code === code))
          .map((code) => vakolatlarApi.yaratish({ userId: saved.id, code: code as VakolatKodi, isActive: true })),
      ]);
      await yuklash();
    } catch (error) {
      setXato(getApiErrorMessage(error));
      throw error;
    }
  }

  async function xodimniOchirish(id: string) {
    try { await foydalanuvchilarApi.ochirish(id); await yuklash(); }
    catch (error) { setXato(getApiErrorMessage(error)); }
  }

  // Bo'lim o'chirilsa: ostidagi bo'limlar bir pog'ona yuqoriga ko'chadi,
  // xodimlarning bo'lim biriktirmasi bo'shaydi.
  async function bolimniOchirish(id: string) {
    try { await filiallarApi.ochirish(id); await yuklash(); }
    catch (error) { setXato(getApiErrorMessage(error)); }
  }

  async function bolimniSaqlash(bolim: Bolim) {
    try {
      const branch = filiallar.find((item) => item.id === bolim.id);
      const responsibleId = bolim.rahbarIdlar[0] || undefined;
      if (branch) await filiallarApi.yangilash(branch.id, { name: bolim.nomi, responsibleId });
      else await filiallarApi.yaratish({ name: bolim.nomi, responsibleId });
      await yuklash();
    } catch (error) { setXato(getApiErrorMessage(error)); }
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-orange-100 bg-white p-2 shadow-sm">
        {tablar.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFaolTab(tab.id)}
            className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold ${
              faolTab === tab.id
                ? "bg-orange-500 text-white"
                : "text-gray-500 hover:bg-orange-50 hover:text-orange-600"
            }`}
          >
            {tab.nom}
          </button>
        ))}

        <button
          onClick={() => setTuzilmaOchiq(true)}
          className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold ${
            tuzilmaOchiq
              ? "bg-orange-500 text-white"
              : "text-gray-500 hover:bg-orange-50 hover:text-orange-600"
          }`}
        >
          Tashkilot tuzilmasi
        </button>
      </div>

      {faolTab === "xodimlar" && (
        yuklanmoqda ? <p className="rounded-2xl bg-white p-10 text-center font-bold text-gray-400">Backenddan yuklanmoqda...</p> :
        <Xodimlar
          xodimlar={xodimlar}
          lavozimlar={lavozimlar}
          bolimlar={bolimlar}
          onSaqlash={(xodim) => { void xodimniSaqlash(xodim); }}
          onOchirish={xodimniOchirish}
        />
      )}

      {xato && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{xato}</p>}

      {tuzilmaOchiq && (
        <TashkilotTuzilmasi
          bolimlar={bolimlar}
          xodimlar={xodimlar}
          lavozimlar={lavozimlar}
          onBolimSaqlash={(bolim) => { void bolimniSaqlash(bolim); }}
          onBolimOchirish={bolimniOchirish}
          onXodimSaqlash={(xodim) => { void xodimniSaqlash(xodim); }}
          onYopish={() => setTuzilmaOchiq(false)}
        />
      )}
    </div>
  );
}
