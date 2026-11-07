import { useMemo, useRef, useState, type FormEvent } from "react";
import { ChevronRight, KeyRound, Store, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useMaydonXatolari } from "@/hooks/useMaydonXatolari";
import type { XatoMaydonQoidasi } from "@/lib/maydonXatolari";
import {
  dokonKodiKerakmi,
  dokonKodiniSaqlash,
  dokonKodiniTozalash,
  loginMalumoti,
  saqlanganDokonKodi,
} from "@/lib/dokonKodi";
import { isAuthSessionValid, useAuthStore } from "@/store/authStore";
import { AuthPanel } from "./AuthLayout";
import { AuthField, AuthMessage, PasswordField, SubmitButton } from "./AuthFields";

// Muvaffaqiyatli kirishdan keyin tugmadagi "✓" holati ko'rinib ulgurishi uchun qisqa pauza (harakat kamaytirilgan rejimda — yo'q).
const MUVAFFAQIYAT_PAUZASI = 320;

function harakatKamaytirilganmi() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type LoginLocationState = {
  workspace?: string;
  username?: string;
  passwordReset?: boolean;
  from?: {
    pathname?: string;
  };
};

type FieldErrors = {
  username?: string;
  password?: string;
};

// Server xatosi → maydon (so'rov tanasi: { workspace?, username, password }). invalid_credentials qaysi maydonligi noma'lum —
// shuning uchun xabar so'zi bo'yicha login/parolga bog'lanmaydi, tepada qoladi.
const LOGIN_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  workspace: { maydonlar: ["workspace"], kodlar: ["workspace"] },
  username: { maydonlar: ["username"] },
  password: { maydonlar: ["password"] },
};

// Faqat axios xatosining javob tanasi (axios import qilinmaydi — xato strukturasi bo'yicha).
const javobTanasi = (error: unknown) => (error as { response?: { data?: unknown } } | null | undefined)?.response?.data;


function validateLogin(username: string, password: string, errors: Record<string, string>) {
  const fieldErrors: FieldErrors = {};
  const cleanUsername = username.trim();

  if (!cleanUsername) {
    fieldErrors.username = errors.usernameRequired;
  } else if (cleanUsername.length < 3) {
    fieldErrors.username = errors.usernameMinLength;
  } else if (/\s/.test(cleanUsername)) {
    fieldErrors.username = errors.usernameNoSpaces;
  }

  if (!password) {
    fieldErrors.password = errors.passwordRequired;
  } else if (password.length < 4) {
    fieldErrors.password = errors.passwordMinLength;
  }

  return fieldErrors;
}

export default function Login() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const login = useAuthStore((state) => state.login);
  // Do'kon kodi (Workspace.slug): oxirgi muvaffaqiyatli kirishdagi kod oldindan to'ladi; backend "kod kerak" desa majburiy bo'ladi.
  const [dokonKodi, setDokonKodi] = useState(() => (location.state as LoginLocationState | null)?.workspace ?? saqlanganDokonKodi());
  const [dokonKodiKerak, setDokonKodiKerak] = useState(false);
  const [dokonKodiXatosi, setDokonKodiXatosi] = useState("");
  const dokonKodiRef = useRef<HTMLInputElement | null>(null);
  const [username, setUsername] = useState((location.state as LoginLocationState | null)?.username ?? "");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Faqat haqiqiy muvaffaqiyatli kirishdan keyin: tugma "✓ Kirildi" holatiga o'tadi va qayta yuborilmaydi.
  const [kirildi, setKirildi] = useState(false);
  // Shu formadan kirish ketayotganda store'ga token yozilishi bilan darhol yo'naltirilmaydi: avval "✓ Kirildi" ko'rinadi,
  // keyin pastdagi navigate (yoki boshqa sessiya egasida — to'liq yuklash) o'sha manzilga olib boradi.
  const [kirishJarayoni, setKirishJarayoni] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [touched, setTouched] = useState({ username: false, password: false });
  const [submitTried, setSubmitTried] = useState(false);
  // Server xatosi tegishli maydon ostida (do'kon kodi kerak → do'kon kodi maydoni); mos maydon bo'lmasa — tepadagi xabar.
  const fx = useMaydonXatolari(LOGIN_QOIDALARI);

  const errorMessages = useMemo(
    () => ({
      usernameRequired: t("errors.usernameRequired"),
      usernameMinLength: t("errors.usernameMinLength"),
      usernameNoSpaces: t("errors.usernameNoSpaces"),
      passwordRequired: t("errors.passwordRequired"),
      passwordMinLength: t("errors.passwordMinLength"),
    }),
    [t]
  );

  const validationErrors = useMemo(
    () => validateLogin(username, password, errorMessages),
    [username, password, errorMessages]
  );
  const showUsernameError = (touched.username || submitTried) && validationErrors.username;
  const showPasswordError = (touched.password || submitTried) && validationErrors.password;
  // Mijoz tekshiruvi ustun, keyin server xatosi.
  const kodMaydonXatosi = dokonKodiXatosi || fx.xato("workspace") || "";
  const usernameXatosi = (showUsernameError ? validationErrors.username : "") || fx.xato("username") || "";
  const passwordXatosi = (showPasswordError ? validationErrors.password : "") || fx.xato("password") || "";
  const tepaXatosi = fx.tepadagi || (fx.bor ? "" : errorMessage);

  if (isAuthSessionValid({ accessToken, expiresAt }) && !kirishJarayoni) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Yuklanish paytida takroriy yuborish yo'q.
    if (isSubmitting || kirildi) return;
    setSubmitTried(true);
    setErrorMessage("");
    fx.ornat({});

    const errors = validateLogin(username, password, errorMessages);
    // Backend "do'kon kodi kerak" degandan keyin maydon majburiy: bo'sh bo'lsa so'rov yuborilmaydi.
    const kodXatosi = dokonKodiKerak && !dokonKodiniTozalash(dokonKodi) ? t("errors.workspaceRequired") : "";
    setDokonKodiXatosi(kodXatosi);
    if (errors.username || errors.password || kodXatosi) {
      if (kodXatosi) dokonKodiRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setKirishJarayoni(true);

    try {
      const boshqaEgasi = await login(loginMalumoti(username.trim(), password, dokonKodi));
      // Keyingi safar so'ralmasligi uchun eslab qolinadi (olib tashlangan bo'lsa — o'chiriladi).
      dokonKodiniSaqlash(dokonKodi);

      const state = location.state as LoginLocationState | null;
      const manzil = state?.from?.pathname || "/";
      setKirildi(true);
      if (!harakatKamaytirilganmi()) await new Promise((tayyor) => setTimeout(tayyor, MUVAFFAQIYAT_PAUZASI));
      // Boshqa do'kon/foydalanuvchi: xotirada oldingi sessiyaning store'lari qolmasligi uchun sahifa to'liq yuklanadi (K4).
      if (boshqaEgasi) window.location.assign(manzil);
      else navigate(manzil, { replace: true });
    } catch (error) {
      setKirishJarayoni(false);
      // errors.user.workspace_required: login bir nechta do'konda bor — kodni so'raymiz (backend xabari bilan).
      if (dokonKodiKerakmi(error)) {
        setDokonKodiKerak(true);
        dokonKodiRef.current?.focus();
      }
      setErrorMessage(getApiErrorMessage(error));
      fx.serverdan(javobTanasi(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const holat = location.state as LoginLocationState | null;

  return (
    <AuthPanel title={t("sapphire.welcome")} subtitle={t("sapphire.welcomeText")}>
      <form className="auth-form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
        <AuthField
          id="workspace"
          name="workspace"
          label={t("workspaceLabel")}
          tag={dokonKodiKerak ? t("workspaceRequiredTag") : t("workspaceOptional")}
          ohang={dokonKodiKerak ? "ogohlantirish" : "oddiy"}
          icon={<Store size={19} />}
          inputRef={dokonKodiRef}
          value={dokonKodi}
          onChange={(event) => {
            setDokonKodi(event.target.value);
            setDokonKodiXatosi("");
            setErrorMessage("");
            fx.tozala("workspace");
          }}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={t("workspacePlaceholder")}
          readOnly={isSubmitting || kirildi}
          error={kodMaydonXatosi}
          hint={t("workspaceHint")}
          data-maydon-xato={kodMaydonXatosi ? "true" : undefined}
        />

        <AuthField
          id="username"
          name="username"
          label={t("usernameLabel")}
          icon={<UserRound size={19} />}
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            setErrorMessage("");
            fx.tozala("username");
          }}
          onBlur={() => setTouched((current) => ({ ...current, username: true }))}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={t("usernamePlaceholder")}
          readOnly={isSubmitting || kirildi}
          error={usernameXatosi}
          data-maydon-xato={usernameXatosi ? "true" : undefined}
        />

        <PasswordField
          id="password"
          name="password"
          label={t("passwordLabel")}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setErrorMessage("");
            fx.tozala("password");
          }}
          onBlur={() => setTouched((current) => ({ ...current, password: true }))}
          autoComplete="off"
          placeholder={t("passwordPlaceholder")}
          readOnly={isSubmitting || kirildi}
          error={passwordXatosi}
          data-maydon-xato={passwordXatosi ? "true" : undefined}
        />

        {holat?.passwordReset && <AuthMessage success>{t("reset.success")}</AuthMessage>}
        {tepaXatosi && <AuthMessage>{tepaXatosi}</AuthMessage>}

        <label className="auth-remember">
          <input type="checkbox" defaultChecked />
          <span className="auth-remember-box" aria-hidden="true" />
          <span>{t("sapphire.remember")}</span>
        </label>

        <SubmitButton busy={isSubmitting} done={kirildi}>
          {kirildi ? t("sapphire.signedIn") : isSubmitting ? t("submitting") : t("submit")}
        </SubmitButton>

        <div className="auth-forgot-row">
          <Link to="/forgot-password" state={{ workspace: dokonKodi, username, from: holat?.from }} className="auth-forgot-action">
            <span className="auth-forgot-icon" aria-hidden="true"><KeyRound size={16} strokeWidth={1.8} /></span>
            <span>{t("forgot.link")}</span>
            <ChevronRight size={15} className="auth-forgot-arrow" aria-hidden="true" />
          </Link>
        </div>
      </form>
    </AuthPanel>
  );
}
