import type { ReactNode } from "react";
import { useAvatarUrl } from "@/store/avatarStore";

// Foydalanuvchi rasmi: backenddagi URL yoki shu qurilmada saqlangan nusxa; bo'lmasa `children` (bosh harflar).
export default function AvatarRasm({
  userId,
  url,
  children,
  className = "",
}: {
  userId?: string | null;
  url?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const manba = useAvatarUrl(userId, url);
  return manba ? <img src={manba} alt="" className={`h-full w-full object-cover ${className}`} /> : <>{children}</>;
}
