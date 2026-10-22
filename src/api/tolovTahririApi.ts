import type { Sotuv, SotuvYaratishMalumoti } from "@/types/savdo";
import {
  TOLOV_TOPILMADI,
  qolganBosqichlar,
  tolovTahririTanasi,
  tolovlarniYangilash,
  type TolovTahririBosqichi,
  type TolovYangilanishi,
} from "../lib/tolovTahriri.ts";
import apiClient from "./axios";
import { sotuvniBekorQilish, sotuvniTasdiqlash, sotuvniTiklash, sotuvniYangilash, sotuvTafsilotiniOlish } from "./savdoApi";

export type TolovTahririSorovi = {
  sotuvId: string;
  /** Tahrirlanadigan to'lovning id'si va (id topilmasa) sotuv `payments[]`idagi o'rni. */
  tolovId: string | null;
  tolovIndeksi: number;
  yangi: TolovYangilanishi;
  /** Qarzdan ortiq pul bo'lsa tanlov (hisobga yozish yoki qaytim); aks holda yuborilmaydi. */
  keepExcess?: boolean;
  /** Dollar qatnashganda qaytim minggacha yaxlitlanmasin (backend standarti — yaxlitlash); faqat `false` yuboriladi. */
  roundChange?: false;
  /** Zanjir tugagach mijozga tuzatilgan nakladnoy yuboriladi (qayta tasdiqlashda u o'zi ketmaydi: xabar bu sotuvga avval yuborilgan). */
  nakladnoyYuborish?: boolean;
};

/**
 * POST /sales/:id/notify — tasdiqlangan sotuvning nakladnoyi mijozga Telegram orqali yuboriladi ("Qayta yuborish" tugmasi bilan bir xil).
 * Backend navbatga qo'yadi (201); botga ulanmagan mijozga xabar ketmaydi, bu xabarnomalar tarixida ko'rinadi. Xato toasti chiqmaydi:
 * chaqiruvchi natijani o'zi ko'rsatadi.
 */
export async function nakladnoyniMijozgaYuborish(sotuvId: string): Promise<void> {
  await apiClient.post(`/sales/${sotuvId}/notify`, undefined, { xatoniYashirish: true });
}

/** Zanjirning qaysi bosqichida nima xato bergani: UI shu bosqichdan davom ettirishni taklif qiladi. */
export class TolovTahririXatosi extends Error {
  readonly bosqich: TolovTahririBosqichi;
  readonly sabab: unknown;

  constructor(bosqich: TolovTahririBosqichi, sabab: unknown) {
    super(sabab instanceof Error ? sabab.message : `tolov_tahriri:${bosqich}`);
    this.name = "TolovTahririXatosi";
    this.bosqich = bosqich;
    this.sabab = sabab;
  }
}

export type TolovTahririParametrlari = {
  /** Xato bergan bosqichdan davom etish (oldingi bosqichlar bajarilgan). Standart — boshidan. */
  boshlash?: TolovTahririBosqichi;
  onBosqich?: (bosqich: TolovTahririBosqichi, holat: "boshlandi" | "tugadi") => void;
};

async function bosqichniBajarish(bosqich: TolovTahririBosqichi, sorov: TolovTahririSorovi) {
  if (bosqich === "bekor") {
    await sotuvniBekorQilish(sorov.sotuvId);
  } else if (bosqich === "tiklash") {
    await sotuvniTiklash(sorov.sotuvId);
  } else if (bosqich === "yangilash") {
    // Javobda to'lovlar to'liq kelmasligi mumkin, id'lar ham o'zgargan bo'lishi mumkin: qoralamaning joriy holati qayta olinadi.
    const qoralama = await sotuvTafsilotiniOlish(sorov.sotuvId);
    const tolovlar = tolovlarniYangilash(
      qoralama.payments ?? [],
      { id: sorov.tolovId, indeks: sorov.tolovIndeksi },
      sorov.yangi,
      qoralama.currency ?? "UZS"
    );
    if (!tolovlar) throw new Error(TOLOV_TOPILMADI);
    await sotuvniYangilash(sorov.sotuvId, tolovTahririTanasi(tolovlar, sorov.keepExcess, sorov.roundChange) as Partial<SotuvYaratishMalumoti>);
  } else {
    // Tasdiqlash sanasi inventarizatsiyadan oldin bo'lsa 409 ogohlantirish so'raladi (savdoApi ichida).
    await sotuvniTasdiqlash(sorov.sotuvId);
  }
}

/**
 * Tasdiqlangan sotuvdagi to'lovni o'zgartiradi: bekor qilish → tiklash → to'lovlarni yangilash → qayta tasdiqlash. Muvaffaqiyatda sotuvning
 * oxirgi holati (to'lovlar, qarz, `changeAmount`) qaytadi. Bosqichda xato bo'lsa `TolovTahririXatosi` (qaysi bosqichda) otiladi.
 */
export async function tolovniTahrirlash(sorov: TolovTahririSorovi, parametrlar: TolovTahririParametrlari = {}): Promise<Sotuv> {
  for (const bosqich of qolganBosqichlar(parametrlar.boshlash)) {
    parametrlar.onBosqich?.(bosqich, "boshlandi");
    try {
      await bosqichniBajarish(bosqich, sorov);
    } catch (xato) {
      throw new TolovTahririXatosi(bosqich, xato);
    }
    parametrlar.onBosqich?.(bosqich, "tugadi");
  }
  return sotuvTafsilotiniOlish(sorov.sotuvId);
}
