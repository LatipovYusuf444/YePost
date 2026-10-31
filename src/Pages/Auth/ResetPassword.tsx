import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword, resetTokenInvalid } from "@/api/passwordRecoveryApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { authTokenlarniTozalash } from "@/lib/authTokenStorage";
import { AuthPanel as AuthLayout } from "./AuthLayout";
import { AuthMessage, PasswordField, SubmitButton } from "./AuthFields";

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
  const passwordError = password.length < 6 ? t("reset.minLength") : "";
  const confirmationError = !confirmation ? t("reset.confirmRequired") : password !== confirmation ? t("reset.mismatch") : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || invalid || !token.trim()) return;
    setTried(true);
    setError("");
    if (passwordError || confirmationError) return;
    setBusy(true);
    try {
      await resetPassword(token, password);
      authTokenlarniTozalash();
      navigate("/login", { replace: true, state: { passwordReset: true } });
    } catch (e) {
      setInvalid(resetTokenInvalid(e));
      setError(getApiErrorMessage(e));
    } finally { setBusy(false); }
  }

  return (
    <AuthLayout title={t(!token.trim() ? "reset.invalidLink" : "reset.title")} subtitle={t(!token.trim() ? "reset.missingToken" : "reset.subtitle")}>
      {!token.trim() ? <Link className="auth-submit" to="/forgot-password">{t("reset.requestAgain")}</Link> : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate aria-busy={busy}>
          {!invalid && <>
            <PasswordField id="new-password" label={t("reset.password")} placeholder={t("reset.passwordPlaceholder")} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} minLength={6} autoComplete="new-password" error={tried ? passwordError : ""} />
            <PasswordField id="confirm-password" label={t("reset.confirm")} placeholder={t("reset.confirmPlaceholder")} value={confirmation} onChange={(e) => { setConfirmation(e.target.value); setError(""); }} minLength={6} autoComplete="new-password" error={tried ? confirmationError : ""} />
          </>}
          {error && <AuthMessage>{error}</AuthMessage>}
          {invalid ? <Link className="auth-submit" to="/forgot-password">{t("reset.requestAgain")}</Link> : <SubmitButton busy={busy}>{t(busy ? "reset.submitting" : "reset.submit")}</SubmitButton>}
        </form>
      )}
      <Link className="auth-link auth-back-link" to="/login"><ArrowLeft size={16} />{t("backToLogin")}</Link>
    </AuthLayout>
  );
}
