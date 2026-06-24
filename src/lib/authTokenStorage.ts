export type AuthTokenlar = {
  accessToken: string | null;
  refreshToken: string | null;
  username: string | null;
};

const AUTH_STORAGE_KEY = "yepost-auth-session";

const boshAuthHolati: AuthTokenlar = {
  accessToken: null,
  refreshToken: null,
  username: null,
};

export function authTokenlarniOlish(): AuthTokenlar {
  try {
    const saqlangan = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saqlangan) return boshAuthHolati;

    const parsed = JSON.parse(saqlangan) as Partial<AuthTokenlar>;

    return {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      username: parsed.username ?? null,
    };
  } catch {
    return boshAuthHolati;
  }
}

export function authTokenlarniSaqlash(tokenlar: AuthTokenlar) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokenlar));
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
}
