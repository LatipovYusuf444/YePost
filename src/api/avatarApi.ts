import axios from "axios";
import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";
import { useAvatarStore } from "@/store/avatarStore";

// Rasm yuklash endpointlari: docs/avatar-backend-spec.md
type AvatarJavobi = { avatarUrl?: string | null; url?: string | null };

export type AvatarNatija = { url: string; mahalliy: boolean };

function endpointYoq(error: unknown) {
  return axios.isAxiosError(error) && [404, 405, 501].includes(error.response?.status ?? 0);
}

function yoli(userId: string, oz: boolean) {
  return oz ? "/auth/me/avatar" : `/accounts/users/${userId}/avatar`;
}

export const avatarApi = {
  // oz = true bo'lsa joriy foydalanuvchining o'z rasmi, aks holda xodim rasmi (ADMIN/DIRECTOR).
  yuklash: async (userId: string, blob: Blob, dataUrl: string, oz = false): Promise<AvatarNatija> => {
    const formData = new FormData();
    formData.append("file", blob, "avatar.jpg");
    try {
      const javob = apiData((await apiClient.post<AvatarJavobi | ApiEnvelope<AvatarJavobi>>(yoli(userId, oz), formData)).data);
      const url = javob?.avatarUrl || javob?.url || "";
      if (url) {
        useAvatarStore.getState().olibTashlash(userId);
        return { url, mahalliy: false };
      }
      // Backend rasmni qabul qildi, lekin URL qaytarmadi — ko'rsatish uchun mahalliy nusxa saqlanadi.
      useAvatarStore.getState().saqlash(userId, dataUrl);
      return { url: dataUrl, mahalliy: false };
    } catch (error) {
      if (!endpointYoq(error)) throw error;
      useAvatarStore.getState().saqlash(userId, dataUrl);
      return { url: dataUrl, mahalliy: true };
    }
  },

  olibTashlash: async (userId: string, oz = false): Promise<{ mahalliy: boolean }> => {
    try {
      await apiClient.delete(yoli(userId, oz));
      useAvatarStore.getState().olibTashlash(userId);
      return { mahalliy: false };
    } catch (error) {
      if (!endpointYoq(error)) throw error;
      useAvatarStore.getState().olibTashlash(userId);
      return { mahalliy: true };
    }
  },
};
