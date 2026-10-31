import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, MailCheck, Store, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { forgotPassword } from "@/api/passwordRecoveryApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { dokonKodiKerakmi, saqlanganDokonKodi } from "@/lib/dokonKodi";
import { AuthPanel as AuthLayout, type AuthLocationState } from "./AuthLayout";
import { AuthField, AuthMessage, SubmitButton } from "./AuthFields";

export default function ForgotPassword() {
  const { t } = useTranslation("auth");
  const location = useLocation();
  const state = location.state as AuthLocationState | null;
  const [workspace, setWorkspace] = useState(() => state?.workspace ?? saqlanganDokonKodi());
  const [username, setUsername] = useState(state?.username ?? "");
  const [workspaceRequired, setWorkspaceRequired] = useState(false);
  const workspaceRef = useRef<HTMLInputElement>(null);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const usernameError = !username.trim() ? t("errors.usernameRequired") : "";
  const workspaceError = workspaceRequired && !workspace.trim() ? t("errors.workspaceRequired") : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setTried(true);
    setError("");
    if (usernameError || workspaceError) {
      if (workspaceError) workspaceRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await forgotPassword(username, workspace);
      setSent(true);
    } catch (e) {
      if (dokonKodiKerakmi(e)) {
        setWorkspaceRequired(true);
        workspaceRef.current?.focus();
      }
      setError(getApiErrorMessage(e));
    } finally { setBusy(false); }
  }

  return (
    <AuthLayout title={t(sent ? "forgot.sentTitle" : "forgot.title")} subtitle={t(sent ? "forgot.sentSubtitle" : "forgot.subtitle")}>
      {sent ? <div className="auth-sent"><MailCheck size={34} /><AuthMessage success>{t("forgot.sent")}</AuthMessage></div> : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate aria-busy={busy}>
          <AuthField id="workspace" label={t("workspaceLabel")} tag={t(workspaceRequired ? "workspaceRequiredTag" : "workspaceOptional")} icon={<Store size={18} />} inputRef={workspaceRef} value={workspace} onChange={(e) => { setWorkspace(e.target.value); setError(""); }} placeholder={t("workspacePlaceholder")} autoComplete="organization" autoCapitalize="none" spellCheck={false} hint={workspaceRequired ? t("forgot.workspaceHint") : undefined} error={tried ? workspaceError : ""} />
          <AuthField id="username" label={t("usernameLabel")} icon={<UserRound size={18} />} value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} placeholder={t("usernamePlaceholder")} autoComplete="username" autoCapitalize="none" spellCheck={false} error={tried ? usernameError : ""} />
          {error && <AuthMessage>{error}</AuthMessage>}
          <SubmitButton busy={busy}>{t(busy ? "forgot.submitting" : "forgot.submit")}</SubmitButton>
        </form>
      )}
      <Link className="auth-link auth-back-link" to="/login" state={{ workspace, username, from: state?.from }}><ArrowLeft size={16} />{t("backToLogin")}</Link>
    </AuthLayout>
  );
}
