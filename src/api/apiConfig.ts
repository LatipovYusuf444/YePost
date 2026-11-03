// Vercel'dagi /backend-api rewrite (proxy) har so'rovga ~0.2–0.5 s qo'shadi. Backend CORS faqat asosiy domenga ruxsat beradi
// (https://ye-post.vercel.app: GET, POST, PUT, PATCH, DELETE), shuning uchun shu domendan API to'g'ridan-to'g'ri chaqiriladi.
// Preview domenlar va lokal dev (Vite proxy) eski yo'lda qoladi. VITE_API_BASE_URL da to'liq manzil yozilsa — doim o'sha.
const PROXY_MANZILI = "/backend-api/api/v1";
const TOGRIDAN_MANZIL = "https://pos.169-58-167-219.sslip.io/api/v1";
const TOGRIDAN_DOMENLAR = new Set(["ye-post.vercel.app"]);

function apiManzili() {
  const sozlangan = import.meta.env.VITE_API_BASE_URL;
  if (sozlangan && /^https?:\/\//i.test(sozlangan)) return sozlangan;
  if (typeof window !== "undefined" && TOGRIDAN_DOMENLAR.has(window.location.hostname)) return TOGRIDAN_MANZIL;
  return sozlangan ?? PROXY_MANZILI;
}

export const API_BASE_URL = apiManzili();
