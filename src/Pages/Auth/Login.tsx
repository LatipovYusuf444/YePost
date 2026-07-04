import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { isAccessTokenValid, useAuthStore } from "@/store/authStore";
import loginHero from "@/assets/yepost-login-hero.png";

type LoginLocationState = {
  from?: {
    pathname?: string;
  };
};

type FieldErrors = {
  username?: string;
  password?: string;
};

function validateLogin(username: string, password: string) {
  const errors: FieldErrors = {};
  const cleanUsername = username.trim();

  if (!cleanUsername) {
    errors.username = "Loginni kiriting.";
  } else if (cleanUsername.length < 3) {
    errors.username = "Login kamida 3 ta belgidan iborat bo'lishi kerak.";
  } else if (/\s/.test(cleanUsername)) {
    errors.username = "Login ichida bo'sh joy bo'lmasin.";
  }

  if (!password) {
    errors.password = "Parolni kiriting.";
  } else if (password.length < 4) {
    errors.password = "Parol kamida 4 ta belgidan iborat bo'lishi kerak.";
  }

  return errors;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);
  const login = useAuthStore((state) => state.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [touched, setTouched] = useState({ username: false, password: false });
  const [submitTried, setSubmitTried] = useState(false);

  const validationErrors = useMemo(
    () => validateLogin(username, password),
    [username, password]
  );
  const showUsernameError = (touched.username || submitTried) && validationErrors.username;
  const showPasswordError = (touched.password || submitTried) && validationErrors.password;

  if (isAccessTokenValid(accessToken)) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitTried(true);
    setErrorMessage("");

    const errors = validateLogin(username, password);
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
    <main className="relative min-h-screen overflow-hidden bg-[#14120F] text-slate-950">
      <img
        src={loginHero}
        alt="YePost savdo, ombor va yetkazib berish boshqaruvi"
        className="login-bg-enter absolute inset-0 h-full w-full object-cover"
      />
      <div className="login-overlay-enter absolute inset-0 bg-[linear-gradient(90deg,rgba(14,12,9,.70),rgba(14,12,9,.26)_54%,rgba(255,248,239,.34))]" />
      <div className="login-aura-enter pointer-events-none absolute right-[7%] top-[15%] hidden h-44 w-44 rounded-full bg-orange-400/25 blur-[72px] lg:block" />

      <section className="relative grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(480px,560px)]">
        <div className="hidden lg:block" />

        <div className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-[540px]">
            <div className="login-mobile-brand mb-9 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-xl font-black text-white shadow-lg shadow-orange-200">
                  Y
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-600">
                    YePost
                  </p>
                  <p className="text-sm font-semibold text-slate-500">
                    Savdo boshqaruvi
                  </p>
                </div>
              </div>
              <ShieldCheck className="text-orange-500" size={24} />
            </div>

            <div
              className="login-panel-enter relative overflow-hidden rounded-[42px] border border-white/55 bg-[rgba(255,255,255,.16)] p-7 shadow-[inset_0_1px_1px_rgba(255,255,255,.78),inset_0_-36px_70px_rgba(255,255,255,.13),0_34px_110px_rgba(15,23,42,.34)] backdrop-blur-[34px] backdrop-saturate-200 transition-transform duration-500 ease-out hover:-translate-y-1 sm:p-10"
              style={{ WebkitBackdropFilter: "blur(34px) saturate(200%)" }}
            >
              <div className="login-liquid-sheen pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_6%,rgba(255,255,255,.82),transparent_30%),radial-gradient(circle_at_92%_10%,rgba(96,165,250,.42),transparent_38%),radial-gradient(circle_at_4%_88%,rgba(249,115,22,.34),transparent_40%),linear-gradient(135deg,rgba(255,255,255,.42),rgba(255,255,255,.08)_42%,rgba(255,255,255,.20))]" />
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/85" />
              <div className="login-float-blue pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-blue-400/35 blur-[64px]" />
              <div className="login-float-orange pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-orange-400/28 blur-[60px]" />
              <div className="pointer-events-none absolute left-8 top-8 h-28 w-72 -rotate-12 rounded-full bg-white/18 blur-2xl" />

              <div className="relative z-10 mb-8">
                <span
                  style={{ animationDelay: "360ms" }}
                  className="login-item-enter inline-flex h-10 items-center gap-2 rounded-full border border-white/60 bg-white/30 px-5 text-xs font-black uppercase tracking-[0.18em] text-orange-600 shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_12px_34px_rgba(15,23,42,.12)] backdrop-blur-2xl backdrop-saturate-200"
                >
                  <ShieldCheck size={15} />
                  Xavfsiz kirish
                </span>
                <h2
                  style={{ animationDelay: "480ms" }}
                  className="login-item-enter mt-7 bg-gradient-to-r from-slate-950 via-slate-900 to-orange-700 bg-clip-text text-[38px] font-black leading-tight text-transparent drop-shadow-[0_1px_0_rgba(255,255,255,.42)] sm:text-[50px]"
                >
                  Tizimga kirish
                </h2>
                <p
                  style={{ animationDelay: "600ms" }}
                  className="login-item-enter mt-4 text-sm font-medium leading-6 text-slate-600 sm:text-base"
                >
                  YePost paneliga kirish uchun login va parolingizni kiriting.
                </p>
              </div>

              <form className="relative z-10 space-y-6" onSubmit={handleSubmit} noValidate>
                <label style={{ animationDelay: "720ms" }} className="login-item-enter block">
                  <span className="mb-3 block text-sm font-bold text-slate-700">
                    Login
                  </span>
                  <span
                    className={`flex h-16 items-center gap-4 rounded-[22px] border bg-white/20 px-5 shadow-[inset_0_1px_1px_rgba(255,255,255,.78),inset_0_-18px_34px_rgba(255,255,255,.10),0_16px_34px_rgba(15,23,42,.12)] backdrop-blur-[28px] backdrop-saturate-200 transition focus-within:ring-4 ${
                      showUsernameError
                        ? "border-red-300 focus-within:ring-red-100"
                        : "border-white/65 focus-within:border-orange-300 focus-within:ring-orange-200/45"
                    }`}
                  >
                    <UserRound
                      size={19}
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
                      placeholder="Masalan: director"
                      className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none selection:bg-transparent selection:text-slate-900 placeholder:text-slate-400"
                      style={{ WebkitTextFillColor: "#0f172a", transition: "background-color 9999s ease-out 0s" }}
                      aria-invalid={Boolean(showUsernameError)}
                    />
                  </span>
                  {showUsernameError && (
                    <p className="mt-2 text-xs font-bold text-red-500">{validationErrors.username}</p>
                  )}
                </label>

                <label style={{ animationDelay: "840ms" }} className="login-item-enter block">
                  <span className="mb-3 block text-sm font-bold text-slate-700">
                    Parol
                  </span>
                  <span
                    className={`flex h-16 items-center gap-4 rounded-[22px] border bg-white/20 px-5 shadow-[inset_0_1px_1px_rgba(255,255,255,.78),inset_0_-18px_34px_rgba(255,255,255,.10),0_16px_34px_rgba(15,23,42,.12)] backdrop-blur-[28px] backdrop-saturate-200 transition focus-within:ring-4 ${
                      showPasswordError
                        ? "border-red-300 focus-within:ring-red-100"
                        : "border-white/65 focus-within:border-orange-300 focus-within:ring-orange-200/45"
                    }`}
                  >
                    <LockKeyhole
                      size={19}
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
                      placeholder="Parol"
                      className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none selection:bg-transparent selection:text-slate-900 placeholder:text-slate-400"
                      style={{ WebkitTextFillColor: "#0f172a", transition: "background-color 9999s ease-out 0s" }}
                      aria-invalid={Boolean(showPasswordError)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-white/30 hover:text-orange-600"
                      aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </span>
                  {showPasswordError && (
                    <p className="mt-2 text-xs font-bold text-red-500">{validationErrors.password}</p>
                  )}
                </label>

                {errorMessage && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-100/80 bg-red-50/80 px-4 py-3 text-sm font-bold text-red-600 backdrop-blur-xl"
                  >
                    {errorMessage}
                  </div>
                )}

                <button
                  style={{ animationDelay: "960ms" }}
                  type="submit"
                  disabled={isSubmitting}
                  className="login-item-enter group flex h-16 w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-orange-600 to-orange-500 px-5 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_20px_44px_rgba(234,88,12,.34)] transition duration-300 hover:-translate-y-1 hover:from-orange-700 hover:to-orange-600 hover:shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_26px_54px_rgba(234,88,12,.42)] active:scale-[.98] disabled:cursor-not-allowed disabled:translate-y-0 disabled:from-orange-300 disabled:to-orange-300"
                >
                  {isSubmitting ? (
                    <LoaderCircle size={19} className="animate-spin" />
                  ) : (
                    <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
                  )}
                  {isSubmitting ? "Tekshirilmoqda..." : "Kirish"}
                </button>
              </form>

            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
