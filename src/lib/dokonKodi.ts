// Login oynasidagi "Do'kon kodi" (Workspace.slug): bir xil login bir nechta do'konda bo'la oladi, shuning uchun kirishda do'kon kodi ham yuboriladi.
// Backend: POST /auth/login { workspace?, username, password }. `workspace` ixtiyoriy; login bir nechta do'konda bo'lsa va kod yuborilmasa —
// 400 `errors.user.workspace_required`. Noto'g'ri kod uchun alohida xato yo'q (u ham `invalid_credentials`).
// UI'siz va tashqi importlarsiz yozilgan — testlarda to'g'ridan-to'g'ri ishlaydi.

const DOKON_KODI_KALITI = "yepost-dokon-kodi";

/** Backend: login bir nechta do'konda bor, lekin do'kon kodi yuborilmagan. */
export const DOKON_KODI_KERAK_KODI = "errors.user.workspace_required";

/** Do'kon kodi: chetdagi bo'sh joylar kesiladi (backend ham shunday qiladi), registr o'zgartirilmaydi. */
export function dokonKodiniTozalash(qiymat?: string | null): string {
  return (qiymat ?? "").trim();
}

/** Login so'rovi tanasi: `workspace` faqat kod kiritilgan bo'lsa yuboriladi (backend noma'lum/bo'sh maydonni oldindan kutmaydi). */
export function loginMalumoti(username: string, password: string, dokonKodi?: string | null) {
  const workspace = dokonKodiniTozalash(dokonKodi);
  return workspace ? { workspace, username, password } : { username, password };
}

/** Backend javobi (axios xatosi) "do'kon kodi kerak" ekanini bildiradimi. */
export function dokonKodiKerakmi(xato: unknown): boolean {
  const kod = (xato as { response?: { data?: { code?: unknown } } } | null | undefined)?.response?.data?.code;
  return kod === DOKON_KODI_KERAK_KODI;
}

/** Oxirgi muvaffaqiyatli kirishdagi do'kon kodi (brauzerda saqlangan); saqlash taqiqlangan bo'lsa bo'sh. */
export function saqlanganDokonKodi(): string {
  try {
    return dokonKodiniTozalash(window.localStorage.getItem(DOKON_KODI_KALITI));
  } catch {
    return "";
  }
}

/** Muvaffaqiyatli kirgandan keyin chaqiriladi: kod bo'sh bo'lsa (foydalanuvchi uni olib tashlagan) saqlangani o'chiriladi. */
export function dokonKodiniSaqlash(dokonKodi?: string | null) {
  const kod = dokonKodiniTozalash(dokonKodi);
  try {
    if (kod) window.localStorage.setItem(DOKON_KODI_KALITI, kod);
    else window.localStorage.removeItem(DOKON_KODI_KALITI);
  } catch {
    // Brauzer saqlashga ruxsat bermasa — kod har safar qo'lda kiritiladi.
  }
}
