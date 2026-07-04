import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAccessTokenValid, useAuthStore } from "@/store/authStore";
import { accessTokenniAjratish, accessTokenniYangilash as refreshAccessToken } from "@/api/sozlamalarApi";
import { authTokenlarniTozalash } from "@/lib/authTokenStorage";

type ProtectedRouteProps = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const accessTokenniSaqlash = useAuthStore((state) => state.accessTokenniYangilash);
  const [refreshTekshirilmoqda, setRefreshTekshirilmoqda] = useState(false);

  useEffect(() => {
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
  }, [accessToken, refreshToken, accessTokenniSaqlash]);

  if (!isAccessTokenValid(accessToken)) {
    if (refreshToken && refreshTekshirilmoqda) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-orange-50 text-sm font-bold text-orange-600">
          Sessiya yangilanmoqda...
        </div>
      );
    }

    if (refreshToken) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-orange-50 text-sm font-bold text-orange-600">
          Sessiya tekshirilmoqda...
        </div>
      );
    }

    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
