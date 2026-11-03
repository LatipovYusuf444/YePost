import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword, resetTokenInvalid } from "@/api/passwordRecoveryApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useMaydonXatolari } from "@/hooks/useMaydonXatolari";
import type { XatoMaydonQoidasi } from "@/lib/maydonXatolari";
import { authTokenlarniTozalash } from "@/lib/authTokenStorage";
import { AuthPanel as AuthLayout } from "./AuthLayout";
import { AuthMessage, PasswordField, SubmitButton } from "./AuthFields";

// Server xatosi → yangi parol maydoni (so'rov tanasi: { token, newPassword }). Havola eskirgan bo'lsa maydonlar yashiriladi — xabar tepada.
const PAROL_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  newPassword: { maydonlar: ["newPassword", "password"], kodlar: ["password"], sozlar: ["parol", "пароль", "password"] },
};

const javobTanasi = (error: unknown) => (error as { response?: { data?: unknown } } | null | undefined)?.response?.data;

export default function ResetPassword() {
  const { t } = useTranslation("auth");
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [error, setError] = useState("");
  const fx = useMaydonXatolari(PAROL_QOIDALARI);
  const passwordError = password.length < 6 ? t("reset.minLength") : "";
  const confirmationError = !confirmation ? t("reset.confirmRequired") : password !== confirmation ? t("reset.mismatch") : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || invalid || !token.trim()) return;
    setTried(true);
    setError("");
    fx.ornat({});
    if (passwordError || confirmationError) return;
    setBusy(true);
    try {
      await resetPassword(token, password);
      authTokenlarniTozalash();
      navigate("/login", { replace: true, state: { passwordReset: true } });
    } catch (e) {
      const eskirgan = resetTokenInvalid(e);
      setInvalid(eskirgan);
      setError(getApiErrorMessage(e));
      if (!eskirgan) fx.serverdan(javobTanasi(e));
    } finally { setBusy(false); }
  }

  return (
    <AuthLayout title={t(!token.trim() ? "reset.invalidLink" : "reset.title")} subtitle={t(!token.trim() ? "reset.missingToken" : "reset.subtitle")}>
      {!token.trim() ? <Link className="auth-submit" to="/forgot-password">{t("reset.requestAgain")}</Link> : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate aria-busy={busy}>
          {!invalid && <>
            <PasswordField id="new-password" label={t("reset.password")} placeholder={t("reset.passwordPlaceholder")} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); fx.tozala("newPassword"); }} minLength={6} autoComplete="new-password" error={(tried ? passwordError : "") || fx.xato("newPassword")} data-maydon-xato={(tried && passwordError) || fx.xato("newPassword") ? "true" : undefined} />
            <PasswordField id="confirm-password" label={t("reset.confirm")} placeholder={t("reset.confirmPlaceholder")} value={confirmation} onChange={(e) => { setConfirmation(e.target.value); setError(""); }} minLength={6} autoComplete="new-password" error={tried ? confirmationError : ""} data-maydon-xato={tried && confirmationError ? "true" : undefined} />
          </>}
          {(fx.tepadagi || (fx.bor ? "" : error)) && <AuthMessage>{fx.tepadagi || error}</AuthMessage>}
          {invalid ? <Link className="auth-submit" to="/forgot-password">{t("reset.requestAgain")}</Link> : <SubmitButton busy={busy}>{t(busy ? "reset.submitting" : "reset.submit")}</SubmitButton>}
        </form>
      )}
      <Link className="auth-link auth-back-link" to="/login"><ArrowLeft size={16} />{t("backToLogin")}</Link>
    </AuthLayout>
  );
}
