import { create } from "zustand";
import { persist } from "zustand/middleware";

// Backend rasm yuklashni qo'llamaguncha rasmlar shu qurilmadagi brauzer xotirasida saqlanadi
// (foydalanuvchi ID bo'yicha). Backend `avatarUrl` qaytara boshlasa, u ustunlik qiladi.
type AvatarState = {
  avatarlar: Record<string, string>;
  saqlash: (userId: string, dataUrl: string) => void;
  olibTashlash: (userId: string) => void;
};

export const useAvatarStore = create<AvatarState>()(
  persist(
    (set) => ({
      avatarlar: {},
      saqlash: (userId, dataUrl) => set((holat) => ({ avatarlar: { ...holat.avatarlar, [userId]: dataUrl } })),
      olibTashlash: (userId) =>
        set((holat) => {
          const yangi = { ...holat.avatarlar };
          delete yangi[userId];
          return { avatarlar: yangi };
        }),
    }),
    { name: "yepost-avatarlar" }
  )
);

// Ko'rsatiladigan rasm: avval backenddagi URL, bo'lmasa shu qurilmada saqlangani.
export function useAvatarUrl(userId?: string | null, serverUrl?: string | null) {
  const mahalliy = useAvatarStore((holat) => (userId ? holat.avatarlar[userId] : undefined));
  return serverUrl || mahalliy || "";
}
