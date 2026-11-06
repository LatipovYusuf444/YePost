// Bir brauzerda bir do'kondan chiqib boshqasiga (yoki boshqa foydalanuvchi bilan) kirilganda eski ma'lumot qolmasligi uchun (K4).
// Xotiradagi zustand store'lar, modul keshlari (katalog, mijozlar, kassa sotuvlari) — hammasini bitta-bitta tozalash ishonchsiz
// (yangi store qo'shilsa unutiladi). Shuning uchun: chiqishda va boshqa egasi bilan kirishda sahifa to'liq qayta yuklanadi
// (`window.location.assign`), localStorage'dagi do'konga bog'liq kalitlar esa shu yerda o'chiriladi.

/** Do'konga bog'liq localStorage kalitlari: POS savatchasi (narx va kurs bilan) va valyuta rejimi/kursi. */
export const ISH_JOYI_KALITLARI = ["yepost-pos-cart", "yepost-valyuta"] as const;

/** Oxirgi kirgan egasi (`workspaceId|userId`): shu egasi qayta kirsa savatcha saqlanib qoladi. */
export const SESSIYA_EGASI_KALITI = "yepost-sessiya-egasi";

type Xotira = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function xotira(): Xotira | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function tokenYuki(token: string | null | undefined): Record<string, unknown> | null {
  try {
    const qism = token?.split(".")[1];
    if (!qism) return null;
    const oddiy = qism.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(oddiy.padEnd(Math.ceil(oddiy.length / 4) * 4, "="))) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** JWT ichidagi `exp` (ms). Refresh token muddati sessiya muddati bo'ladi (M8). */
export function tokenMuddati(token: string | null | undefined): number | null {
  const exp = tokenYuki(token)?.exp;
  return typeof exp === "number" && exp > 0 ? exp * 1000 : null;
}

/** Sessiya egasi: access token ichidagi `workspaceId` va `sub`; o'qib bo'lmasa — login nomi. */
export function sessiyaEgasi(accessToken: string | null | undefined, username: string) {
  const yuk = tokenYuki(accessToken);
  const sub = typeof yuk?.sub === "string" ? yuk.sub : `login:${username}`;
  const workspaceId = typeof yuk?.workspaceId === "string" ? yuk.workspaceId : "";
  return `${workspaceId}|${sub}`;
}

export function ishJoyiMalumotlariniTozalash(saqlash: Xotira | null = xotira()) {
  if (!saqlash) return;
  for (const kalit of ISH_JOYI_KALITLARI) saqlash.removeItem(kalit);
  saqlash.removeItem(SESSIYA_EGASI_KALITI);
}

/**
 * Kirishdan keyin chaqiriladi. Egasi oldingisidan boshqa bo'lsa (yoki noma'lum bo'lsa) do'konga bog'liq kalitlar o'chiriladi va `true`
 * qaytadi — chaqiruvchi sahifani to'liq qayta yuklaydi. Xuddi shu kassir sessiya tugab qayta kirsa savatcha saqlanadi.
 */
export function sessiyaEgasiniAlmashtirish(yangiEgasi: string, saqlash: Xotira | null = xotira()) {
  if (!saqlash) return false;
  const oldingi = saqlash.getItem(SESSIYA_EGASI_KALITI);
  if (oldingi === yangiEgasi) return false;
  ishJoyiMalumotlariniTozalash(saqlash);
  saqlash.setItem(SESSIYA_EGASI_KALITI, yangiEgasi);
  return true;
}
