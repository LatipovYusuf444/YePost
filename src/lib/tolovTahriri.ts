// Tasdiqlangan sotuvdagi to'lovni tahrirlash (backend tavsiyasi): sotuv bekor qilinadi (POST /sales/:id/cancel) → qoralamaga qaytariladi
// (POST /sales/:id/restore) → to'lovlar ro'yxati yangilanadi (PATCH /sales/:id, `payments[]`: o'zgargan to'lov `id` bilan) → qayta
// tasdiqlanadi (POST /sales/:id/confirm). Qaytim tasdiqlashda o'zi hisoblanadi (`payments[].changeAmount`), kassa shunga to'g'rilanadi.
// UI'siz yozilgan — alohida sinash mumkin.
import { saqlanganTolovMaydonlari, tahrirSanasi, toshkentKuni } from "./hujjatSanasi.ts";

export type TolovTahririBosqichi = "bekor" | "tiklash" | "yangilash" | "tasdiqlash";

/** Bosqichlar yuboriladigan tartibda. */
export const TOLOV_TAHRIRI_BOSQICHLARI: readonly TolovTahririBosqichi[] = ["bekor", "tiklash", "yangilash", "tasdiqlash"];

/** Berilgan bosqichdan (shu bosqich ham) boshlab qolgan bosqichlar: xato bergan bosqichdan davom etish uchun. */
export function qolganBosqichlar(boshlash: TolovTahririBosqichi = "bekor"): TolovTahririBosqichi[] {
  return TOLOV_TAHRIRI_BOSQICHLARI.slice(TOLOV_TAHRIRI_BOSQICHLARI.indexOf(boshlash));
}

/** Qoralamaga qaytgan sotuvda tahrirlanadigan to'lov topilmadi (kod; UI tushunarli matn ko'rsatadi). */
export const TOLOV_TOPILMADI = "tolov_topilmadi";

export type SaqlanganTolov = {
  id?: string | null;
  paymentType: string;
  amount: number | string;
  currency?: string | null;
  note?: string | null;
};

/** O'zgargan to'lov: `date` va `note` faqat foydalanuvchi o'zgartirgan bo'lsa bor (aks holda eski sanasi va izohi saqlanadi). */
export type TolovYangilanishi = {
  paymentType: string;
  amount: number;
  currency: string;
  date?: string;
  note?: string;
};

const valyutaKodi = (qiymat?: string | null) => (qiymat?.toUpperCase() === "USD" ? "USD" : "UZS");

/**
 * Tahrirlanadigan to'lovning ro'yxatdagi o'rni: avval `id` bo'yicha; `id` topilmasa (bekor qilish va tiklashdan keyin o'zgargan bo'lsa)
 * avvalgi o'rnidagi to'lov. Topilmasa -1.
 */
export function tahrirlanadiganTolovIndeksi(tolovlar: readonly SaqlanganTolov[], tanlov: { id: string | null; indeks: number }): number {
  if (tanlov.id) {
    const idBoyicha = tolovlar.findIndex((tolov) => tolov.id === tanlov.id);
    if (idBoyicha !== -1) return idBoyicha;
  }
  return tanlov.indeks >= 0 && tanlov.indeks < tolovlar.length ? tanlov.indeks : -1;
}

/**
 * PATCH /sales/:id `payments[]`: backend ro'yxatni to'liq almashtiradi, `id` bilan kelgan element o'sha to'lov bo'lib qoladi.
 * Boshqa to'lovlar o'zgarishsiz (id va izohi bilan) qaytariladi; tahrirlangani yangi tur, summa va valyuta bilan. Valyuta faqat sotuv valyutasidan
 * farq qilganda yuboriladi (backend standarti — sotuv valyutasi). To'lov topilmasa `null`.
 */
export function tolovlarniYangilash(
  tolovlar: readonly SaqlanganTolov[],
  tanlov: { id: string | null; indeks: number },
  yangi: TolovYangilanishi,
  sotuvValyutasi: string
): Array<Record<string, unknown>> | null {
  const tanlanganIndeks = tahrirlanadiganTolovIndeksi(tolovlar, tanlov);
  if (tanlanganIndeks === -1) return null;
  const farqliValyuta = (valyuta?: string | null) => (valyutaKodi(valyuta) !== valyutaKodi(sotuvValyutasi) ? { currency: valyutaKodi(valyuta) } : {});
  return tolovlar.map((tolov, indeks) => {
    if (indeks !== tanlanganIndeks) {
      return {
        paymentType: tolov.paymentType,
        amount: Number(tolov.amount ?? 0),
        ...farqliValyuta(tolov.currency),
        ...saqlanganTolovMaydonlari(tolov),
      };
    }
    return {
      ...(tolov.id ? { id: tolov.id } : {}),
      paymentType: yangi.paymentType,
      amount: yangi.amount,
      ...farqliValyuta(yangi.currency),
      ...(yangi.date ? { date: yangi.date } : {}),
      ...(yangi.note !== undefined ? { note: yangi.note } : {}),
    };
  });
}

/** PATCH tanasi: to'lovlar ro'yxati, (qarzdan ortiq pul bo'lsa) aniq `keepExcess` va (aniq qaytim so'ralsa) `roundChange: false`. */
export function tolovTahririTanasi(tolovlar: Array<Record<string, unknown>>, keepExcess?: boolean, roundChange?: false) {
  return { payments: tolovlar, ...(keepExcess === undefined ? {} : { keepExcess }), ...(roundChange === false ? { roundChange } : {}) };
}

type TolovFormasi = { paymentType: string; amount: number; currency: string; kun: string; izoh: string };

/** Forma qiymatlaridan `TolovYangilanishi`: sana va izoh faqat asl qiymatdan farq qilsa qo'shiladi (izoh bo'sh qoldirilsa — o'chiriladi). */
export function tolovYangilanishi(asl: { kun: string; izoh: string }, forma: TolovFormasi): TolovYangilanishi {
  const izoh = forma.izoh.trim();
  return {
    paymentType: forma.paymentType,
    amount: forma.amount,
    currency: valyutaKodi(forma.currency),
    ...tahrirSanasi(forma.kun, asl.kun),
    ...(izoh !== asl.izoh.trim() ? { note: izoh } : {}),
  };
}

/** Forma asl to'lovdan farq qiladimi (saqlash tugmasi faqat o'zgarish bo'lsa yoqiladi). */
export function tolovOzgarganmi(asl: TolovFormasi, forma: TolovFormasi): boolean {
  return (
    asl.paymentType !== forma.paymentType ||
    Math.abs(asl.amount - forma.amount) > 1e-9 ||
    valyutaKodi(asl.currency) !== valyutaKodi(forma.currency) ||
    asl.kun !== forma.kun ||
    asl.izoh.trim() !== forma.izoh.trim()
  );
}

const TAHRIRLANADIGAN_TURLAR = ["CASH", "CARD", "BANK"];

type TopiladiganTolov = SaqlanganTolov & {
  settledAmount?: number | string | null;
  date?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
};

/** To'lovni tahrirlash mumkinmi: naqd, karta yoki bank to'lovi, `id`si bor va summasi musbat (hisobdan to'lov va qarz qatori emas). */
export function tahrirlanadiganTolovmi(tolov: Pick<TopiladiganTolov, "id" | "paymentType" | "amount">): boolean {
  return Boolean(tolov.id) && TAHRIRLANADIGAN_TURLAR.includes(tolov.paymentType) && Number(tolov.amount) > 0;
}

/** Kassa yoki to'lovlar ro'yxatidagi yozuv haqida ma'lum bo'lgan narsa: sotuvdagi qaysi to'lovga tegishli ekanini topish uchun. */
export type TolovIshorasi = { id?: string | null; paymentType?: string | null; summa?: number | null; kun?: string | null };

/**
 * Sotuvdagi to'lovlar orasidan ishoraga mos to'lovning o'rni (topilmasa yoki bir nechtasi bir xil bo'lsa -1: foydalanuvchi o'zi tanlaydi).
 * Faqat tahrirlash mumkin bo'lgan to'lovlar ko'riladi. Tartib: bitta nomzod → `id` → tur va summa (to'lov yoki sotuv valyutasidagi) → kun.
 */
export function tolovniTopish(tolovlar: readonly TopiladiganTolov[], ishora: TolovIshorasi): number {
  const nomzodlar = tolovlar.map((tolov, indeks) => ({ tolov, indeks })).filter(({ tolov }) => tahrirlanadiganTolovmi(tolov));
  if (nomzodlar.length === 0) return -1;
  if (nomzodlar.length === 1) return nomzodlar[0].indeks;
  if (ishora.id) {
    const idBoyicha = nomzodlar.find(({ tolov }) => tolov.id === ishora.id);
    if (idBoyicha) return idBoyicha.indeks;
  }
  const turiBoyicha = ishora.paymentType ? nomzodlar.filter(({ tolov }) => tolov.paymentType === ishora.paymentType) : nomzodlar;
  const turlar = turiBoyicha.length > 0 ? turiBoyicha : nomzodlar;
  const summa = ishora.summa;
  const summaBoyicha =
    typeof summa === "number" && Number.isFinite(summa)
      ? turlar.filter(({ tolov }) => [tolov.amount, tolov.settledAmount].some((qiymat) => qiymat != null && Math.abs(Number(qiymat) - summa) < 0.01))
      : [];
  const summalar = summaBoyicha.length > 0 ? summaBoyicha : turlar;
  if (summalar.length === 1) return summalar[0].indeks;
  const kunBoyicha = ishora.kun ? summalar.filter(({ tolov }) => toshkentKuni(tolov.date ?? tolov.paidAt ?? tolov.createdAt) === ishora.kun) : [];
  return kunBoyicha.length === 1 ? kunBoyicha[0].indeks : -1;
}
