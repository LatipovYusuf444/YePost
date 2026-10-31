import axios, { type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "./apiConfig";
import { accessTokenniAjratish, accessTokenniYangilash, getApiErrorMessage } from "./sozlamalarApi";
import { ogohlantirishXatosimi } from "./hujjatOgohlantirishi";
import { shubhaliValyutaXatosimi } from "./valyutaShubhasi";
import { apiTiliniOlish } from "./apiLanguage";
import {
  accessTokenniSaqlash,
  authSessiyaYaroqli,
  authTokenlarniOlish,
  authTokenlarniTozalash,
} from "@/lib/authTokenStorage";
import { muvaffaqiyatXabari, xatolikXabari } from "@/lib/toast";
import { toast } from "sonner";
import { negativeStockMessages } from "@/lib/negativeStock";

// Toast ko'rsatilmaydigan yo'llar: auth oqimi (o'zi navigatsiya qiladi),
// bildirishnoma o'qilgan deb belgilash va chat/support xabar yuborish
// (fon jarayoni yoki o'z UI-tasdig'i bor harakatlar, alohida toast shart emas).
// "/reports/discounts" — sahifa xatoni o'zi ko'rsatadi va backendda endpoint bo'lmasa (404) zaxira hisobga o'tadi.
const TOAST_ISTISNOLARI = ["/auth/login", "/auth/refresh", "/auth/logout", "/notifications", "/chat/", "/support/messages", "/reports/discounts", "/opening-debt"];

function toastKerakmi(url?: string) {
  if (!url) return true;
  return !TOAST_ISTISNOLARI.some((yol) => url.includes(yol));
}

// KASSIR/OMBORCHI uchun ba'zi to'liq ro'yxatlar (xodimlar, filiallar,
// kompaniyalar, to'liq mahsulot katalogi) backendda 403 qaytaradi — bu
// funksionallik, xatolik emas (frontend bo'sh ro'yxat sifatida qabul
// qiladi), shuning uchun bunday holatda xatolik toasti chiqarilmaydi.
const ROL_CHEKLANGAN_TOLIQ_ROYXATLAR = [
  "/accounts/users",
  "/organization/branches",
  "/organization/company",
  "/catalog/modifications",
];

function rolCheklanganRoyxat403Mi(error: unknown) {
  if (!axios.isAxiosError(error) || error.response?.status !== 403) return false;
  if (error.config?.method?.toLowerCase() !== "get") return false;
  const yol = (error.config.url ?? "").split("?")[0];
  return ROL_CHEKLANGAN_TOLIQ_ROYXATLAR.includes(yol);
}

// Kassa fonda o'qiydigan sozlama (narx turlari): o'qib bo'lmasa (masalan, rolga ruxsat yo'q) kassa avvalgidek ishlaydi,
// shuning uchun bu GET xatosi har sahifada qizil xabar chiqarmaydi.
const FON_SOZLAMA_YOLLARI = ["/settings/sales", "/settings/period-close"];

function fonSozlamaXatosiMi(error: unknown) {
  if (!axios.isAxiosError(error) || error.config?.method?.toLowerCase() !== "get") return false;
  const yol = (error.config.url ?? "").split("?")[0];
  return FON_SOZLAMA_YOLLARI.includes(yol);
}

// Fon (yordamchi) so'rovlar uchun: `xatoniYashirish: true` bo'lsa, xato bo'lganda qizil toast chiqarilmaydi
// (masalan, ro'yxatdagi nomlarni to'ldirish uchun id bo'yicha olinadigan mijoz o'chirilgan bo'lsa).
declare module "axios" {
  interface AxiosRequestConfig {
    xatoniYashirish?: boolean;
  }
}

const MUTATSIYA_USULLARI = new Set(["post", "put", "patch", "delete"]);

function muvaffaqiyatMatni(usul?: string) {
  if (usul === "delete") return "Muvaffaqiyatli o'chirildi";
  if (usul === "post") return "Muvaffaqiyatli yaratildi";
  return "Muvaffaqiyatli saqlandi";
}

export { API_BASE_URL };

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  timeout: 30_000,
});

type QaytaUriniladiganSorov = InternalAxiosRequestConfig & {
  _qaytaUrinildi?: boolean;
};

let tokenYangilashSorovi: Promise<string> | null = null;

apiClient.interceptors.request.use((config) => {
  const authHolati = authTokenlarniOlish();
  const accessToken = authHolati.accessToken;

  if (accessToken && !authSessiyaYaroqli(authHolati)) {
    authTokenlarniTozalash();
    window.location.assign("/login");
    return config;
  }

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  config.headers["x-lang"] = apiTiliniOlish();

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    for (const message of negativeStockMessages(response.data, response.config.url ?? "", response.config.method, apiTiliniOlish())) {
      const options = { id: message.text, duration: 12_000 };
      if (message.kind === "warning") toast.warning(message.text, options);
      else toast.success(message.text, options);
    }
    const usul = response.config.method?.toLowerCase();
    if (usul && MUTATSIYA_USULLARI.has(usul) && toastKerakmi(response.config.url)) {
      muvaffaqiyatXabari(muvaffaqiyatMatni(usul));
    }
    return response;
  },
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) {
      // 409 before_stock_take va 400 suspicious_currency — xato emas, "Davom etasizmi?" / "Valyuta to'g'rimi?" so'rovi:
      // toast o'rniga tasdiqlash oynasi chiqadi (api/hujjatOgohlantirishi, api/valyutaShubhasi).
      if (axios.isAxiosError(error) && toastKerakmi(error.config?.url) && !rolCheklanganRoyxat403Mi(error) && !fonSozlamaXatosiMi(error) && !ogohlantirishXatosimi(error) && !shubhaliValyutaXatosimi(error) && !error.config?.xatoniYashirish) {
        xatolikXabari(getApiErrorMessage(error));
      }
      return Promise.reject(error);
    }

    const aslSorov = error.config as QaytaUriniladiganSorov;
    const authHolati = authTokenlarniOlish();

    if (
      aslSorov._qaytaUrinildi ||
      aslSorov.url?.includes("/auth/login") ||
      aslSorov.url?.includes("/auth/refresh") ||
      !authSessiyaYaroqli(authHolati) ||
      !authHolati.refreshToken
    ) {
      authTokenlarniTozalash();
      window.location.assign("/login");
      return Promise.reject(error);
    }

    aslSorov._qaytaUrinildi = true;

    try {
      tokenYangilashSorovi ??= accessTokenniYangilash(authHolati.refreshToken)
        .then((response) => {
          const accessToken = accessTokenniAjratish(response);
          if (!accessToken) throw new Error("Backend refresh token javobida access token qaytmadi.");
          return accessToken;
        })
        .finally(() => {
          tokenYangilashSorovi = null;
        });

      const yangiAccessToken = await tokenYangilashSorovi;
      accessTokenniSaqlash(yangiAccessToken);
      aslSorov.headers.Authorization = `Bearer ${yangiAccessToken}`;
      aslSorov.headers["x-lang"] = apiTiliniOlish();

      return apiClient(aslSorov);
    } catch (refreshXatosi) {
      authTokenlarniTozalash();
      window.location.assign("/login");
      return Promise.reject(refreshXatosi);
    }
  }
);

export default apiClient;
