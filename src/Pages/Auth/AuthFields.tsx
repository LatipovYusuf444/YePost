import { useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { ArrowRight, Check, Eye, EyeOff, LoaderCircle, LockKeyhole, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

// Kirish sahifalarining yagona maydon tizimi (Midnight Sapphire): ikonka, yorliq, hover/focus/to'ldirilgan/xato/ogohlantirish/o'chiq holatlar.
// `data-maydon-xato` va boshqa atributlar input'ning o'ziga tushadi (maydon xatolari tizimi xatoli maydonni shu orqali topadi).
type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: ReactNode;
  error?: string;
  hint?: string;
  tag?: string;
  // "ogohlantirish" — maydon endi majburiy (masalan, backend do'kon kodini so'radi): sariq chegara va yorliq.
  ohang?: "oddiy" | "ogohlantirish";
  inputRef?: Ref<HTMLInputElement>;
  // Maydon o'ng tomonidagi qo'shimcha tugma (masalan, parolni ko'rsatish).
  qoshimcha?: ReactNode;
  // Maydon ostidagi qo'shimcha ogohlantirish (xato emas), masalan Caps Lock.
  eslatma?: string;
};

function maydonSinfi(error: string | undefined, ohang: AuthFieldProps["ohang"], value: unknown, disabled?: boolean) {
  return [
    "auth-input-wrap",
    error ? "auth-input-error" : ohang === "ogohlantirish" ? "auth-input-warn" : "",
    value !== undefined && value !== null && String(value) !== "" ? "auth-input-filled" : "",
    disabled ? "auth-input-disabled" : "",
  ].filter(Boolean).join(" ");
}

export function AuthField({ label, icon, error, hint, tag, ohang = "oddiy", inputRef, qoshimcha, eslatma, id, ...props }: AuthFieldProps) {
  const yordamId = error || hint || eslatma ? `${id}-help` : undefined;
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-field-label">
        <span>{label}</span>
        {tag && <span className={`auth-field-tag${ohang === "ogohlantirish" ? " auth-field-tag-warn" : ""}`}>{tag}</span>}
      </label>
      <div className={maydonSinfi(error, ohang, props.value, props.disabled)}>
        <span className="auth-input-icon" aria-hidden="true">{icon}</span>
        <input {...props} id={id} ref={inputRef} aria-invalid={Boolean(error)} aria-describedby={yordamId} />
        {qoshimcha}
      </div>
      {(error || hint || eslatma) && (
        <div id={yordamId}>
          {eslatma && !error && <p className="auth-field-note"><TriangleAlert size={13} aria-hidden="true" />{eslatma}</p>}
          {(error || hint) && <p className={error ? "auth-field-error" : "auth-field-hint"} role={error ? "alert" : undefined}>{error || hint}</p>}
        </div>
      )}
    </div>
  );
}

// Parol maydoni: haqiqiy yashirish (type="password"), ko'rsatish/yashirish tugmasi (klaviatura bilan ham), Caps Lock ogohlantirishi.
export function PasswordField({ label, error, id, onKeyDown, onKeyUp, onBlur, ...props }: Omit<AuthFieldProps, "icon" | "qoshimcha" | "eslatma">) {
  const { t } = useTranslation("auth");
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const capsniTekshirish = (event: KeyboardEvent<HTMLInputElement>) => {
    if (typeof event.getModifierState === "function") setCapsLock(event.getModifierState("CapsLock"));
  };
  return (
    <AuthField
      {...props}
      id={id}
      label={label}
      error={error}
      icon={<LockKeyhole size={19} />}
      type={visible ? "text" : "password"}
      onKeyDown={(event) => { capsniTekshirish(event); onKeyDown?.(event); }}
      onKeyUp={(event) => { capsniTekshirish(event); onKeyUp?.(event); }}
      onBlur={(event) => { setCapsLock(false); onBlur?.(event); }}
      eslatma={capsLock ? t("sapphire.capsLock") : undefined}
      qoshimcha={
        <button
          className="auth-password-toggle"
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={t(visible ? "hidePassword" : "showPassword")}
          aria-pressed={visible}
          aria-controls={id}
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      }
    />
  );
}

// Asosiy tugma: sapfir gradient, yaltirash, bosilish holati, yuklanish (spinner) va muvaffaqiyat (✓) holati.
export function SubmitButton({ busy, done = false, children }: { busy: boolean; done?: boolean; children: ReactNode }) {
  return (
    <button className={`auth-submit${done ? " auth-submit-done" : ""}`} type="submit" disabled={busy || done} aria-busy={busy && !done}>
      <span className="auth-submit-shine" aria-hidden="true" />
      {done ? <Check size={19} aria-hidden="true" /> : busy ? <LoaderCircle size={19} className="auth-spin" aria-hidden="true" /> : <ArrowRight size={19} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

export function AuthMessage({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return <div className={`auth-message${success ? " auth-message-success" : ""}`} role={success ? "status" : "alert"}>{children}</div>;
}
