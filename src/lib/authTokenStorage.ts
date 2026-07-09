export type AuthTokenlar = {
  accessToken: string | null;
  refreshToken: string | null;
  username: string | null;
  expiresAt: number | null;
};

const AUTH_STORAGE_KEY = "yepost-auth-session";
export const AUTH_SESSION_CHANGED_EVENT = "yepost-auth-session-changed";
export const AUTH_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

const boshAuthHolati: AuthTokenlar = {
  accessToken: null,
  refreshToken: null,
  username: null,
  expiresAt: null,
};

export function authSessiyaYaroqli(tokenlar: Pick<AuthTokenlar, "accessToken" | "expiresAt">) {
  return Boolean(tokenlar.accessToken && tokenlar.expiresAt && tokenlar.expiresAt > Date.now());
}

export function authTokenlarniOlish(): AuthTokenlar {
  try {
    const saqlangan = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saqlangan) return boshAuthHolati;

    const parsed = JSON.parse(saqlangan) as Partial<AuthTokenlar>;
    const tokenlar = {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      username: parsed.username ?? null,
      expiresAt: parsed.expiresAt ?? null,
    };

    if (!authSessiyaYaroqli(tokenlar)) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem("yepost-auth");
      return boshAuthHolati;
    }

    return tokenlar;
  } catch {
    return boshAuthHolati;
  }
}

export function authTokenlarniSaqlash(tokenlar: AuthTokenlar) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokenlar));
  window.dispatchEvent(new CustomEvent<AuthTokenlar>(AUTH_SESSION_CHANGED_EVENT, { detail: tokenlar }));
}

export function accessTokenniSaqlash(accessToken: string) {
  authTokenlarniSaqlash({
    ...authTokenlarniOlish(),
    accessToken,
  });
}

export function authTokenlarniTozalash() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem("yepost-auth");
  window.dispatchEvent(new CustomEvent<AuthTokenlar>(AUTH_SESSION_CHANGED_EVENT, { detail: boshAuthHolati }));
}
