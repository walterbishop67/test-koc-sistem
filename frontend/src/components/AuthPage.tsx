import { useState } from "react";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";
import kocLogo from "../assets/koc-logo.png";

const SSO_PROVIDERS = [
  {
    id: "azure",
    name: "Microsoft Azure AD",
    description: "Sign in with your corporate Microsoft account",
    icon: (
      <svg width="22" height="22" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="10" height="10" fill="#f35325" rx="1.5" />
        <rect x="11" y="0" width="10" height="10" fill="#81bc06" rx="1.5" />
        <rect x="0" y="11" width="10" height="10" fill="#05a6f0" rx="1.5" />
        <rect x="11" y="11" width="10" height="10" fill="#ffba08" rx="1.5" />
      </svg>
    ),
    badge: "Most Popular",
    badgeColor: "bg-blue-50 text-blue-600",
  },
  {
    id: "google",
    name: "Google Workspace",
    description: "Sign in with your corporate Google account",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    badge: null,
    badgeColor: "",
  },
  {
    id: "okta",
    name: "Okta",
    description: "Sign in through your Okta identity provider",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="11" fill="#007dc1" />
        <circle cx="12" cy="12" r="5" fill="white" />
      </svg>
    ),
    badge: null,
    badgeColor: "",
  },
  {
    id: "saml",
    name: "SAML 2.0 / Custom IdP",
    description: "Configure your custom SAML 2.0 identity provider",
    icon: (
      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-violet-100 text-[11px] font-bold text-violet-600">
        SSO
      </span>
    ),
    badge: "Enterprise",
    badgeColor: "bg-violet-50 text-violet-600",
  },
];

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailExists, setEmailExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);
  const [showSsoPanel, setShowSsoPanel] = useState(false);
  const [showWelcome, setShowWelcome] = useState(
    () => localStorage.getItem("koc_welcome_seen") !== "1"
  );
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const closeWelcome = () => {
    if (dontShowAgain) localStorage.setItem("koc_welcome_seen", "1");
    setShowWelcome(false);
  };

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailExists(false);
    if (mode === "signup" && !terms) {
      setError("You must accept the terms to continue.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { data } = await api.post<{ access_token: string }>("/auth/login", { email, password });
        localStorage.setItem("taskflow_token", data.access_token);
        navigate("/");
      } else {
        await api.post("/auth/signup", { full_name: fullName, email, password });
        setSignupDone(true);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
      if (axiosErr?.response?.status === 409) {
        setEmailExists(true);
      } else {
        setError(axiosErr?.response?.data?.detail ?? "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  const switchMode = () => {
    setMode(isLogin ? "signup" : "login");
    setError(null);
    setEmailExists(false);
    setFullName("");
    setEmail("");
    setPassword("");
    setTerms(false);
    setShowSsoPanel(false);
  };

  if (signupDone) {
    return (
      <div className="bg-mesh min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-10 font-body-md text-on-surface">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center justify-center">
          <div className="glass-card w-full max-w-[520px] rounded-[24px] p-8 text-center sm:p-10 surgical-accent">
            <span className="material-symbols-outlined mb-4 block text-5xl text-secondary">mark_email_read</span>
            <h2 className="mb-2 font-headline-md text-headline-md text-on-surface">Check your email</h2>
            <p className="mt-2 text-[13px] sm:text-sm text-on-surface-variant">
              We sent a verification link to your email.
            </p>
            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-left">
              <span className="material-symbols-outlined mt-0.5 text-[18px] text-amber-500 flex-shrink-0">warning</span>
              <p className="text-[12px] sm:text-[13px] text-amber-800">
                If you do not see it, check your <span className="font-semibold">spam / junk</span> folder.
              </p>
            </div>
            <button
              onClick={() => {
                setMode("login");
                setSignupDone(false);
              }}
              className="mt-8 text-sm font-semibold text-primary transition-all hover:underline underline-offset-4"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-mesh text-on-surface">
      {/* ── Welcome Modal ── */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeWelcome}
          />
          <div className="relative w-full max-w-2xl rounded-[28px] border border-white/40 bg-white/95 shadow-2xl backdrop-blur-xl overflow-hidden">
            {/* top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-red-500 via-red-400 to-orange-400" />

            <div className="p-6 sm:p-8">
              {/* header */}
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <img src={kocLogo} alt="KocSistem" className="h-6 w-auto object-contain" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Kanban</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
                    Welcome to Koc Sistem Kanban
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Ready to explore the platform?
                  </p>
                </div>
                <button
                  onClick={closeWelcome}
                  className="flex-shrink-0 rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* flow steps */}
              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  {
                    step: "01",
                    icon: "login",
                    color: "bg-blue-50 text-blue-600",
                    title: "Sign In / Sign Up",
                    desc: "Access the platform with email & password or corporate SSO.",
                  },
                  {
                    step: "02",
                    icon: "dashboard_customize",
                    color: "bg-violet-50 text-violet-600",
                    title: "Create Board",
                    desc: "Start kanban boards for your projects and customize columns.",
                  },
                  {
                    step: "03",
                    icon: "add_card",
                    color: "bg-emerald-50 text-emerald-600",
                    title: "Add Task Cards",
                    desc: "Add descriptions, labels, priority, files, and due dates to cards.",
                  },
                  {
                    step: "04",
                    icon: "group_add",
                    color: "bg-amber-50 text-amber-600",
                    title: "Invite Your Team",
                    desc: "Invite teammates to the board and assign tasks.",
                  },
                  {
                    step: "05",
                    icon: "analytics",
                    color: "bg-red-50 text-red-600",
                    title: "Track Progress",
                    desc: "Track sprint and project status in real time via analytics.",
                  },
                  {
                    step: "06",
                    icon: "smart_toy",
                    color: "bg-sky-50 text-sky-600",
                    title: "AI Coach",
                    desc: "Boost team productivity with AI-powered suggestions and insights.",
                  },
                ].map(({ step, icon, color, title, desc }) => (
                  <div key={step} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${color}`}>
                      <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-300">{step}</span>
                        <p className="text-[13px] font-semibold text-on-surface">{title}</p>
                      </div>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* footer */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-400 select-none">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary"
                  />
                  Do not show again
                </label>
                <button
                  onClick={closeWelcome}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-md shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
                >
                  Let’s get started
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>

              {/* signature */}
              <div className="mt-5 border-t border-slate-100 pt-4 text-center">
                <p className="text-[11px] text-slate-400">
                  Designed & developed by{" "}
                  <span className="font-semibold text-slate-600">Umut Altun</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute right-[-80px] top-[-40px] h-72 w-72 rounded-full bg-secondary-container/20 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[-80px] left-[-80px] h-96 w-96 rounded-full bg-primary-container/10 blur-[120px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
        <header className="mb-4 sm:mb-6 flex items-center justify-between rounded-2xl border border-white/30 bg-white/65 px-3 py-2.5 sm:px-6 sm:py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <img src={kocLogo} alt="KocSistem" className="h-7 sm:h-8 w-auto object-contain" />
            <div className="h-5 w-px bg-slate-300/70" />
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              Kanban
            </span>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <a href="#" className="text-slate-600 transition-colors duration-300 hover:text-red-500 font-label-caps text-label-caps">
              Support
            </a>
            <a href="#" className="text-slate-600 transition-colors duration-300 hover:text-red-500 font-label-caps text-label-caps">
              Enterprise
            </a>
          </div>
        </header>

        <main className="flex flex-1 items-stretch">
          <section className="grid w-full grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[1fr_minmax(460px,560px)] lg:gap-8">
            <aside className="glass-card hidden rounded-[24px] p-8 lg:flex lg:flex-col lg:justify-between surgical-accent">
              <div>
                <p className="mb-3 inline-flex rounded-full bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-slate-600">
                  {showSsoPanel ? "Enterprise SSO" : isLogin ? "Workspace Access" : "Create Workspace"}
                </p>
                <h1 className="font-display text-display tracking-tight text-on-surface">
                  {showSsoPanel
                    ? "Single Sign-On"
                    : isLogin
                    ? "Welcome Back"
                    : "Join Koc Sistem Kanban"}
                </h1>
                <p className="mt-4 max-w-md text-body-lg text-slate-600">
                  {showSsoPanel
                    ? "Sign in securely with your corporate identity provider. You can request SSO setup from your IT admin."
                    : isLogin
                    ? "Sign in to your workspace and continue where your team left off."
                    : "Create your account and launch a fast, collaborative planning workflow."}
                </p>
              </div>

              <div className="mt-8 space-y-4 rounded-2xl border border-white/30 bg-white/40 p-5">
                <p className="text-sm text-slate-600">Unified board management with team-first workflows.</p>
                <div className="flex items-center gap-4 text-sm text-slate-700">
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-base text-secondary">shield_lock</span>
                    Secure auth
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-base text-secondary">groups</span>
                    Team ready
                  </span>
                </div>
              </div>
            </aside>

            <div className="glass-card w-full rounded-[22px] p-4 sm:p-7 lg:p-10 surgical-accent">
              {showSsoPanel ? (
                /* ── SSO Provider Panel ── */
                <div>
                  <button
                    onClick={() => setShowSsoPanel(false)}
                    className="mb-5 flex items-center gap-1.5 text-[13px] text-slate-500 transition-colors hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Go back
                  </button>

                  <div className="mb-6">
                    <h2 className="font-headline-md text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
                      Enterprise SSO
                    </h2>
                    <p className="mt-1.5 text-[13px] text-slate-500 sm:text-sm">
                      Select the identity provider used in your organization.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {SSO_PROVIDERS.map((provider) => (
                      <button
                        key={provider.id}
                        className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white/60 px-4 py-3.5 text-left transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-sm active:scale-[0.99]"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 group-hover:bg-white transition-colors">
                          {provider.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-on-surface">{provider.name}</span>
                            {provider.badge && (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${provider.badgeColor}`}>
                                {provider.badge}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[12px] text-slate-500 truncate">{provider.description}</p>
                        </div>
                        <span className="material-symbols-outlined flex-shrink-0 text-[18px] text-slate-300 group-hover:text-slate-500 transition-colors">
                          chevron_right
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined mt-0.5 text-[18px] text-slate-400">info</span>
                      <p className="text-[12px] text-slate-500">
                        SSO connection must be configured by your organization's IT department.
                        If you have issues{" "}
                        <a href="#" className="text-secondary hover:underline underline-offset-4">
                          destek ekibimizle
                        </a>{" "}
                        contact support.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Normal Login / Signup Form ── */
                <>
                  <div className="mb-4 sm:mb-6 text-center lg:hidden">
                    <h1 className="font-display text-[1.75rem] leading-tight tracking-tight text-on-surface sm:text-4xl">
                      {isLogin ? "Welcome Back" : "Join Koc Sistem Kanban"}
                    </h1>
                    <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-slate-500 sm:mt-2 sm:text-base">
                      {isLogin ? "Sign in to your workspace" : "Create your future workspace today"}
                    </p>
                  </div>

                  <form onSubmit={handle} className="space-y-4 sm:space-y-5">
                    {!isLogin && (
                      <div className="group relative">
                        <label htmlFor="fullname" className="mb-2 block text-label-caps font-label-caps text-slate-500 group-focus-within:text-secondary">
                          Full Name
                        </label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-secondary">
                            person
                          </span>
                          <input
                            id="fullname"
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full rounded-xl border border-slate-200 bg-white/60 py-3 sm:py-3.5 pl-11 sm:pl-12 pr-4 text-on-surface outline-none transition-all duration-300 focus:border-secondary-container focus:ring-2 focus:ring-secondary-container/20"
                          />
                        </div>
                      </div>
                    )}

                    <div className="group relative">
                      <label htmlFor="email" className="mb-2 block text-label-caps font-label-caps text-slate-500 group-focus-within:text-secondary">
                        Work Email
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-secondary">
                          alternate_email
                        </span>
                        <input
                          id="email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@company.com"
                          className="w-full rounded-xl border border-slate-200 bg-white/60 py-3 sm:py-3.5 pl-11 sm:pl-12 pr-4 text-on-surface outline-none transition-all duration-300 focus:border-secondary-container focus:ring-2 focus:ring-secondary-container/20"
                        />
                      </div>
                    </div>

                    <div className="group relative">
                      <div className="mb-2 flex items-center justify-between">
                        <label htmlFor="password" className="block text-label-caps font-label-caps text-slate-500 group-focus-within:text-secondary">
                          Password
                        </label>
                        {isLogin && (
                          <a href="#" className="text-[10px] text-primary transition-all hover:underline underline-offset-4 font-label-caps">
                            Forgot Password?
                          </a>
                        )}
                      </div>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-secondary">
                          lock
                        </span>
                        <input
                          id="password"
                          type={isLogin && showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          minLength={6}
                          className="w-full rounded-xl border border-slate-200 bg-white/60 py-3 sm:py-3.5 pl-11 sm:pl-12 pr-11 sm:pr-12 text-on-surface outline-none transition-all duration-300 focus:border-secondary-container focus:ring-2 focus:ring-secondary-container/20"
                        />
                        {isLogin && (
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-on-surface"
                          >
                            <span className="material-symbols-outlined">
                              {showPassword ? "visibility_off" : "visibility"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    {isLogin ? (
                      <div className="flex items-center space-x-3 px-1">
                        <input
                          id="remember"
                          type="checkbox"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                          className="h-5 w-5 cursor-pointer rounded border-outline-variant/50 text-primary focus:ring-primary/20"
                        />
                        <label htmlFor="remember" className="cursor-pointer text-[13px] sm:text-sm text-on-surface-variant">
                          Keep me logged in for 30 days
                        </label>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 py-1">
                        <div className="flex h-5 items-center">
                          <input
                            id="terms"
                            type="checkbox"
                            checked={terms}
                            onChange={(e) => setTerms(e.target.checked)}
                            className="h-5 w-5 cursor-pointer rounded border-slate-300 text-primary transition-all focus:ring-primary/20"
                          />
                        </div>
                        <label htmlFor="terms" className="text-[13px] sm:text-sm text-slate-500">
                          I agree to the <a href="#" className="text-secondary hover:underline">Terms of Service</a> and <a href="#" className="text-secondary hover:underline">Privacy Policy</a>.
                        </label>
                      </div>
                    )}

                    {emailExists && (
                      <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3 text-[13px] sm:text-sm text-amber-800">
                        <span className="material-symbols-outlined text-base text-amber-500 flex-shrink-0 mt-0.5">info</span>
                        <span>
                          Bu e-posta adresiyle zaten bir hesap mevcut.{" "}
                          <button
                            type="button"
                            onClick={() => { switchMode(); }}
                            className="font-semibold underline underline-offset-4 hover:text-amber-900"
                          >
                            Sign in
                          </button>
                        </span>
                      </div>
                    )}

                    {error && (
                      <div className="flex items-center gap-2 rounded-xl bg-error-container px-3.5 py-2.5 text-[13px] sm:text-sm text-on-error-container">
                        <span className="material-symbols-outlined text-base">error</span>
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 sm:py-3.5 font-headline-md text-headline-md text-on-primary shadow-lg shadow-primary/20 transition-all duration-300 hover:bg-primary-container active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:scale-100"
                    >
                      {loading ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-xl">refresh</span>
                          Loading...
                        </>
                      ) : (
                        <>
                          {isLogin ? "Sign In" : "Sign Up"}
                          <span className="material-symbols-outlined">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-6 flex flex-col gap-3.5 border-t border-slate-200/50 pt-6">
                    <button
                      onClick={() => setShowSsoPanel(true)}
                      className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-2.5 sm:py-3 text-on-surface transition-colors duration-300 hover:bg-slate-50"
                    >
                      <span className="material-symbols-outlined text-[20px] text-secondary">corporate_fare</span>
                      Continue with SSO
                    </button>
                    <p className="text-center text-[13px] sm:text-sm text-slate-500">
                      {isLogin ? "New to the workspace?" : "Already have an account?"}{" "}
                      <button onClick={switchMode} className="font-medium text-red-600 transition-all hover:underline underline-offset-4">
                        {isLogin ? "Create an account" : "Sign In"}
                      </button>
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>
        </main>

        <footer className="mt-4 sm:mt-6 flex flex-col items-center justify-between gap-2.5 sm:gap-3 border-t border-slate-200/40 px-1 sm:px-2 pt-3 sm:pt-4 text-[11px] sm:text-xs text-slate-500 sm:flex-row sm:text-sm">
          <div>© 2026 Koç Sistem. All rights reserved.</div>
          <div className="flex items-center gap-5">
            <a href="#" className="transition-all hover:text-red-600 hover:underline underline-offset-4">Privacy Policy</a>
            <a href="#" className="transition-all hover:text-red-600 hover:underline underline-offset-4">Terms of Service</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
