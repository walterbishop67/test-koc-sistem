import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useBoardStore } from "../store/useBoardStore";
import { emailInitial, getTokenEmail } from "../utils/auth";
import NotificationBell from "./NotificationBell";
import kocLogo from "../assets/koc-logo.png";

function boardInitials(title: string) {
  return title
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const NAV_ITEMS = [
  { icon: "space_dashboard", label: "Dashboard", key: "dashboard" },
  { icon: "folder_open",    label: "Projects",   key: "projects" },
  { icon: "groups",         label: "Team",        key: "team" },
  { icon: "monitoring",     label: "Analytics",   key: "analytics" },
  { icon: "inventory_2",   label: "Archive",     key: "archive" },
] as const;

const BOARD_GRADIENTS = [
  "from-violet-500 to-primary",
  "from-blue-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-400",
  "from-rose-500 to-pink-400",
  "from-indigo-500 to-blue-400",
];

const MOBILE_NAV = [
  { icon: "space_dashboard", label: "Board",    key: "dashboard" },
  { icon: "folder_open",     label: "Projects", key: "projects"  },
  { icon: "groups",          label: "Team",     key: "team"      },
  { icon: "monitoring",      label: "Stats",    key: "analytics" },
  { icon: "person",          label: "Profil",   path: "/profile" },
] as const;

function MobileNavBtn({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${active ? "text-primary" : "text-slate-400"}`}
    >
      <span
        className="material-symbols-outlined text-[22px]"
        style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
      >
        {icon}
      </span>
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}

export default function AppLayout() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { boards, fetchBoards } = useBoardStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const profileRef = useRef<HTMLDivElement>(null);
  const userEmail  = getTokenEmail();

  // Close sidebar whenever route changes
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setShowProfile(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setBoardsLoading(true);
    fetchBoards().finally(() => setBoardsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = () => {
    localStorage.removeItem("taskflow_token");
    navigate("/login");
  };

  // Detect current board from URL
  const boardMatch    = location.pathname.match(/^\/board\/([^/]+)/);
  const currentBoardId = boardMatch?.[1];
  // Build hrefs for nav items
  const navHref = (key: string) => {
    if (key === "dashboard")
      return currentBoardId
        ? `/board/${currentBoardId}`
        : boards[0] ? `/board/${boards[0].id}` : "/";
    return `/${key}`;
  };

  const isNavActive = (key: string) => {
    if (key === "dashboard")
      return location.pathname === "/" || location.pathname.startsWith("/board/");
    if (key === "projects")
      return location.pathname === "/projects" || location.pathname.startsWith("/projects/");
    return location.pathname.startsWith(`/${key}`);
  };

  const isDeepPage =
    (location.pathname.startsWith("/board/") && location.pathname.endsWith("/settings")) ||
    (location.pathname.startsWith("/projects/") && location.pathname.split("/").filter(Boolean).length > 1);

  return (
    <div className="tech-bg min-h-screen font-body-md text-on-surface">

      {/* ── TopNav ───────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-[0_4px_20px_0_rgba(15,23,42,0.04)] flex justify-between items-center h-16 px-4 md:px-8">
        <div className="flex items-center gap-3 md:gap-8">
          {/* Back button (deep pages) or hamburger — mobile only */}
          {isDeepPage ? (
            <button
              onClick={() => navigate(-1)}
              className="md:hidden p-2 -ml-2 text-slate-600 hover:text-primary transition-colors rounded-lg"
              aria-label="Geri"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          ) : (
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="md:hidden p-2 -ml-2 text-slate-600 hover:text-primary transition-colors rounded-lg"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">
                {sidebarOpen ? "close" : "menu"}
              </span>
            </button>
          )}
          <button
            onClick={() => navigate("/projects")}
            className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Go to Projects"
            title="Projects"
          >
            <img
              src={kocLogo}
              alt="KocSistem"
              className="h-7 md:h-8 w-auto object-contain"
            />
          </button>

        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <NotificationBell />

          {/* Profile avatar + dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile((v) => !v)}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0 hover:ring-2 hover:ring-primary/40 transition-all"
              title={userEmail ?? "Profil"}
            >
              {emailInitial(userEmail)}
            </button>

            {showProfile && (
              <div className="absolute right-0 top-11 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                    Signed in
                  </p>
                  <p className="text-sm font-semibold text-on-surface truncate mt-0.5">
                    {userEmail ?? "—"}
                  </p>
                </div>
                <button
                  onClick={() => { navigate("/profile"); setShowProfile(false); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                  Profil
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors border-t border-slate-100"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile sidebar overlay ────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-64px)] bg-slate-50/95 backdrop-blur-xl border-r border-slate-200/50 flex flex-col p-4 gap-2 z-40 transition-all duration-300 ${
          desktopSidebarCollapsed ? "md:w-20" : "md:w-64"
        } ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <button
          onClick={() => setDesktopSidebarCollapsed((v) => !v)}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-primary hover:border-primary/30 shadow-sm transition-all"
          aria-label={desktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={desktopSidebarCollapsed ? "Expand menu" : "Collapse menu"}
        >
          <span className="material-symbols-outlined text-[18px]">
            {desktopSidebarCollapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>
        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map(({ icon, label, key }) => {
            const active = isNavActive(key);
            return (
              <button
                key={key}
                onClick={() => navigate(navHref(key))}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group text-sm font-medium ${
                  active
                    ? "bg-white text-primary shadow-sm"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    !active ? "group-hover:translate-x-1 duration-200" : ""
                  }`}
                >
                  {icon}
                </span>
                {!desktopSidebarCollapsed && label}
              </button>
            );
          })}

          {/* Board switcher */}
          {boardsLoading && !desktopSidebarCollapsed && (
            <div className="pt-4 mt-2 border-t border-slate-200/50">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 px-3 mb-2">
                Boards
              </p>
              <div className="space-y-2 px-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-10 rounded-lg bg-slate-200/70 animate-pulse"
                  />
                ))}
              </div>
            </div>
          )}
          {!boardsLoading && boards.length > 0 && (
            <div className="pt-4 mt-2 border-t border-slate-200/50">
              {!desktopSidebarCollapsed && (
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 px-3 mb-2">
                  Boards
                </p>
              )}
              {boards.map((board, idx) => {
                const gradient = BOARD_GRADIENTS[idx % BOARD_GRADIENTS.length];
                return (
                <button
                  key={board.id}
                  onClick={() => navigate(`/board/${board.id}`)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium text-left ${
                    location.pathname === `/board/${board.id}`
                      ? "bg-white text-primary shadow-sm"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${gradient} text-white flex items-center justify-center text-[10px] font-black flex-shrink-0`}>
                    {boardInitials(board.title)}
                  </div>
                  <div className={`min-w-0 ${desktopSidebarCollapsed ? "hidden" : ""}`}>
                    <div className="truncate">{board.title}</div>
                    {board.team_names && board.team_names.length > 0 && (
                      <div className="text-[10px] text-slate-400 truncate font-normal">
                        {board.team_names.join(" · ")}
                      </div>
                    )}
                  </div>
                </button>
                );
              })}
            </div>
          )}
        </nav>

        <button
          onClick={() => navigate("/projects?new=1")}
          className={`w-full py-3 bg-primary text-white rounded-xl font-headline-md text-sm font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-transform ${
            desktopSidebarCollapsed ? "px-0" : ""
          }`}
        >
          <span className="material-symbols-outlined text-sm">folder_open</span>
          {!desktopSidebarCollapsed && "New Project"}
        </button>
      </aside>

      {/* ── Page content (layout provides the offset) ─────────────────── */}
      <div className={`${desktopSidebarCollapsed ? "md:ml-20" : "md:ml-64"} mt-16 transition-all duration-300 ${
          location.pathname.startsWith("/board/") ? "" : "pb-20 md:pb-0"
        }`}>
        <Outlet />
      </div>

      {/* ── Mobile bottom nav (global, hidden on board pages) ───────── */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-50 ${
          location.pathname.startsWith("/board/") ? "hidden" : ""
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex h-16 items-center px-1">
          {MOBILE_NAV.map((item) => {
            const active = "path" in item
              ? location.pathname === item.path
              : isNavActive(item.key);
            const dest = "path" in item
              ? item.path
              : navHref(item.key);
            return (
              <MobileNavBtn
                key={item.label}
                icon={item.icon}
                label={item.label}
                active={active}
                onClick={() => navigate(dest)}
              />
            );
          })}
        </div>
      </nav>

    </div>
  );
}
