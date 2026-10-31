import axios from "axios";
import { API_BASE_URL } from "./apiConfig";
import { apiTilHeaderi } from "./apiLanguage";

// Public auth requests also work when this browser has an expired session.
function publicAuthConfig() {
  return {
    headers: { Accept: "application/json", "Content-Type": "application/json", ...apiTilHeaderi() },
    timeout: 30_000,
  };
}

export async function forgotPassword(username: string, workspace?: string) {
  const code = workspace?.trim();
  const response = await axios.post<{ sent: true }>(
    `${API_BASE_URL}/auth/forgot-password`,
    { username: username.trim(), ...(code ? { workspace: code } : {}) },
    publicAuthConfig(),
  );
  return response.data;
}

export async function resetPassword(token: string, newPassword: string) {
  const response = await axios.post<{ success: true }>(
    `${API_BASE_URL}/auth/reset-password`, { token, newPassword }, publicAuthConfig(),
  );
  return response.data;
}

export function resetTokenInvalid(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 400 &&
    error.response.data?.code === "errors.auth.reset_token_invalid";
}
