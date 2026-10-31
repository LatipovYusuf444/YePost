import { useState, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { useTranslation } from "react-i18next";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string; icon: ReactNode; error?: string; hint?: string; tag?: string; inputRef?: Ref<HTMLInputElement>;
};

export function AuthField({ label, icon, error, hint, tag, inputRef, id, ...props }: AuthFieldProps) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}{tag && <span className="auth-field-tag">{tag}</span>}</label>
      <div className={`auth-input-wrap${error ? " auth-input-error" : ""}`}>
        <span className="auth-input-icon">{icon}</span>
        <input {...props} id={id} ref={inputRef} aria-invalid={Boolean(error)} aria-describedby={error || hint ? `${id}-help` : undefined} />
      </div>
      {(error || hint) && <p id={`${id}-help`} className={error ? "auth-field-error" : "auth-field-hint"}>{error || hint}</p>}
    </div>
  );
}

export function PasswordField({ label, error, id, ...props }: Omit<AuthFieldProps, "icon">) {
  const { t } = useTranslation("auth");
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className={`auth-input-wrap${error ? " auth-input-error" : ""}`}>
        <span className="auth-input-icon"><LockKeyhole size={18} /></span>
        <input {...props} id={id} type={visible ? "text" : "password"} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
        <button className="auth-password-toggle" type="button" onClick={() => setVisible(!visible)} aria-label={t(visible ? "hidePassword" : "showPassword")} aria-pressed={visible}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p id={`${id}-error`} className="auth-field-error">{error}</p>}
    </div>
  );
}

export function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return <button className="auth-submit" type="submit" disabled={busy}>{children}{busy ? <LoaderCircle size={18} className="animate-spin" /> : <ArrowRight size={18} />}</button>;
}

export function AuthMessage({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return <div className={`auth-message${success ? " auth-message-success" : ""}`} role={success ? "status" : "alert"}>{children}</div>;
}
