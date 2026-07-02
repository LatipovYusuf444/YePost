import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BadgeCheck,
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
    <main className="min-h-screen bg-[#FFF8EF] text-slate-950">
      <section className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(480px,560px)]">
        <div className="relative hidden overflow-hidden bg-[#14120F] lg:block">
          <img
            src={loginHero}
            alt="YePost savdo, ombor va yetkazib berish boshqaruvi"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(14,12,9,.82),rgba(14,12,9,.34)_58%,rgba(14,12,9,.68))]" />

          <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl font-black text-orange-600 shadow-[0_18px_40px_rgba(0,0,0,.25)]">
                Y
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.28em] text-white">
                  YePost
                </p>
                <p className="mt-1 text-sm font-semibold text-white/70">
                  Savdo boshqaruvi
                </p>
              </div>
            </div>

            <div className="max-w-xl">
              <span className="inline-flex h-9 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur">
                <BadgeCheck size={16} />
                2026 ish jarayoni
              </span>
              <h1 className="mt-6 text-[clamp(40px,5vw,70px)] font-black leading-[0.98] text-white">
                Savdo, ombor va post nazorati bir joyda.
              </h1>
              <p className="mt-6 max-w-lg text-base font-medium leading-7 text-white/78">
                Kundalik buyurtmalar, mijozlar, kassalar va yetkazish jarayonlarini
                tez, aniq va tartibli boshqaring.
              </p>
            </div>

            <div className="grid max-w-xl grid-cols-3 gap-3">
              {[
                ["99.9%", "barqaror kirish"],
                ["24/7", "operatsiya nazorati"],
                ["1 panel", "savdo oqimi"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md"
                >
                  <p className="text-xl font-black text-white">{value}</p>
                  <p className="mt-1 text-xs font-semibold text-white/62">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:bg-white">
          <div className="w-full max-w-[460px]">
            <div className="mb-9 flex items-center justify-between lg:hidden">
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

            <div className="rounded-[32px] border border-orange-100 bg-white p-5 shadow-[0_24px_70px_rgba(194,65,12,.12)] sm:p-8 lg:border-transparent lg:shadow-none">
              <div className="mb-8">
                <span className="inline-flex h-9 items-center gap-2 rounded-full bg-orange-50 px-4 text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                  <ShieldCheck size={15} />
                  Xavfsiz kirish
                </span>
                <h2 className="mt-5 text-[34px] font-black leading-tight text-slate-950 sm:text-[42px]">
                  Tizimga kirish
                </h2>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                  YePost paneliga kirish uchun login va parolingizni kiriting.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Login
                  </span>
                  <span
                    className={`flex h-14 items-center gap-3 rounded-2xl border bg-white px-4 shadow-sm transition focus-within:ring-4 ${
                      showUsernameError
                        ? "border-red-300 focus-within:ring-red-100"
                        : "border-orange-100 focus-within:border-orange-500 focus-within:ring-orange-100"
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
                      className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                      aria-invalid={Boolean(showUsernameError)}
                    />
                  </span>
                  {showUsernameError && (
                    <p className="mt-2 text-xs font-bold text-red-500">{validationErrors.username}</p>
                  )}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Parol
                  </span>
                  <span
                    className={`flex h-14 items-center gap-3 rounded-2xl border bg-white px-4 shadow-sm transition focus-within:ring-4 ${
                      showPasswordError
                        ? "border-red-300 focus-within:ring-red-100"
                        : "border-orange-100 focus-within:border-orange-500 focus-within:ring-orange-100"
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
                      className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                      aria-invalid={Boolean(showPasswordError)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-orange-50 hover:text-orange-600"
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
                    className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
                  >
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-sm font-black text-white shadow-[0_18px_36px_rgba(234,88,12,.28)] transition hover:-translate-y-0.5 hover:bg-orange-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-orange-300"
                >
                  {isSubmitting ? (
                    <LoaderCircle size={19} className="animate-spin" />
                  ) : (
                    <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
                  )}
                  {isSubmitting ? "Tekshirilmoqda..." : "Kirish"}
                </button>
              </form>

              <div className="mt-7 flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    YePost
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-700">
                    Savdo tizimi boshqaruv paneli
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm">
                  <ShieldCheck size={18} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
