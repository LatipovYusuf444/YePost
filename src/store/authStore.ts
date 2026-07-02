import { create } from "zustand";
import {
  backenddanChiqish,
  login as loginRequest,
  type LoginPayload,
} from "@/api/sozlamalarApi";
import {
  AUTH_SESSION_CHANGED_EVENT,
  authTokenlarniOlish,
  authTokenlarniSaqlash,
  authTokenlarniTozalash,
  type AuthTokenlar,
} from "@/lib/authTokenStorage";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  username: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  accessTokenniYangilash: (accessToken: string) => void;
  logout: () => Promise<void>;
};

function getTokenExpiration(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(window.atob(padded)) as { exp?: number };

    return decoded.exp ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isAccessTokenValid(token: string | null) {
  if (!token) return false;

  const expiresAt = getTokenExpiration(token);
  return expiresAt !== null && expiresAt > Date.now();
}

const saqlanganTokenlar = authTokenlarniOlish();

export const useAuthStore = create<AuthState>((set, get) => ({
  ...saqlanganTokenlar,

  // Login.tsx shu metod orqali POST /auth/login endpointiga ulanadi.
  login: async (payload) => {
    const tokens = await loginRequest(payload);
    const authHolati = {
      accessToken: tokens.access,
      refreshToken: tokens.refresh,
      username: payload.username,
    };

    authTokenlarniSaqlash(authHolati);
    set(authHolati);
  },

  // axios.ts POST /auth/refresh javobidan keyin yangi access tokenni saqlaydi.
  accessTokenniYangilash: (accessToken) => {
    const authHolati = {
      accessToken,
      refreshToken: get().refreshToken,
      username: get().username,
    };

    authTokenlarniSaqlash(authHolati);
    set({ accessToken });
  },

  // YonPanel.tsx avval backend sessiyasini yopadi, keyin lokal tokenlarni tozalaydi.
  logout: async () => {
    const accessToken = get().accessToken;

    try {
      if (accessToken && isAccessTokenValid(accessToken)) {
        await backenddanChiqish(accessToken);
      }
    } catch {
      // Backend sessiyasi allaqachon tugagan bo'lsa ham foydalanuvchi lokal tizimdan chiqadi.
    } finally {
      authTokenlarniTozalash();
      set({
        accessToken: null,
        refreshToken: null,
        username: null,
      });
    }
  },
}));

if (typeof window !== "undefined") {
  window.addEventListener(AUTH_SESSION_CHANGED_EVENT, (event) => {
    const tokenlar = (event as CustomEvent<AuthTokenlar>).detail;
    useAuthStore.setState(tokenlar);
  });
}
