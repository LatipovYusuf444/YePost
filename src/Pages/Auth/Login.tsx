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
  ShieldCheck,
  Boxes,
  Wallet,
  CircleHelp,
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

function DashboardPreview() {
  return (
    <div className="login-dashboard relative mx-auto mt-8 h-[310px] w-full max-w-[700px] sm:h-[360px] 2xl:h-[430px] 2xl:max-w-[900px]">
      <div className="login-orbit-ring login-orbit-ring-one" />
      <div className="login-orbit-ring login-orbit-ring-two" />
      <div className="login-dashboard-screen absolute left-[13%] top-[10%] grid h-[78%] w-[74%] grid-cols-[100px_1fr_112px] overflow-hidden rounded-[24px] border border-blue-300/60 bg-[#071a3b]/95 p-3 shadow-[0_20px_70px_rgba(0,70,255,.35)] sm:grid-cols-[120px_1fr_130px] sm:p-4">
        <div className="border-r border-blue-300/10 pr-3 text-[10px] text-blue-200/70 sm:text-xs">
          <div className="mb-5 flex items-center gap-2 font-bold text-white"><span className="rounded-md bg-blue-600 p-1 text-[10px]">Y</span> YePost</div>
          {["Boshqaruv", "Savdo", "Ombor", "Kassa", "Hisobotlar"].map((x, i) => <div key={x} className={`mb-3 rounded-lg px-2 py-1.5 ${i === 0 ? "bg-blue-500/20 text-blue-100" : ""}`}>{x}</div>)}
        </div>
        <div className="px-3 sm:px-4">
          <p className="text-[9px] text-blue-200/60 sm:text-[11px]">Umumiy ko'rsatkich</p>
          <strong className="mt-1 block text-sm text-white sm:text-xl">12 458 000 so'm</strong>
          <span className="text-[9px] text-emerald-300 sm:text-[11px]">↑ 12.5%</span>
          <div className="mt-3 h-[105px] rounded-xl border border-blue-300/10 bg-[#06132d] p-2 sm:mt-5 sm:h-[145px]">
            <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="h-full w-full overflow-visible">
              <path d="M0 100 L40 86 75 92 110 68 145 77 180 50 215 61 250 39 285 48 320 24 355 31 400 5" fill="none" stroke="#38bdf8" strokeWidth="3" className="login-chart-line" />
              <path d="M0 100 L40 86 75 92 110 68 145 77 180 50 215 61 250 39 285 48 320 24 355 31 400 5 V120 H0Z" fill="url(#area)" opacity=".28" />
              <defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#1687ff"/><stop offset="1" stopColor="#1687ff" stopOpacity="0"/></linearGradient></defs>
            </svg>
          </div>
          <div className="mt-3 flex h-10 items-end gap-2 sm:mt-4 sm:h-12">{[34, 52, 42, 70, 57, 80, 61, 92, 70, 100, 80, 88].map((h, i) => <span key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-700 to-sky-400/90" style={{ height: `${h}%` }} />)}</div>
        </div>
        <div className="space-y-2 sm:space-y-3">
          {[["Kirim", "8 420 000", "↑ 8.3%"], ["Chiqim", "3 120 000", "↓ 2.4%"]].map(([title, value, change], i) => <div key={title} className="rounded-xl border border-blue-300/15 bg-blue-900/35 p-2 sm:p-3"><span className={`mb-2 flex h-6 w-6 items-center justify-center rounded-full ${i ? "bg-rose-500" : "bg-emerald-500"}`}><Wallet size={13} /></span><p className="text-[9px] text-blue-100/70 sm:text-[10px]">{title}</p><b className="text-[10px] text-white sm:text-xs">{value}</b><p className={`text-[9px] ${i ? "text-rose-300" : "text-emerald-300"}`}>{change}</p></div>)}
        </div>
      </div>
      <div className="login-metric-card absolute left-0 top-[27%] flex items-center gap-2 rounded-2xl border border-blue-300/45 bg-blue-900/70 px-3 py-2 text-white shadow-lg backdrop-blur-xl sm:px-4 sm:py-3"><span className="rounded-xl bg-blue-500/35 p-2"><BarChart3 size={18}/></span><span><b className="block text-xs">Savdo</b><small className="text-emerald-300">↑ 12.5%</small></span></div>
      <div className="login-metric-card login-metric-delay absolute right-0 top-[5%] flex items-center gap-2 rounded-2xl border border-blue-300/45 bg-blue-900/70 px-3 py-2 text-white shadow-lg backdrop-blur-xl sm:px-4 sm:py-3"><span className="rounded-xl bg-blue-500/35 p-2"><Boxes size={18}/></span><span><b className="block text-xs">Ombor</b><small className="text-emerald-300">↑ 8.3%</small></span></div>
      <div className="login-metric-card login-metric-delay-two absolute bottom-[1%] right-[4%] flex items-center gap-2 rounded-2xl border border-blue-300/45 bg-blue-900/70 px-3 py-2 text-white shadow-lg backdrop-blur-xl sm:px-4 sm:py-3"><span className="rounded-xl bg-blue-500/35 p-2"><Wallet size={18}/></span><span><b className="block text-xs">Kassa</b><small className="text-emerald-300">↑ 6.7%</small></span></div>
    </div>
  );
}

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
    <main className="login-page relative min-h-screen overflow-hidden bg-[#020817] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_65%_at_12%_15%,rgba(37,99,235,.24),transparent_60%),radial-gradient(ellipse_55%_55%_at_100%_85%,rgba(0,163,255,.16),transparent_62%),linear-gradient(130deg,#06122B,#020817_55%,#071A3D)]" />
      <div className="login-overlay-enter pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle,rgba(203,213,225,.18)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_80%_80%_at_35%_45%,black,transparent_88%)]" />
      <div aria-hidden="true" className="login-ambient-glow login-ambient-glow-one pointer-events-none absolute -left-48 top-[12%] h-[34rem] w-[34rem] rounded-full" />
      <div aria-hidden="true" className="login-ambient-glow login-ambient-glow-two pointer-events-none absolute -right-52 bottom-[-8rem] h-[40rem] w-[40rem] rounded-full" />
      <svg aria-hidden="true" className="login-background-wave pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="none">
        <path d="M-80 630 C 250 520, 360 790, 690 670 S 1190 520, 1680 660" />
        <path d="M-80 690 C 260 570, 430 850, 760 720 S 1260 590, 1680 730" />
      </svg>
      <div className="login-float-blue pointer-events-none absolute -left-24 top-1/4 h-[28rem] w-[28rem] rounded-full bg-blue-500/20 blur-[130px]" />
      <div className="login-float-blue pointer-events-none absolute -right-16 bottom-[-4rem] h-[26rem] w-[26rem] rounded-full bg-sky-500/15 blur-[140px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />

      <section className="relative z-10 mx-auto grid min-h-screen max-w-[1600px] items-center gap-4 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(400px,500px)] lg:gap-8 lg:px-10 lg:py-8 2xl:max-w-[1720px] 2xl:grid-cols-[minmax(0,1fr)_480px] 2xl:gap-16 2xl:px-12">
        <div className="flex flex-col px-1 py-4 sm:px-5 lg:px-2 lg:py-8 xl:px-8">
          <div
            style={{ animationDelay: "80ms" }}
            className="login-item-enter flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-lg font-black text-white shadow-lg shadow-blue-900/50">
              Y
            </div>
            <div>
              <p className="text-base font-black leading-none text-white">YePost</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-200/70">
                {t("brandTagline")}
              </p>
            </div>
          </div>

          <div className="mt-8 sm:mt-10 2xl:mt-14">
            <p
              style={{ animationDelay: "220ms" }}
              className="login-item-enter max-w-2xl text-sm font-medium leading-6 text-blue-100/70 sm:text-base 2xl:text-lg 2xl:leading-7"
            >
              {t("subtext")}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4 lg:mt-8 2xl:mt-10">
            {[[ShieldCheck,"Tezkor","Boshqaruv"],[Boxes,"Xavfsiz","Ma'lumotlar"],[ShieldCheck,"Qulay","Interfeys"],[CircleHelp,"24/7","Qo'llab-quvvatlash"]].map(([Icon,title,desc],i) => { const FeatureIcon = Icon as typeof ShieldCheck; return <div key={title as string} style={{animationDelay:`${100+i*100}ms`}} className="login-item-enter flex items-center gap-2 border-r border-blue-300/10 pr-2 last:border-0"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-300/30 bg-blue-500/15 text-blue-300"><FeatureIcon size={17}/></span><span><b className="block text-xs text-white">{title as string}</b><small className="text-[10px] text-blue-100/65">{desc as string}</small></span></div>; })}
          </div>

          <div style={{ animationDelay: "360ms" }} className="login-item-enter relative mt-5 2xl:mt-8">
            <DashboardPreview />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-medium text-blue-200/65 sm:gap-x-8">
            <span>Sotuvlar</span><span>Ombor</span><span>Kassa</span><span>Hisobotlar</span><span>Tahlil</span>
          </div>

          {/* Decorative analytics replaces the former network diagram. */}
          <div className="hidden">
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
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-900/50">
                    <Icon size={16} strokeWidth={2.3} />
                    <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-300 opacity-70" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-slate-900 bg-blue-300" />
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
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/40 blur-2xl" />
              <div className="relative flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-3 shadow-[0_18px_44px_rgba(0,0,0,.6)] backdrop-blur-md">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-base font-black text-white shadow-lg shadow-blue-900/50">
                  Y
                </span>
                <div className="whitespace-nowrap">
                  <p className="text-base font-black text-white">YePost</p>
                  <p className="text-xs font-semibold text-blue-300">{t("hubSubtitle")}</p>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{ animationDelay: "680ms" }}
            className="login-item-enter mt-auto flex items-center gap-8 pt-10 text-xs font-semibold text-blue-200/70"
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-300" />
              {t("legend.filiallar")}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              {t("legend.boshTizim")}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-px w-6 border-t border-dashed border-slate-500" />
              {t("legend.oqim")}
            </span>
          </div>
        </div>

        <div className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-0 xl:px-0">
          <div className="w-full max-w-[420px] 2xl:max-w-[460px]">
            <div className="login-mobile-brand mb-5 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-lg font-black text-white shadow-lg shadow-blue-900/40">
                Y
              </div>
              <div>
                <p className="text-base font-black leading-none text-white">YePost</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-200/70">
                  {t("brandTagline")}
                </p>
              </div>
            </div>

            <div className="login-panel-enter relative">
              <div className="pointer-events-none absolute -inset-5 rounded-[36px] bg-blue-500/20 blur-2xl" />
              <div className="login-card relative overflow-hidden rounded-[24px] border border-blue-300/40 bg-[rgba(15,31,65,.78)] p-6 shadow-[0_24px_80px_rgba(0,70,200,.22)] backdrop-blur-2xl sm:p-8">
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-xl font-black text-white shadow-lg shadow-blue-900/50">Y</span>
                  <LanguageSwitcher variant="dark" />
                </div>
                <h2 className="text-[26px] font-bold leading-tight text-white sm:text-[29px]">
                  Xush kelibsiz!
                </h2>
                <p className="mt-2 text-sm font-medium leading-5 text-blue-100/70">Tizimga kirish uchun o'z ma'lumotlaringizni kiriting</p>

                <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
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
                </form>
              </div>
            </div>

            <p className="mt-5 text-center text-[11px] font-medium text-blue-100/55">
              © {new Date().getFullYear()} YePost · {t("footer")}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
