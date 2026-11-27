// Inventarizatsiya hujjatini id bo'yicha ochish (masalan, "Bu tovar INV-000070 da qayta sanalgan" xatosidagi havola).
// Inventarizatsiya sahifasida bo'lsak — sahifa hodisani tinglab hujjat oynasini ochadi; boshqa sahifada — `?hujjat=` bilan o'tiladi
// (sahifa ochilganda shu parametrni o'qiydi). React Router `popstate` ni tinglaydi: pushState + popstate — sahifa qayta yuklanmaydi.

export const INVENTARIZATSIYA_YOLI = "/ombor/inventarizatsiya";
export const INVENTARIZATSIYA_OCHISH_HODISASI = "yepost-inventarizatsiya-ochish";

export function inventarizatsiyaniOchish(id: string) {
  if (!id || typeof window === "undefined") return;
  if (window.location.pathname === INVENTARIZATSIYA_YOLI) {
    window.dispatchEvent(new CustomEvent(INVENTARIZATSIYA_OCHISH_HODISASI, { detail: id }));
    return;
  }
  window.history.pushState({}, "", `${INVENTARIZATSIYA_YOLI}?hujjat=${encodeURIComponent(id)}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
