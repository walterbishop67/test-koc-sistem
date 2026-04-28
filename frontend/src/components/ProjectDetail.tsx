import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProjectStore } from "../store/useProjectStore";
import { useBoardStore } from "../store/useBoardStore";
import type { Board, GeneratedColumn, Priority } from "../types";
import { api } from "../api/client";

const GRADIENT_PAIRS = [
  "from-violet-500 to-primary",
  "from-blue-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-400",
  "from-rose-500 to-pink-400",
  "from-indigo-500 to-blue-400",
];

function boardInitials(title: string) {
  return title
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, fetchProjects, fetchProjectBoards } = useProjectStore();
  const { createBoard } = useBoardStore();

  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(projects.find((p) => p.id === projectId));

  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  const [wizardStep, setWizardStep] = useState<"info" | "preview">("info");
  const [generatedColumns, setGeneratedColumns] = useState<GeneratedColumn[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpenId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      setLoading(true);
      try {
        let proj = projects.find((p) => p.id === projectId);
        if (!proj) {
          const fetched = await fetchProjects();
          proj = fetched.find((p) => p.id === projectId);
        }
        setProject(proj);
        const data = await fetchProjectBoards(projectId);
        setBoards(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const priorityBadgeClass: Record<Priority, string> = {
    urgent: "bg-red-100 text-red-700 border-red-200",
    high: "bg-amber-100 text-amber-700 border-amber-200",
    medium: "bg-blue-100 text-blue-700 border-blue-200",
    low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  const handleGenerateAI = async () => {
    const title = newBoardTitle.trim();
    const goal = newBoardDescription.trim();
    if (!title || !goal) return;
    setWizardStep("preview");
    setAiLoading(true);
    setAiError(null);
    try {
      const { data } = await api.post<{ columns: GeneratedColumn[] }>("/ai/generate-board", {
        project_name: title,
        project_goal: goal,
      });
      setGeneratedColumns(data.columns);
    } catch (err: any) {
      setAiError(err?.response?.data?.detail || "Failed to generate AI board structure.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateBoard = async (aiColumns?: GeneratedColumn[]) => {
    const title = newBoardTitle.trim();
    if (!title || !projectId) return;
    setCreating(true);
    try {
      const board = await createBoard(title, undefined, undefined, aiColumns, projectId);
      setBoards((prev) => [...prev, board]);
      setShowNewBoard(false);
      setNewBoardTitle("");
      setNewBoardDescription("");
      setWizardStep("info");
      setGeneratedColumns([]);
      setAiError(null);
    } finally {
      setCreating(false);
    }
  };

  const resetModal = () => {
    setShowNewBoard(false);
    setNewBoardTitle("");
    setNewBoardDescription("");
    setWizardStep("info");
    setGeneratedColumns([]);
    setAiError(null);
  };

  return (
    <>
      <main className="p-4 md:p-section-margin max-w-7xl mx-auto">
        {/* Breadcrumb + Header */}
        <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <nav className="flex items-center gap-2 text-slate-400 text-xs mb-2 font-headline-md uppercase tracking-widest">
              <button
                onClick={() => navigate("/projects")}
                className="hover:text-primary transition-colors"
              >
                Projects
              </button>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary font-bold">{project?.title ?? "..."}</span>
            </nav>
            <h1 className="font-display text-2xl md:text-display text-slate-900">
              {project?.title ?? ""}
            </h1>
            {project?.description && (
              <p className="text-slate-500 font-body-md mt-1 text-sm">{project.description}</p>
            )}
            <p className="text-slate-400 text-xs mt-1">
              {boards.length > 0 ? `${boards.length} board${boards.length !== 1 ? "s" : ""}` : "No boards yet"}
            </p>
          </div>

          <button
            onClick={() => setShowNewBoard(true)}
            className="px-5 py-3 bg-primary text-white rounded-xl font-headline-md text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all w-fit"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            New Board
          </button>
        </header>

        {/* Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass-row rounded-[24px] p-6 animate-pulse">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                  <div className="w-7 h-7 bg-slate-200 rounded-lg" />
                </div>
                <div className="h-5 bg-slate-200 rounded-full w-3/4 mb-2" />
                <div className="h-3 bg-slate-200 rounded-full w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && boards.length === 0 && (
          <section className="glass-row rounded-[24px] p-8 md:p-12 text-center border border-dashed border-slate-300/60">
            <span className="material-symbols-outlined text-5xl text-primary mb-3 block">view_kanban</span>
            <h2 className="font-display text-2xl text-slate-900 mb-2">No boards yet</h2>
            <p className="text-slate-500 mb-6 max-w-lg mx-auto">
              Create a board to start working on this project.
            </p>
            <button
              onClick={() => setShowNewBoard(true)}
              className="px-6 py-3 bg-primary text-white rounded-xl font-headline-md text-sm font-bold shadow-lg shadow-primary/20"
            >
              Create First Board
            </button>
          </section>
        )}

        {/* Board grid */}
        {!loading && boards.length > 0 && (
          <div ref={menuRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {boards.map((board, idx) => {
              const gradient = GRADIENT_PAIRS[idx % GRADIENT_PAIRS.length];
              const menuOpen = menuOpenId === board.id;
              return (
                <div
                  key={board.id}
                  className="glass-row rounded-[24px] p-6 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all group relative"
                >
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-base flex-shrink-0`}
                    >
                      {boardInitials(board.title)}
                    </div>

                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpen ? null : board.id); }}
                        className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                      >
                        <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                      </button>

                      {menuOpen && (
                        <div className="absolute right-0 top-9 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                          <button
                            onClick={() => { setMenuOpenId(null); navigate(`/board/${board.id}/list`); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px] text-slate-400">list_alt</span>
                            Open Backlog
                          </button>
                          <button
                            onClick={() => { setMenuOpenId(null); navigate(`/board/${board.id}`); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px] text-slate-400">view_kanban</span>
                            Open Kanban
                          </button>
                          <button
                            onClick={() => { setMenuOpenId(null); navigate(`/board/${board.id}/settings`); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px] text-slate-400">settings</span>
                            Ayarlar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <button className="w-full text-left" onClick={() => navigate(`/board/${board.id}`)}>
                    <div className="min-w-0">
                      <h2 className="font-headline-md text-base font-black text-slate-900 truncate mb-1">
                        {board.title}
                      </h2>
                      <p className="text-xs text-slate-400 font-medium">{formatDate(board.created_at)}</p>
                    </div>
                    <div className="mt-5 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 font-headline-md">
                        Kanban
                      </span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-primary font-headline-md flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">view_kanban</span>
                        Open
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}

            {/* New board card */}
            <button
              onClick={() => setShowNewBoard(true)}
              className="rounded-[24px] p-6 border-2 border-dashed border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 min-h-[180px] group"
            >
              <span className="material-symbols-outlined text-3xl text-slate-300 group-hover:text-primary transition-colors">
                add_circle
              </span>
              <span className="text-sm font-bold text-slate-400 group-hover:text-primary transition-colors font-headline-md">
                New Board
              </span>
            </button>
          </div>
        )}
      </main>

      {/* New Board Modal */}
      {showNewBoard && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center"
          onClick={resetModal}
        >
          <div
            className="glass-card rounded-t-[24px] sm:rounded-[24px] p-6 sm:p-8 w-full sm:max-w-md"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden" />
            <h2 className="font-headline-md text-headline-md text-on-surface mb-1">New Board</h2>
            <p className="text-xs text-slate-400 mb-6">
              Proje: <span className="font-semibold text-slate-600">{project?.title}</span>
            </p>

            <div className="space-y-4">
              {wizardStep === "info" && (
                <>
                  <div>
                    <label className="block font-label-caps text-label-caps text-slate-500 mb-2">
                      Board Adı
                    </label>
                    <input
                      autoFocus
                      type="text"
                      value={newBoardTitle}
                      onChange={(e) => setNewBoardTitle(e.target.value)}
                      placeholder="örn. Frontend, Backend, Infra"
                      className="w-full bg-white/50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block font-label-caps text-label-caps text-slate-500 mb-2">
                      Açıklama (AI için)
                    </label>
                    <textarea
                      value={newBoardDescription}
                      onChange={(e) => setNewBoardDescription(e.target.value)}
                      placeholder="Board'un amacını açıklayın — AI kolon yapısı oluşturabilir"
                      rows={3}
                      className="w-full bg-white/50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-on-surface resize-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleCreateBoard()}
                      disabled={creating || !newBoardTitle.trim()}
                      className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-headline-md font-bold hover:bg-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? "Creating..." : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateAI}
                      disabled={creating || aiLoading || !newBoardTitle.trim() || !newBoardDescription.trim()}
                      className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-headline-md font-bold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ✨ Generate with AI
                    </button>
                    <button
                      type="button"
                      onClick={resetModal}
                      className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {wizardStep === "preview" && (
                <>
                  {aiLoading && (
                    <div className="rounded-xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin inline-block" />
                        Generating AI board structure...
                      </div>
                    </div>
                  )}
                  {aiError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-3">
                      {aiError}
                    </div>
                  )}
                  {!aiLoading && !aiError && generatedColumns.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-auto pr-1">
                      {generatedColumns.map((col) => (
                        <div key={col.name} className="rounded-xl border border-slate-200 bg-white/80 p-3">
                          <h3 className="text-sm font-bold text-slate-800 mb-2">{col.name}</h3>
                          <div className="space-y-2">
                            {col.tasks.map((task, idx) => (
                              <div key={`${task.title}-${idx}`} className="rounded-lg border border-slate-100 p-2 bg-slate-50">
                                <div className="text-xs font-semibold text-slate-800">{task.title}</div>
                                {task.description && (
                                  <div className="text-[11px] text-slate-500 mt-0.5">{task.description}</div>
                                )}
                                <span className={`inline-flex mt-1 text-[10px] px-2 py-0.5 rounded-full border ${priorityBadgeClass[task.priority]}`}>
                                  {task.priority}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep("info")}
                      className="px-4 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all font-medium"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateAI}
                      disabled={aiLoading}
                      className="px-4 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all font-medium disabled:opacity-50"
                    >
                      Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateBoard(generatedColumns)}
                      disabled={creating || aiLoading || !!aiError || generatedColumns.length === 0}
                      className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-headline-md font-bold hover:bg-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? "Creating..." : "✅ Create Board"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
