// Tasdiqlash vaqtida backend qaytargan ogohlantirish (masalan, hujjat sanasi tasdiqlangan inventarizatsiyadan oldin)
// uchun "Davom etasizmi?" so'rovi. API qatlami `ogohlantirishniSorash` ni chaqirib javobni kutadi, oyna esa
// (Components/common/HujjatOgohlantirishOynasi) shu navbatni ko'rsatadi. UI'siz yozilgan — alohida sinash mumkin.

/** Oyna matnlari (ixtiyoriy): berilmasa "Ogohlantirish / Davom etasizmi?" standart matnlari ishlatiladi. */
export type OgohlantirishMatnlari = { sarlavha?: string; savol?: string; ha?: string; yoq?: string };

export type OgohlantirishSorovi = {
  id: number;
  /** Hujjat belgisi (masalan, inventarizatsiya raqami va sanasi); bo'lmasa bo'sh. */
  nom: string;
  matn: string;
  matnlar?: OgohlantirishMatnlari;
};

type Kutayotgan = OgohlantirishSorovi & { hal: (rozi: boolean) => void };

let hisoblagich = 0;
let navbat: Kutayotgan[] = [];
const tinglovchilar = new Set<() => void>();

function xabarBerish() {
  for (const tinglovchi of tinglovchilar) tinglovchi();
}

/** Foydalanuvchidan "davom etamizmi?" deb so'raydi; `true` — ha, `false` — yo'q (yoki oyna yopildi). */
export function ogohlantirishniSorash(matn: string, nom = "", matnlar?: OgohlantirishMatnlari): Promise<boolean> {
  return new Promise<boolean>((hal) => {
    hisoblagich += 1;
    navbat = [...navbat, { id: hisoblagich, nom, matn, ...(matnlar ? { matnlar } : {}), hal }];
    xabarBerish();
  });
}

/** Navbatdagi birinchi so'rov (oyna uchun); bo'lmasa `null`. Havola faqat navbat o'zgarganda almashadi. */
export function joriyOgohlantirish(): OgohlantirishSorovi | null {
  return navbat[0] ?? null;
}

/** So'rovga javob: oyna ikki marta chaqirsa ham (tasdiq + yopish) birinchi javob hisobga olinadi. */
export function ogohlantirishgaJavob(id: number, rozi: boolean) {
  const sorov = navbat.find((element) => element.id === id);
  if (!sorov) return;
  navbat = navbat.filter((element) => element.id !== id);
  sorov.hal(rozi);
  xabarBerish();
}

export function ogohlantirishgaObuna(tinglovchi: () => void) {
  tinglovchilar.add(tinglovchi);
  return () => {
    tinglovchilar.delete(tinglovchi);
  };
}
