import axios from "axios";
import { API_BASE_URL } from "./apiConfig";
import { apiTilHeaderi } from "./apiLanguage";

export type LoginPayload = {
  username: string;
  password: string;
};

export type LoginResponse = {
  access?: string;
  refresh?: string;
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  data?: {
    access?: string;
    refresh?: string;
    accessToken?: string;
    refreshToken?: string;
    token?: string;
  };
};

export type RefreshResponse = {
  access?: string;
  accessToken?: string;
  token?: string;
  data?: {
    access?: string;
    accessToken?: string;
    token?: string;
  };
};

type ApiErrorBody = {
  message?: string | string[];
  detail?: string;
  error?: string;
};

export async function login(payload: LoginPayload) {
  // Login.tsx: autentifikatsiyasiz POST /auth/login so'rovini yuboradi.
  const response = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/login`, payload, {
    headers: {
      Accept: "application/json",
      ...apiTilHeaderi(),
      "Content-Type": "application/json",
    },
    timeout: 30_000,
  });

  return response.data;
}

export async function accessTokenniYangilash(refreshToken: string) {
  // axios.ts: access token eskirganda real refresh token bilan yangisini oladi.
  const response = await axios.post<RefreshResponse>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...apiTilHeaderi(),
      },
      timeout: 30_000,
    }
  );

  return response.data;
}

export async function backenddanChiqish(accessToken: string) {
  // YonPanel.tsx: faqat bitta "Bearer" prefiksi bilan POST /auth/logout yuboradi.
  await axios.post(`${API_BASE_URL}/auth/logout`, undefined, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...apiTilHeaderi(),
    },
    timeout: 30_000,
  });
}

export function loginTokenlariniAjratish(tokens: LoginResponse) {
  const accessToken =
    tokens.access ??
    tokens.accessToken ??
    tokens.token ??
    tokens.data?.access ??
    tokens.data?.accessToken ??
    tokens.data?.token;
  const refreshToken =
    tokens.refresh ?? tokens.refreshToken ?? tokens.data?.refresh ?? tokens.data?.refreshToken ?? null;

  return { accessToken: accessToken ?? null, refreshToken };
}

export function accessTokenniAjratish(response: RefreshResponse) {
  return (
    response.access ??
    response.accessToken ??
    response.token ??
    response.data?.access ??
    response.data?.accessToken ??
    response.data?.token ??
    null
  );
}

export function getApiErrorMessage(error: unknown) {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return error instanceof Error
      ? error.message
      : "Kutilmagan xatolik yuz berdi. Qayta urinib ko'ring.";
  }

  if (!error.response) {
    return "Server bilan bog'lanib bo'lmadi. Internet aloqasini tekshiring.";
  }

  const message = error.response.data?.message;
  if (Array.isArray(message)) {
    return message.join(" ");
  }
  if (message) return message;
  if (error.response.data?.detail) return error.response.data.detail;
  if (error.response.data?.error) return error.response.data.error;

  const generic: Record<number, string> = {
    400: "Yuborilgan ma'lumotlarda xatolik bor.",
    401: "Login yoki sessiya tokeni noto'g'ri.",
    403: "Bu amalni bajarish uchun ruxsat yetarli emas.",
    404: "Ma'lumot topilmadi.",
    409: "Bu amal mavjud holat bilan to'qnashdi.",
  };
  return generic[error.response.status] ?? "Amalni bajarishda xatolik yuz berdi.";
}
