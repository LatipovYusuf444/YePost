import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAccessTokenValid, isAuthSessionValid, useAuthStore } from "@/store/authStore";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { accessTokenniAjratish, accessTokenniYangilash as refreshAccessToken } from "@/api/sozlamalarApi";
import { authSessiyaYaroqli, authTokenlarniTozalash } from "@/lib/authTokenStorage";
import { sahifagaRuxsatBormi } from "@/lib/roles";
import LoadingState from "@/Components/common/LoadingState";

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
  const profilYuklanmoqda = useAuthProfileStore((state) => state.yuklanmoqda);
  const profilXatosi = useAuthProfileStore((state) => state.xatolik);
  const profilniYuklash = useAuthProfileStore((state) => state.profilniYuklash);
  const [refreshTekshirilmoqda, setRefreshTekshirilmoqda] = useState(false);
  const [profilSoraldi, setProfilSoraldi] = useState(false);
  const sessiyaYaroqli = isAuthSessionValid({ accessToken, expiresAt });

  // Profil (isStaff, rol) kompaniya sahifalari ochilishidan oldin kerak: super admin /admin ga, oddiy foydalanuvchi
  // esa /admin dan chiqarib yuboriladi — aks holda super admin bir lahza kompaniya sahifalarini ochib, xato olardi.
  useEffect(() => {
    if (sessiyaYaroqli && !profil && !profilYuklanmoqda && !profilSoraldi) {
      setProfilSoraldi(true);
      void profilniYuklash();
    }
  }, [sessiyaYaroqli, profil, profilYuklanmoqda, profilSoraldi, profilniYuklash]);

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

  // Profil birinchi marta yuklanayotgan bo'lsa kutamiz; yuklab bo'lmasa (xatolik) sahifa avvalgidek ochiladi.
  if (!profil && !profilXatosi && (profilYuklanmoqda || !profilSoraldi)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <LoadingState matn="Yuklanmoqda..." className="w-full max-w-md" />
      </div>
    );
  }

  // Super admin (isStaff: true, workspaceId: null) faqat /admin panelida ishlaydi; oddiy foydalanuvchi /admin ga kira olmaydi.
  const adminYoli = location.pathname === "/admin" || location.pathname.startsWith("/admin/");
  if (profil?.isStaff && !adminYoli) return <Navigate to="/admin" replace />;
  if (profil && !profil.isStaff && adminYoli) return <Navigate to="/" replace />;
  // Super adminning roli bo'sh yoki kompaniya rollaridan boshqacha bo'lishi mumkin: rol cheklovi unga tegishli emas
  // (aks holda sahifagaRuxsatBormi "/admin" ni rad etib, "/" <-> "/admin" cheksiz qaytish tsikli paydo bo'ladi).
  if (profil?.isStaff) return children;

  // Profil hali yuklanayotgan bo'lsa (bir lahzalik holat) sahifa ko'rsatiladi;
  // profil kelgach joriy sahifaga rol bo'yicha ruxsat yo'qligi aniqlansa,
  // bosh sahifaga qaytariladi (backend real cheklovni 403 orqali ta'minlaydi).
  if (profil && location.pathname !== "/" && !sahifagaRuxsatBormi(profil, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
