import { useCallback, useEffect, useState } from "react";
import TashkilotTuzilmasi from "./TashkilotTuzilmasi";
import Xodimlar from "./Xodimlar";
import Davomat from "./Davomat";
import { foydalanuvchilarApi, vakolatlarApi } from "@/api/accountsApi";
import { filiallarApi } from "@/api/omborApi";
import { bolimlarApi, lavozimlarApi } from "@/api/hrApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import type { AccountFoydalanuvchi, AccountRoli, AccountVakolati, VakolatKodi } from "@/types/account";
import type { Filial } from "@/types/ombor";
import type { Bolim, Lavozim, Xodim } from "./types";
import type { HrDepartment, HrPosition } from "@/types/hr";

import YuklanmoqdaHolati from "../HisobotUchot/YuklanmoqdaHolati";
import { avatarApi } from "@/api/avatarApi";
import ModalTablari from "@/Components/common/ModalTablari";
// Vakolatlar endi Sozlamalarda (SozlamalarUchot/VakolatlarBolimi).
// "Tashkilot tuzilmasi" — tab emas: bosilganda to'liq ekranli oyna ochadi.
type Tab = "xodimlar" | "davomat";

const tablar: Array<{ id: Tab; nom: string }> = [
  { id: "xodimlar", nom: "Xodimlar" },
  { id: "davomat", nom: "Davomat" },
];

function ismniAjratish(fullName?: string | null) {
  const qismlar = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return { ism: qismlar[0] ?? "", familiya: qismlar.slice(1).join(" ") };
}

function hrBolimi(item: HrDepartment): Bolim {
  return { id: item.id, nomi: item.name, otaId: item.parentId ?? "", rahbarIdlar: item.managerId ? [item.managerId] : [] };
}

function hrLavozimi(item: HrPosition): Lavozim {
  return {
    id: item.id,
    nomi: item.name,
    izoh: "",
    vakolatlar: [],
    yaratganMasul: "Tizim",
    yaratilganSana: "",
    ozgartirilganSana: "",
  };
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
    rol: (["ADMIN", "DIRECTOR", "CASHIER", "STOREKEEPER"].includes(user.role) ? user.role : "CASHIER") as Xodim["rol"],
    lavozimId: user.positionId ?? "",
    bolimId: user.departmentId ?? "",
    filial: filial?.name ?? "",
    manzil: filial?.address ?? "",
    ishBoshlaganSana: user.createdAt?.slice(0, 10) ?? "",
    oylik: user.salary === null || user.salary === undefined ? null : Number(user.salary),
    holat: user.isActive ? "faol" : "ishdan-ketgan",
    izoh: user.position ?? "",
    vakolatlar: (user.grants ?? []).filter((grant) => grant.isActive).map((grant) => grant.code),
    yaratganMasul: "Tizim",
    yaratilganSana: user.createdAt ?? "",
    ozgartirilganSana: user.updatedAt ?? user.createdAt ?? "",
    ozgartirganMasul: "Tizim",
    rasmUrl: user.avatarUrl ?? undefined,
  };
}

export default function XodimUchot() {
  const [faolTab, setFaolTab] = useState<Tab>("xodimlar");
  const [tuzilmaOchiq, setTuzilmaOchiq] = useState(false);
  const [xodimlar, setXodimlar] = useState<Xodim[]>([]);
  const [lavozimlar, setLavozimlar] = useState<Lavozim[]>([]);
  const [bolimlar, setBolimlar] = useState<Bolim[]>([]);
  const [filiallar, setFiliallar] = useState<Filial[]>([]);
  const [grantlar, setGrantlar] = useState<AccountVakolati[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState("");

  const yuklash = useCallback(async () => {
    setYuklanmoqda(true);
    setXato("");
    try {
      const [users, branches, grants, departments, positions] = await Promise.all([
        foydalanuvchilarApi.royxat(),
        filiallarApi.royxat(),
        vakolatlarApi.royxat(),
        bolimlarApi.royxat(),
        lavozimlarApi.royxat(),
      ]);
      setFiliallar(branches);
      setGrantlar(grants);
      setBolimlar(departments.map(hrBolimi));
      setLavozimlar(positions.map(hrLavozimi));
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
      const filialId = filiallar.find((item) => item.name === xodim.filial)?.id;
      const payload = {
        username: xodim.login,
        fullName: [xodim.ism, xodim.familiya].filter(Boolean).join(" "),
        phone: xodim.telefonlar[0] ?? "",
        position: lavozimlar.find((item) => item.id === xodim.lavozimId)?.nomi ?? xodim.izoh,
        role: xodim.rol as AccountRoli,
        branchId: filialId,
        departmentId: xodim.bolimId || undefined,
        positionId: xodim.lavozimId || undefined,
        isActive: xodim.holat === "faol",
        ...(xodim.oylik === null ? {} : { salary: xodim.oylik }),
      };
      const saved = mavjud
        ? await foydalanuvchilarApi.yangilash(xodim.id, payload)
        : await foydalanuvchilarApi.yaratish({ ...payload, password: xodim.parol ?? "" });

      // Rasm: yangi tanlangan bo'lsa yuklanadi, olib tashlangan bo'lsa o'chiriladi.
      if (xodim.rasmFayli) {
        await avatarApi.yuklash(saved.id, xodim.rasmFayli.blob, xodim.rasmFayli.dataUrl);
      } else if (xodim.rasmOlibTashlash) {
        await avatarApi.olibTashlash(saved.id);
      }

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
    try { await bolimlarApi.ochirish(id); await yuklash(); }
    catch (error) { setXato(getApiErrorMessage(error)); }
  }

  async function bolimniSaqlash(bolim: Bolim) {
    try {
      const mavjud = bolimlar.some((item) => item.id === bolim.id);
      const data = {
        name: bolim.nomi,
        parentId: bolim.otaId || null,
        managerId: bolim.rahbarIdlar[0] || null,
        description: null,
      };
      if (mavjud) await bolimlarApi.yangilash(bolim.id, data);
      else await bolimlarApi.yaratish(data);
      await yuklash();
    } catch (error) { setXato(getApiErrorMessage(error)); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <ModalTablari
          tablar={tablar.map((tab) => ({ id: tab.id, nom: tab.nom }))}
          faol={faolTab}
          onChange={(id) => setFaolTab(id as typeof faolTab)}
        />
        <button
          type="button"
          onClick={() => setTuzilmaOchiq(true)}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-600 shadow-sm transition hover:border-gold-200 hover:bg-gold-50 hover:text-gold-600"
        >
          Tashkilot tuzilmasi
        </button>
      </div>

      {faolTab === "xodimlar" && (
        yuklanmoqda ? <YuklanmoqdaHolati className="h-96" /> :
        <Xodimlar
          xodimlar={xodimlar}
          lavozimlar={lavozimlar}
          bolimlar={bolimlar}
          filiallar={filiallar.map((item) => ({ id: item.id, nomi: item.name }))}
          onSaqlash={(xodim) => { void xodimniSaqlash(xodim); }}
          onOchirish={xodimniOchirish}
        />
      )}
      {faolTab === "davomat" && <Davomat xodimlar={xodimlar} />}

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
