import axios, { type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "./apiConfig";
import { accessTokenniAjratish, accessTokenniYangilash } from "./sozlamalarApi";
import { apiTiliniOlish } from "./apiLanguage";
import {
  accessTokenniSaqlash,
  authSessiyaYaroqli,
  authTokenlarniOlish,
  authTokenlarniTozalash,
} from "@/lib/authTokenStorage";

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
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) {
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
