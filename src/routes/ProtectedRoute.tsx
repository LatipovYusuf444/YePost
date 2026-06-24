import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAccessTokenValid, useAuthStore } from "@/store/authStore";

type ProtectedRouteProps = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!isAccessTokenValid(accessToken)) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
