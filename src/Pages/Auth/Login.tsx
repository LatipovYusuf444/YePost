import { useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ChevronRight, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Store, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import {
  dokonKodiKerakmi,
  dokonKodiniSaqlash,
  dokonKodiniTozalash,
  loginMalumoti,
  saqlanganDokonKodi,
} from "@/lib/dokonKodi";
import { isAuthSessionValid, useAuthStore } from "@/store/authStore";
import { AuthPanel } from "./AuthLayout";

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
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [touched, setTouched] = useState({ username: false, password: false });
  const [submitTried, setSubmitTried] = useState(false);

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

  if (isAuthSessionValid({ accessToken, expiresAt })) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitTried(true);
    setErrorMessage("");

    const errors = validateLogin(username, password, errorMessages);
    // Backend "do'kon kodi kerak" degandan keyin maydon majburiy: bo'sh bo'lsa so'rov yuborilmaydi.
    const kodXatosi = dokonKodiKerak && !dokonKodiniTozalash(dokonKodi) ? t("errors.workspaceRequired") : "";
    setDokonKodiXatosi(kodXatosi);
    if (errors.username || errors.password || kodXatosi) {
      if (kodXatosi) dokonKodiRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      await login(loginMalumoti(username.trim(), password, dokonKodi));
      // Keyingi safar so'ralmasligi uchun eslab qolinadi (olib tashlangan bo'lsa — o'chiriladi).
      dokonKodiniSaqlash(dokonKodi);

      const state = location.state as LoginLocationState | null;
      navigate(state?.from?.pathname || "/", { replace: true });
    } catch (error) {
      // errors.user.workspace_required: login bir nechta do'konda bor — kodni so'raymiz (backend xabari bilan).
      if (dokonKodiKerakmi(error)) {
        setDokonKodiKerak(true);
        dokonKodiRef.current?.focus();
      }
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPanel title="Xush kelibsiz!" subtitle="Tizimga kirish uchun o'z ma'lumotlaringizni kiriting">
                <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
                  <label className="block">
                    <span className="mb-2 flex items-baseline justify-between gap-2 text-sm font-bold text-blue-50">
                      {t("workspaceLabel")}
                      <small className={`text-[11px] font-semibold ${dokonKodiKerak ? "text-amber-300" : "text-blue-200/60"}`}>
                        {dokonKodiKerak ? t("workspaceRequiredTag") : t("workspaceOptional")}
                      </small>
                    </span>
                    <span
                      className={`login-input flex h-14 items-center gap-3 rounded-2xl border bg-white/[0.035] px-4 transition focus-within:bg-white/[0.055] focus-within:ring-[3px] ${
                        dokonKodiXatosi
                          ? "border-red-300 focus-within:ring-red-100"
                          : dokonKodiKerak
                            ? "border-amber-300/70 focus-within:border-amber-300 focus-within:ring-amber-300/20"
                            : "border-blue-300/35 focus-within:border-blue-400 focus-within:ring-blue-500/20"
                      }`}
                    >
                      <Store size={18} className={dokonKodiXatosi ? "shrink-0 text-red-500" : "shrink-0 text-blue-500"} />
                      <input
                        ref={dokonKodiRef}
                        id="workspace"
                        name="workspace"
                        value={dokonKodi}
                        onChange={(event) => {
                          setDokonKodi(event.target.value);
                          setDokonKodiXatosi("");
                          setErrorMessage("");
                        }}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder={t("workspacePlaceholder")}
                        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-blue-200/70"
                        aria-invalid={Boolean(dokonKodiXatosi)}
                      />
                    </span>
                    {dokonKodiXatosi ? (
                      <p className="mt-2 text-xs font-bold text-red-500">{dokonKodiXatosi}</p>
                    ) : (
                      <p className="mt-2 text-[11px] font-medium leading-4 text-blue-100/55">{t("workspaceHint")}</p>
                    )}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-blue-50">
                      {t("usernameLabel")}
                    </span>
                    <span
                      className={`login-input flex h-14 items-center gap-3 rounded-2xl border bg-white/[0.035] px-4 transition focus-within:bg-white/[0.055] focus-within:ring-[3px] ${
                        showUsernameError
                          ? "border-red-300 focus-within:ring-red-100"
                          : "border-blue-300/35 focus-within:border-blue-400 focus-within:ring-blue-500/20"
                      }`}
                    >
                      <UserRound
                        size={18}
                        className={showUsernameError ? "shrink-0 text-red-500" : "shrink-0 text-blue-500"}
                      />
                      <input
                        value={username}
                        id="username"
                        onChange={(event) => {
                          setUsername(event.target.value);
                          setErrorMessage("");
                        }}
                        onBlur={() => setTouched((current) => ({ ...current, username: true }))}
                        autoComplete="off"
                        placeholder={t("usernamePlaceholder")}
                        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-blue-200/70"
                        aria-invalid={Boolean(showUsernameError)}
                      />
                    </span>
                    {showUsernameError && (
                      <p className="mt-2 text-xs font-bold text-red-500">{validationErrors.username}</p>
                    )}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-blue-50">{t("passwordLabel")}</span>
                    <span
                      className={`login-input flex h-14 items-center gap-3 rounded-2xl border bg-white/[0.035] px-4 transition focus-within:bg-white/[0.055] focus-within:ring-[3px] ${
                        showPasswordError
                          ? "border-red-300 focus-within:ring-red-100"
                          : "border-blue-300/35 focus-within:border-blue-400 focus-within:ring-blue-500/20"
                      }`}
                    >
                      <LockKeyhole
                        size={18}
                        className={showPasswordError ? "shrink-0 text-red-500" : "shrink-0 text-blue-500"}
                      />
                      <input
                        value={password}
                        id="password"
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setErrorMessage("");
                        }}
                        onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                        type={showPassword ? "text" : "password"}
                        autoComplete="off"
                        placeholder={t("passwordLabel")}
                        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-blue-200/70"
                        aria-invalid={Boolean(showPasswordError)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-blue-200/70 transition hover:bg-slate-100 hover:text-blue-600"
                        aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </span>
                    {showPasswordError && (
                      <p className="mt-2 text-xs font-bold text-red-500">{validationErrors.password}</p>
                    )}
                  </label>

                  {(location.state as LoginLocationState | null)?.passwordReset && <div role="status" className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200">{t("reset.success")}</div>}
                  {errorMessage && (
                    <div
                      role="alert"
                      className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
                    >
                      {errorMessage}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xs text-blue-100/75">
                    <label className="inline-flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-blue-500" /> Meni eslab qolish</label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-sm font-black text-white shadow-[0_16px_36px_rgba(37,99,235,.4)] transition duration-300 hover:-translate-y-0.5 hover:from-blue-700 hover:to-blue-600 hover:shadow-[0_20px_44px_rgba(37,99,235,.5)] active:scale-[.98] disabled:cursor-not-allowed disabled:translate-y-0 disabled:from-blue-300 disabled:to-blue-300"
                  >
                    {isSubmitting ? (
                      <LoaderCircle size={19} className="animate-spin" />
                    ) : (
                      <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
                    )}
                    {isSubmitting ? t("submitting") : t("submit")}
                  </button>
                  <div className="auth-forgot-row">
                    <Link to="/forgot-password" state={{ workspace: dokonKodi, username, from: (location.state as LoginLocationState | null)?.from }} className="auth-forgot-action">
                      <span className="auth-forgot-icon" aria-hidden="true"><KeyRound size={16} strokeWidth={1.8} /></span>
                      <span>{t("forgot.link")}</span>
                      <ChevronRight size={15} className="auth-forgot-arrow" aria-hidden="true" />
                    </Link>
                  </div>
                </form>
    </AuthPanel>
  );
}
