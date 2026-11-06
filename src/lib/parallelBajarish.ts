/**
 * Ro'yxatni cheklangan parallellikda qayta ishlaydi: serverga bir paytda `chegara` tadan ortiq so'rov ketmaydi.
 * Natija tartibi kirish tartibi bilan bir xil. Xato bo'lsa yangi ish boshlanmaydi va birinchi xato qaytariladi.
 */
export async function parallelBajarish<T, R>(royxat: readonly T[], chegara: number, ish: (element: T, indeks: number) => Promise<R>): Promise<R[]> {
  const natijalar = new Array<R>(royxat.length);
  let keyingi = 0;
  let toxtadi = false;
  const ishchi = async () => {
    while (!toxtadi && keyingi < royxat.length) {
      const indeks = keyingi;
      keyingi += 1;
      try {
        natijalar[indeks] = await ish(royxat[indeks], indeks);
      } catch (error) {
        toxtadi = true;
        throw error;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(chegara, 1), royxat.length) }, ishchi));
  return natijalar;
}

/** "Hamma sahifani olish" yordamchilari uchun: DB'ga bir paytda shu sondan ortiq sahifa so'rovi ketmaydi (T2). */
export const SAHIFALAR_PARALLELLIGI = 3;

/** Birinchi sahifa olingandan keyin qolgan 2..`totalPages` sahifalarni tartib bilan, cheklangan parallellikda oladi. */
export function qolganSahifalar<R>(totalPages: number, olish: (page: number) => Promise<R>, chegara = SAHIFALAR_PARALLELLIGI): Promise<R[]> {
  const sahifalar = Array.from({ length: Math.max(Math.floor(Number(totalPages) || 0) - 1, 0) }, (_, indeks) => indeks + 2);
  return parallelBajarish(sahifalar, chegara, (page) => olish(page));
}
