import axios from "axios";
import { API_BASE_URL } from "./apiConfig";

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

function xatoniOzbekchalashtirish(message: string) {
  const lugat: Array<[RegExp, string]> = [
    [/branchId must be a UUID/i, "Filial noto'g'ri tanlangan."],
    [/responsibleId must be a UUID/i, "Mas'ul xodim noto'g'ri tanlangan."],
    [/warehouseId must be a UUID/i, "Ombor noto'g'ri tanlangan."],
    [/tariffId must be a UUID/i, "Tarif noto'g'ri tanlangan."],
    [/categoryId must be a UUID/i, "Kategoriya noto'g'ri tanlangan."],
    [/unitId must be a UUID/i, "O'lchov birligi noto'g'ri tanlangan."],
    [/companyId must be a UUID/i, "Mijoz kompaniyasi noto'g'ri tanlangan."],
    [/barcode.*already|barcode.*exists/i, "Bu shtrix-kod avval boshqa mahsulotda ishlatilgan."],
    [/userId must be a UUID/i, "Foydalanuvchi noto'g'ri tanlangan."],
    [/username.*already|username.*exists/i, "Bu login boshqa foydalanuvchida mavjud."],
    [/grant.*already|code.*already/i, "Bu vakolat foydalanuvchiga avval biriktirilgan."],
    [/password.*short|password.*length/i, "Parol talab qilingan uzunlikka mos emas."],
    [/old password|current password|password is incorrect|wrong password/i, "Amaldagi parol noto'g'ri."],
    [/new password.*same|same password/i, "Yangi parol amaldagi paroldan farq qilishi kerak."],
    [/items\.\d+\.quantity.*(less than 0\.001|must be a number)/i, "Qaytariladigan mahsulot miqdori noto'g'ri."],
    [/items\.\d+\.price.*(less than 0|must be a number)/i, "Qaytariladigan mahsulot narxi noto'g'ri."],
    [/saleItemId/i, "Qaytariladigan sotuv mahsuloti topilmadi."],
    [/must be a UUID/i, "Tanlangan ma'lumot formati noto'g'ri."],
    [/already exists|duplicate/i, "Bunday ma'lumot avval yaratilgan."],
    [/not found/i, "Ma'lumot topilmadi."],
    [/Unauthorized/i, "Tizimga kirish muddati tugagan."],
    [/Forbidden/i, "Bu amalni bajarish uchun ruxsat yetarli emas."],
  ];

  return lugat.find(([pattern]) => pattern.test(message))?.[1] ?? message;
}

export async function login(payload: LoginPayload) {
  // Login.tsx: autentifikatsiyasiz POST /auth/login so'rovini yuboradi.
  const response = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/login`, payload, {
    headers: {
      Accept: "application/json",
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
  if (error instanceof Error) {
    return error.message;
  }

  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return "Kutilmagan xatolik yuz berdi. Qayta urinib ko'ring.";
  }

  if (!error.response) {
    return "Server bilan bog'lanib bo'lmadi. Internet aloqasini tekshiring.";
  }

  if (error.response.status === 401) {
    const message = error.response.data?.message;
    return typeof message === "string"
      ? xatoniOzbekchalashtirish(message)
      : "Login, parol yoki sessiya tokeni noto'g'ri.";
  }

  const message = error.response.data?.message;
  if (Array.isArray(message)) {
    return message.map(xatoniOzbekchalashtirish).join(" ");
  }

  return xatoniOzbekchalashtirish(
    message ??
      error.response.data?.detail ??
      error.response.data?.error ??
      "Amalni bajarishda xatolik yuz berdi."
  );
}
