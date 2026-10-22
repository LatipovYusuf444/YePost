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
  /** Shu to'lov qaysi kurs bilan hisoblangani (backend javobida; kassir kursi yoki kunlik kurs). */
  rate?: number | string | null;
};

/** O'zgargan to'lov: `date` va `note` faqat foydalanuvchi o'zgartirgan bo'lsa bor (aks holda eski sanasi va izohi saqlanadi). */
export type TolovYangilanishi = {
  paymentType: string;
  amount: number;
  currency: string;
  date?: string;
  note?: string;
  /** Kassir kursi: 1 $ necha so'm, faqat shu to'lov uchun (backend `payments[].rate`). Berilmasa kunlik kurs olinadi. */
  rate?: number;
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
  // Kurs faqat boshqa valyutadagi to'lov qatorida ma'noga ega (sotuv valyutasidagi to'lovga ta'sir qilmaydi).
  const kursi = (valyuta: string | null | undefined, kurs: unknown) =>
    valyutaKodi(valyuta) !== valyutaKodi(sotuvValyutasi) && Number(kurs) > 0 ? { rate: Number(kurs) } : {};
  return tolovlar.map((tolov, indeks) => {
    if (indeks !== tanlanganIndeks) {
      // PATCH qatorlarni qayta yozadi: kassir kursini saqlab qolish uchun boshqa to'lovlar ham o'z kursi bilan qaytariladi (rate'siz qator kunlik kursni oladi).
      return {
        paymentType: tolov.paymentType,
        amount: Number(tolov.amount ?? 0),
        ...farqliValyuta(tolov.currency),
        ...kursi(tolov.currency, tolov.rate),
        ...saqlanganTolovMaydonlari(tolov),
      };
    }
    return {
      ...(tolov.id ? { id: tolov.id } : {}),
      paymentType: yangi.paymentType,
      amount: yangi.amount,
      ...farqliValyuta(yangi.currency),
      ...kursi(yangi.currency, yangi.rate),
      ...(yangi.date ? { date: yangi.date } : {}),
      ...(yangi.note !== undefined ? { note: yangi.note } : {}),
    };
  });
}

/** PATCH tanasi: to'lovlar ro'yxati, (qarzdan ortiq pul bo'lsa) aniq `keepExcess` va (aniq qaytim so'ralsa) `roundChange: false`. */
export function tolovTahririTanasi(tolovlar: Array<Record<string, unknown>>, keepExcess?: boolean, roundChange?: false) {
  return { payments: tolovlar, ...(keepExcess === undefined ? {} : { keepExcess }), ...(roundChange === false ? { roundChange } : {}) };
}

/** `kurs` — kassir kiritgan kurs (0 yoki berilmagan — kunlik kurs). */
type TolovFormasi = { paymentType: string; amount: number; currency: string; kun: string; izoh: string; kurs?: number };

/** Forma qiymatlaridan `TolovYangilanishi`: sana va izoh faqat asl qiymatdan farq qilsa qo'shiladi (izoh bo'sh qoldirilsa — o'chiriladi). */
export function tolovYangilanishi(asl: { kun: string; izoh: string }, forma: TolovFormasi): TolovYangilanishi {
  const izoh = forma.izoh.trim();
  return {
    paymentType: forma.paymentType,
    amount: forma.amount,
    currency: valyutaKodi(forma.currency),
    ...tahrirSanasi(forma.kun, asl.kun),
    ...(izoh !== asl.izoh.trim() ? { note: izoh } : {}),
    ...(forma.kurs && forma.kurs > 0 ? { rate: forma.kurs } : {}),
  };
}

/** Forma asl to'lovdan farq qiladimi (saqlash tugmasi faqat o'zgarish bo'lsa yoqiladi). */
export function tolovOzgarganmi(asl: TolovFormasi, forma: TolovFormasi): boolean {
  return (
    asl.paymentType !== forma.paymentType ||
    Math.abs(asl.amount - forma.amount) > 1e-9 ||
    valyutaKodi(asl.currency) !== valyutaKodi(forma.currency) ||
    Math.abs((asl.kurs ?? 0) - (forma.kurs ?? 0)) > 1e-9 ||
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

/** To'lov turi bo'yicha pul qayerga tushishi: naqd — kassaga, karta va bank — o'z hisobiga, mijoz hisobi — hisobdan yechiladi. */
export type KirimTuri = "CASH" | "CARD" | "BANK" | "BALANCE";
export const KIRIM_TURLARI: readonly KirimTuri[] = ["CASH", "CARD", "BANK", "BALANCE"];

export type KirimQatori = { tur: KirimTuri; valyuta: "UZS" | "USD"; summa: number };

export type TolovKassaXulosasi = {
  /** Tushgan pul to'lov turi va O'Z valyutasi bo'yicha: $100 naqd — kassaga +$100 (so'mga o'girilgan 728 000 emas). */
  kirim: KirimQatori[];
  /** Mijozga qaytim, so'mda (backend `changeAmount`: so'm kassasidan chiqim). */
  qaytim: number;
  /** Mijoz hisobiga o'tgan pul, sotuv valyutasida (`keptAmount`). */
  hisobga: number;
};

const musbatSon = (qiymat: unknown) => {
  const son = Number(qiymat);
  return Number.isFinite(son) && son > 0 ? son : 0;
};

/**
 * Tasdiqlangan sotuvning to'lov qatorlaridan kassa xulosasi: pul real qancha va qaysi valyutada tushgani, qaytim va hisobga o'tgani. Qarzning yopilgan
 * qismi (masalan 728 000) kassadagi pul emas: $100 kassaga +$100 bo'lib tushadi, so'm kassasidan qaytim chiqadi — kassa real pulga teng bo'ladi.
 * Qarz qatori (DEBT) pul emas, hisobga olinmaydi.
 */
export function tolovlarKassaXulosasi(
  tolovlar: ReadonlyArray<{ paymentType: string; amount?: unknown; currency?: string | null; changeAmount?: unknown; keptAmount?: unknown }> | null | undefined,
  sotuvValyutasi: string
): TolovKassaXulosasi {
  const guruhlar = new Map<string, KirimQatori>();
  let qaytim = 0;
  let hisobga = 0;
  for (const tolov of tolovlar ?? []) {
    qaytim += musbatSon(tolov.changeAmount);
    hisobga += musbatSon(tolov.keptAmount);
    const tur = KIRIM_TURLARI.find((element) => element === tolov.paymentType);
    const summa = musbatSon(tolov.amount);
    if (!tur || summa === 0) continue;
    const valyuta = valyutaKodi(tolov.currency ?? sotuvValyutasi);
    const kalit = `${tur}:${valyuta}`;
    const mavjud = guruhlar.get(kalit);
    if (mavjud) mavjud.summa += summa;
    else guruhlar.set(kalit, { tur, valyuta, summa });
  }
  // Tur tartibida (naqd, karta, bank, hisob), har turda dollar so'mdan oldin.
  const kirim = [...guruhlar.values()].sort(
    (a, b) => KIRIM_TURLARI.indexOf(a.tur) - KIRIM_TURLARI.indexOf(b.tur) || (a.valyuta === b.valyuta ? 0 : a.valyuta === "USD" ? -1 : 1)
  );
  return { kirim, qaytim, hisobga };
}
