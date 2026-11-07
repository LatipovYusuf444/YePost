import { AUTH_SESSION_CHANGED_EVENT } from "./authTokenStorage.ts";

// Ma'lumotnomalar (omborlar, filiallar, o'lchov birliklari, foydalanuvchilar) kam o'zgaradi, lekin har ekran ularni qayta so'raydi.
// Kalit bo'yicha qisqa muddatli kesh: bir vaqtdagi bir xil so'rovlar bitta so'rovga birlashadi, muvaffaqiyatsiz so'rov eslanmaydi.
// Guruhdagi yaratish/yangilash/o'chirish amallaridan keyin `malumotnomaKeshiniTozalash(guruh)` chaqiriladi;
// sessiya o'zgarganda (kirish, chiqish, boshqa foydalanuvchi) hammasi tozalanadi.
export const MALUMOTNOMA_KESH_MUDDATI = 60_000;

type Yozuv = { vaqt: number; qiymat: Promise<unknown> };
const yozuvlar = new Map<string, Yozuv>();

function nusxa<T>(qiymat: T): T {
  // Chaqiruvchi ro'yxatni joyida saralashi mumkin: umumiy nusxa buzilmasligi uchun massiv nusxalanadi.
  return Array.isArray(qiymat) ? ([...qiymat] as unknown as T) : qiymat;
}

export function malumotnomaniOlish<T>(
  guruh: string,
  nom: string,
  yuklash: () => Promise<T>,
  muddat = MALUMOTNOMA_KESH_MUDDATI,
  hozir = Date.now(),
): Promise<T> {
  const kalit = `${guruh}:${nom}`;
  const mavjud = yozuvlar.get(kalit);
  if (mavjud && hozir - mavjud.vaqt < muddat) return (mavjud.qiymat as Promise<T>).then(nusxa);
  const yozuv: Yozuv = { vaqt: hozir, qiymat: yuklash() };
  yozuvlar.set(kalit, yozuv);
  yozuv.qiymat.catch(() => {
    if (yozuvlar.get(kalit) === yozuv) yozuvlar.delete(kalit);
  });
  return (yozuv.qiymat as Promise<T>).then(nusxa);
}

/** `guruh` berilsa faqat shu guruh (masalan "omborlar"), aks holda hamma ma'lumotnoma keshi tozalanadi. */
export function malumotnomaKeshiniTozalash(guruh?: string) {
  if (!guruh) {
    yozuvlar.clear();
    return;
  }
  for (const kalit of [...yozuvlar.keys()]) {
    if (kalit.startsWith(`${guruh}:`)) yozuvlar.delete(kalit);
  }
}

/** O'zgartiruvchi amal (yaratish, yangilash, o'chirish) tugagach keshni tozalaydi; amal xato bersa ham (u qisman bajarilgan bo'lishi mumkin). */
export async function ozgartirishdanKeyinTozalash<T>(guruhlar: string | string[], amal: () => Promise<T>): Promise<T> {
  try {
    return await amal();
  } finally {
    for (const guruh of Array.isArray(guruhlar) ? guruhlar : [guruhlar]) malumotnomaKeshiniTozalash(guruh);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener(AUTH_SESSION_CHANGED_EVENT, () => malumotnomaKeshiniTozalash());
}
