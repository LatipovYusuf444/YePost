import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { isAccessTokenValid, useAuthStore } from "@/store/authStore";

type LoginLocationState = {
  from?: {
    pathname?: string;
  };
};

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

  if (isAccessTokenValid(accessToken)) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!username.trim() || !password) {
      setErrorMessage("Login va parolni kiriting.");
      return;
    }

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fff7ed] px-4 py-10">
      <div className="absolute -left-24 top-[-7rem] h-80 w-80 rounded-full bg-orange-300/30 blur-3xl" />
      <div className="absolute -bottom-28 right-[-5rem] h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" />

      <section className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/80 bg-white/75 shadow-[0_30px_100px_rgba(194,65,12,0.18)] backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden min-h-[600px] flex-col justify-between bg-gradient-to-br from-orange-400 via-orange-600 to-orange-800 p-12 text-white lg:flex">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl font-black text-orange-600 shadow-lg">
            Y
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-orange-100">
              YEPOST
            </p>
            <h1 className="mt-4 max-w-md text-5xl font-black leading-[1.08]">
              Savdoni sodda va aniq boshqaring.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-orange-50/85">
              Savdo, ombor, mijozlar va kassani yagona tizim orqali nazorat qiling.
            </p>
          </div>

          <p className="text-sm text-orange-100/70">YEPOST boshqaruv tizimi</p>
        </div>

        <div className="flex min-h-[600px] items-center px-6 py-12 sm:px-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-9 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black text-white shadow-lg shadow-orange-200">
                Y
              </div>
            </div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500">
              Xush kelibsiz
            </p>
            <h2 className="mt-3 text-4xl font-black text-gray-950">Tizimga kirish</h2>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              Ishni davom ettirish uchun login va parolingizni kiriting.
            </p>

            <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-gray-700">Login</span>
                <span className="flex h-14 items-center gap-3 rounded-2xl border border-orange-100 bg-white px-4 shadow-sm transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
                  <UserRound size={19} className="shrink-0 text-orange-500" />
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    placeholder="Loginni kiriting"
                    className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-gray-700">Parol</span>
                <span className="flex h-14 items-center gap-3 rounded-2xl border border-orange-100 bg-white px-4 shadow-sm transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
                  <LockKeyhole size={19} className="shrink-0 text-orange-500" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Parolni kiriting"
                    className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="text-gray-400 transition hover:text-orange-500"
                    aria-label={showPassword ? "Parolni yashirish" : "Parolni ko‘rsatish"}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </span>
              </label>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
                >
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:opacity-60"
              >
                {isSubmitting && <LoaderCircle size={19} className="animate-spin" />}
                {isSubmitting ? "Tekshirilmoqda..." : "Kirish"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
