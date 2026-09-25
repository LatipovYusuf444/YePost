import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Truck,
  UserRound,
  Users,
  Warehouse,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { isAuthSessionValid, useAuthStore } from "@/store/authStore";
import LanguageSwitcher from "@/Components/common/LanguageSwitcher";

type LoginLocationState = {
  from?: {
    pathname?: string;
  };
};

type FieldErrors = {
  username?: string;
  password?: string;
};

type NodeKey = "ombor" | "kassa" | "yetkazish" | "mijozlar" | "hisobot";

const NODE_LAYOUT: { id: NodeKey; x: number; y: number; icon: typeof Warehouse }[] = [
  { id: "ombor", x: 14, y: 18, icon: Warehouse },
  { id: "kassa", x: 85, y: 15, icon: CreditCard },
  { id: "yetkazish", x: 89, y: 65, icon: Truck },
  { id: "mijozlar", x: 11, y: 70, icon: Users },
  { id: "hisobot", x: 49, y: 92, icon: BarChart3 },
];

const HUB = { x: 50, y: 44 };

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
  const [username, setUsername] = useState("");
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
    if (errors.username || errors.password) return;

    setIsSubmitting(true);

    try {
      await login({
        username: username.trim(),
        password,
      });

      const state = location.state as LoginLocationState | null;
      navigate(state?.from?.pathname || "/", { replace: true });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060810] text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_60%_at_15%_-10%,rgba(234,88,12,.22),transparent_58%),radial-gradient(ellipse_65%_55%_at_100%_105%,rgba(30,41,59,.9),transparent_60%),linear-gradient(180deg,#060810,#0b1120_55%,#060810)]" />
      <div className="login-overlay-enter pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle,rgba(203,213,225,.18)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_80%_80%_at_35%_45%,black,transparent_88%)]" />
      <div className="login-float-orange pointer-events-none absolute -left-24 top-1/4 h-[28rem] w-[28rem] rounded-full bg-orange-500/20 blur-[130px]" />
      <div className="pointer-events-none absolute -right-16 bottom-[-4rem] h-[26rem] w-[26rem] rounded-full bg-orange-600/10 blur-[140px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/30 to-transparent" />

      <LanguageSwitcher
        variant="dark"
        className="absolute right-3 top-3 z-20 sm:right-5 sm:top-5 xl:right-8 xl:top-8"
      />

      <section className="relative z-10 mx-auto grid min-h-screen max-w-[1540px] xl:grid-cols-[minmax(0,1.15fr)_minmax(440px,500px)]">
        <div className="hidden flex-col px-14 py-14 xl:flex xl:px-16 2xl:px-20">
          <div
            style={{ animationDelay: "80ms" }}
            className="login-item-enter flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-lg font-black text-white shadow-lg shadow-orange-900/40">
              Y
            </div>
            <div>
              <p className="text-base font-black leading-none text-white">YePost</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                {t("brandTagline")}
              </p>
            </div>
          </div>

          <div className="mt-14">
            <span
              style={{ animationDelay: "220ms" }}
              className="login-item-enter inline-flex h-9 items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/15 px-4 text-xs font-bold uppercase tracking-[0.16em] text-orange-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              {t("badge")}
            </span>

            <h1
              style={{ animationDelay: "340ms" }}
              className="login-item-enter mt-7 max-w-xl text-[36px] font-black leading-[1.15] text-white sm:text-[44px]"
            >
              {t("headline1")}
              <br />
              <span className="text-orange-400">{t("headlineHighlight")}</span> {t("headlineEnd")}
            </h1>

            <p
              style={{ animationDelay: "460ms" }}
              className="login-item-enter mt-5 max-w-md text-sm font-medium leading-6 text-slate-400 sm:text-base"
            >
              {t("subtext")}
            </p>
          </div>

          <div
            style={{ animationDelay: "560ms" }}
            className="login-item-enter relative mt-14 h-80 w-full"
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
            >
              <defs>
                <linearGradient id="loginFlowGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(249,115,22,.65)" />
                  <stop offset="100%" stopColor="rgba(148,163,184,.15)" />
                </linearGradient>
              </defs>
              {NODE_LAYOUT.map((node) => (
                <line
                  key={node.id}
                  x1={HUB.x}
                  y1={HUB.y}
                  x2={node.x}
                  y2={node.y}
                  className="login-dash-flow"
                  stroke="url(#loginFlowGrad)"
                  strokeWidth={0.45}
                  strokeLinecap="round"
                />
              ))}
            </svg>

            {NODE_LAYOUT.map((node) => {
              const Icon = node.icon;
              return (
                <div
                  key={node.id}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-3 shadow-[0_14px_34px_rgba(0,0,0,.55)] backdrop-blur-md"
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                >
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md shadow-orange-900/50">
                    <Icon size={16} strokeWidth={2.3} />
                    <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-300 opacity-70" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-slate-900 bg-orange-300" />
                    </span>
                  </span>
                  <div className="whitespace-nowrap">
                    <p className="text-[13px] font-bold leading-tight text-white">
                      {t(`nodes.${node.id}.title`)}
                    </p>
                    <p className="text-[11px] font-medium leading-tight text-slate-300">
                      {t(`nodes.${node.id}.subtitle`)}
                    </p>
                  </div>
                </div>
              );
            })}

            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${HUB.x}%`, top: `${HUB.y}%` }}
            >
              <svg
                viewBox="0 0 100 100"
                className="login-orbit pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="rgba(249,115,22,.28)"
                  strokeWidth="0.6"
                  strokeDasharray="1.5 5"
                />
              </svg>
              <svg
                viewBox="0 0 100 100"
                className="login-orbit-reverse pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="rgba(249,115,22,.2)"
                  strokeWidth="0.6"
                  strokeDasharray="1 4"
                />
              </svg>
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/40 blur-2xl" />
              <div className="relative flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-3 shadow-[0_18px_44px_rgba(0,0,0,.6)] backdrop-blur-md">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-base font-black text-white shadow-lg shadow-orange-900/50">
                  Y
                </span>
                <div className="whitespace-nowrap">
                  <p className="text-base font-black text-white">YePost</p>
                  <p className="text-xs font-semibold text-orange-300">{t("hubSubtitle")}</p>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{ animationDelay: "680ms" }}
            className="login-item-enter mt-auto flex items-center gap-8 pt-10 text-xs font-semibold text-slate-400"
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-300" />
              {t("legend.filiallar")}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              {t("legend.boshTizim")}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-px w-6 border-t border-dashed border-slate-500" />
              {t("legend.oqim")}
            </span>
          </div>
        </div>

        <div className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 xl:px-12 2xl:px-16">
          <div className="w-full max-w-[420px]">
            <div className="login-mobile-brand mb-8 flex items-center justify-center gap-3 xl:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-lg font-black text-white shadow-lg shadow-orange-900/40">
                Y
              </div>
              <div>
                <p className="text-base font-black leading-none text-white">YePost</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {t("brandTagline")}
                </p>
              </div>
            </div>

            <div className="login-panel-enter relative">
              <div className="pointer-events-none absolute -inset-6 rounded-[44px] bg-orange-500/25 blur-2xl" />
              <div className="relative overflow-hidden rounded-[32px] bg-white p-6 shadow-[0_40px_100px_rgba(0,0,0,.55)] sm:p-10">
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600" />
                <h2 className="text-[26px] font-black leading-tight text-slate-900 sm:text-[32px]">
                  {t("cardTitle")}
                </h2>
                <p className="mt-2 text-sm font-medium text-slate-500">{t("cardSubtitle")}</p>

                <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      {t("usernameLabel")}
                    </span>
                    <span
                      className={`flex h-14 items-center gap-3 rounded-2xl border bg-slate-50 px-4 transition focus-within:bg-white focus-within:ring-4 ${
                        showUsernameError
                          ? "border-red-300 focus-within:ring-red-100"
                          : "border-slate-200 focus-within:border-orange-300 focus-within:ring-orange-100"
                      }`}
                    >
                      <UserRound
                        size={18}
                        className={showUsernameError ? "shrink-0 text-red-500" : "shrink-0 text-orange-500"}
                      />
                      <input
                        value={username}
                        onChange={(event) => {
                          setUsername(event.target.value);
                          setErrorMessage("");
                        }}
                        onBlur={() => setTouched((current) => ({ ...current, username: true }))}
                        autoComplete="username"
                        placeholder={t("usernamePlaceholder")}
                        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                        aria-invalid={Boolean(showUsernameError)}
                      />
                    </span>
                    {showUsernameError && (
                      <p className="mt-2 text-xs font-bold text-red-500">{validationErrors.username}</p>
                    )}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">{t("passwordLabel")}</span>
                    <span
                      className={`flex h-14 items-center gap-3 rounded-2xl border bg-slate-50 px-4 transition focus-within:bg-white focus-within:ring-4 ${
                        showPasswordError
                          ? "border-red-300 focus-within:ring-red-100"
                          : "border-slate-200 focus-within:border-orange-300 focus-within:ring-orange-100"
                      }`}
                    >
                      <LockKeyhole
                        size={18}
                        className={showPasswordError ? "shrink-0 text-red-500" : "shrink-0 text-orange-500"}
                      />
                      <input
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setErrorMessage("");
                        }}
                        onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder={t("passwordLabel")}
                        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                        aria-invalid={Boolean(showPasswordError)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-orange-600"
                        aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </span>
                    {showPasswordError && (
                      <p className="mt-2 text-xs font-bold text-red-500">{validationErrors.password}</p>
                    )}
                  </label>

                  {errorMessage && (
                    <div
                      role="alert"
                      className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
                    >
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 text-sm font-black text-white shadow-[0_16px_36px_rgba(234,88,12,.4)] transition duration-300 hover:-translate-y-0.5 hover:from-orange-700 hover:to-orange-600 hover:shadow-[0_20px_44px_rgba(234,88,12,.5)] active:scale-[.98] disabled:cursor-not-allowed disabled:translate-y-0 disabled:from-orange-300 disabled:to-orange-300"
                  >
                    {isSubmitting ? (
                      <LoaderCircle size={19} className="animate-spin" />
                    ) : (
                      <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
                    )}
                    {isSubmitting ? t("submitting") : t("submit")}
                  </button>
                </form>
              </div>
            </div>

            <p className="mt-6 text-center text-xs font-medium text-slate-500">
              © {new Date().getFullYear()} YePost · {t("footer")}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
