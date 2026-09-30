import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAccessTokenValid, isAuthSessionValid, useAuthStore } from "@/store/authStore";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { accessTokenniAjratish, accessTokenniYangilash as refreshAccessToken } from "@/api/sozlamalarApi";
import { authSessiyaYaroqli, authTokenlarniTozalash } from "@/lib/authTokenStorage";
import { sahifagaRuxsatBormi } from "@/lib/roles";

type ProtectedRouteProps = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const accessTokenniSaqlash = useAuthStore((state) => state.accessTokenniYangilash);
  const profil = useAuthProfileStore((state) => state.profil);
  const [refreshTekshirilmoqda, setRefreshTekshirilmoqda] = useState(false);

  useEffect(() => {
    if (!authSessiyaYaroqli({ accessToken, expiresAt })) {
      authTokenlarniTozalash();
      setRefreshTekshirilmoqda(false);
      return;
    }

    if (isAccessTokenValid(accessToken) || !refreshToken) {
      setRefreshTekshirilmoqda(false);
      return;
    }

    let bekorQilindi = false;
    setRefreshTekshirilmoqda(true);

    refreshAccessToken(refreshToken)
      .then((response) => {
        const accessToken = accessTokenniAjratish(response);
        if (!accessToken) throw new Error("Backend refresh token javobida access token qaytmadi.");
        if (!bekorQilindi) accessTokenniSaqlash(accessToken);
      })
      .catch(() => {
        if (!bekorQilindi) authTokenlarniTozalash();
      })
      .finally(() => {
        if (!bekorQilindi) setRefreshTekshirilmoqda(false);
      });

    return () => {
      bekorQilindi = true;
    };
  }, [accessToken, refreshToken, expiresAt, accessTokenniSaqlash]);

  if (!isAuthSessionValid({ accessToken, expiresAt })) {
    if (authSessiyaYaroqli({ accessToken, expiresAt }) && refreshToken && refreshTekshirilmoqda) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-orange-50 text-sm font-bold text-orange-600">
          Sessiya yangilanmoqda...
        </div>
      );
    }

    if (authSessiyaYaroqli({ accessToken, expiresAt }) && refreshToken) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-orange-50 text-sm font-bold text-orange-600">
          Sessiya tekshirilmoqda...
        </div>
      );
    }

    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Profil hali yuklanayotgan bo'lsa (bir lahzalik holat) sahifa ko'rsatiladi;
  // profil kelgach joriy sahifaga rol bo'yicha ruxsat yo'qligi aniqlansa,
  // bosh sahifaga qaytariladi (backend real cheklovni 403 orqali ta'minlaydi).
  if (profil && location.pathname !== "/" && !sahifagaRuxsatBormi(profil, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
