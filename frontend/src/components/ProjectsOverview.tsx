import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProjectStore } from "../store/useProjectStore";
import { useBoardStore } from "../store/useBoardStore";
import { useTeamStore } from "../store/useTeamStore";
import { api } from "../api/client";
import type { Board, GeneratedColumn, Priority } from "../types";

function initials(title: string) {
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

const GRADIENT_PAIRS = [
  "from-violet-500 to-primary",
  "from-blue-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-400",
  "from-rose-500 to-pink-400",
  "from-indigo-500 to-blue-400",
];

export default function ProjectsOverview() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { projects, fetchProjects, createProject, deleteProject } = useProjectStore();
  const { boards, fetchBoards, archiveBoard, createBoard, inviteMember } = useBoardStore();
  const { teams, teamMembers, fetchTeams, fetchTeamMembers } = useTeamStore();

  const [loading, setLoading] = useState(true);

  // New project modal
  const [showNewProject, setShowNewProject] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // New standalone board modal
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [boardTitle, setBoardTitle] = useState("");
  const [boardDescription, setBoardDescription] = useState("");
  const [boardTeamId, setBoardTeamId] = useState("");
  const [boardWizardStep, setBoardWizardStep] = useState<"info" | "preview">("info");
  const [generatedColumns, setGeneratedColumns] = useState<GeneratedColumn[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [boardCreating, setBoardCreating] = useState(false);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowNewProject(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpenId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    Promise.all([fetchProjects(), fetchBoards(), fetchTeams()]).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const standaloneBoards: Board[] = boards.filter(
    (b) => !b.project_id && !b.is_archived
  );

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      const project = await createProject(title, newDescription.trim());
      setShowNewProject(false);
      setNewTitle("");
      setNewDescription("");
      navigate(`/projects/${project.id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async (id: string) => {
    setMenuOpenId(null);
    setArchivingId(id);
    try {
      await archiveBoard(id);
    } finally {
      setArchivingId(null);
    }
  };

  const handleDeleteProject = async (id: string) => {
    setMenuOpenId(null);
    await deleteProject(id);
  };

  const resetProjectModal = () => {
    setShowNewProject(false);
    setNewTitle("");
    setNewDescription("");
  };

  const resetBoardModal = () => {
    setShowNewBoard(false);
    setBoardTitle("");
    setBoardDescription("");
    setBoardTeamId("");
    setBoardWizardStep("info");
    setGeneratedColumns([]);
    setAiError(null);
  };

  const handleGenerateAI = async () => {
    const title = boardTitle.trim();
    const goal = boardDescription.trim();
    if (!title || !goal) return;
    setBoardWizardStep("preview");
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

  const handleCreateStandaloneBoard = async (aiColumns?: GeneratedColumn[]) => {
    const title = boardTitle.trim();
    if (!title) return;
    setBoardCreating(true);
    try {
      const board: Board = await createBoard(title, undefined, boardTeamId || undefined, aiColumns);
      if (boardTeamId) {
        const members = teamMembers[boardTeamId] ?? await fetchTeamMembers(boardTeamId);
        await Promise.all(members.map((m) => inviteMember(board.id, m.email, "member")));
      }
      resetBoardModal();
      navigate(`/board/${board.id}/list`);
    } finally {
      setBoardCreating(false);
    }
  };

  const priorityBadgeClass: Record<Priority, string> = {
    urgent: "bg-red-100 text-red-700 border-red-200",
    high: "bg-amber-100 text-amber-700 border-amber-200",
    medium: "bg-blue-100 text-blue-700 border-blue-200",
    low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  return (
    <>
      <main className="p-4 md:p-section-margin max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <nav className="flex items-center gap-2 text-slate-400 text-xs mb-2 font-headline-md uppercase tracking-widest">
              <span className="text-primary font-bold">Projects</span>
            </nav>
            <h1 className="font-display text-2xl md:text-display text-slate-900">All Projects</h1>
            <p className="text-slate-500 font-body-md mt-1 text-sm">
              {!loading && `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          <button
            onClick={() => setShowNewProject(true)}
            className="px-5 py-3 bg-primary text-white rounded-xl font-headline-md text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all w-fit"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            New Project
          </button>
        </header>

        {/* Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[0, 1, 2, 3].map((i) => (
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
        {!loading && projects.length === 0 && standaloneBoards.length === 0 && (
          <section className="glass-row rounded-[24px] p-8 md:p-12 text-center border border-dashed border-slate-300/60">
            <span className="material-symbols-outlined text-5xl text-primary mb-3 block">folder_open</span>
            <h2 className="font-display text-2xl text-slate-900 mb-2">No projects yet</h2>
            <p className="text-slate-500 mb-6 max-w-lg mx-auto">
              Create your first project and add boards to it.
            </p>
            <button
              onClick={() => setShowNewProject(true)}
              className="px-6 py-3 bg-primary text-white rounded-xl font-headline-md text-sm font-bold shadow-lg shadow-primary/20"
            >
              Create First Project
            </button>
          </section>
        )}

        {/* Projects grid */}
        {!loading && projects.length > 0 && (
          <>
            <div ref={menuRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-10">
              {projects.map((project, idx) => {
                const gradient = GRADIENT_PAIRS[idx % GRADIENT_PAIRS.length];
                const menuOpen = menuOpenId === project.id;
                return (
                  <div
                    key={project.id}
                    className="glass-row rounded-[24px] p-6 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all group relative"
                  >
                    <div className="flex items-start justify-between mb-5">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-base flex-shrink-0`}
                      >
                        {initials(project.title)}
                      </div>

                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpen ? null : project.id); }}
                          className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                        >
                          <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                        </button>
                        {menuOpen && (
                          <div className="absolute right-0 top-9 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                            <button
                              onClick={() => { setMenuOpenId(null); navigate(`/projects/${project.id}`); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px] text-slate-400">folder_open</span>
                              Projeyi Aç
                            </button>
                            <div className="border-t border-slate-100 mx-2 my-1" />
                            <button
                              onClick={() => handleDeleteProject(project.id)}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                              Delete Project
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      className="w-full text-left"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <div className="min-w-0">
                        <h2 className="font-headline-md text-base font-black text-slate-900 truncate mb-1">
                          {project.title}
                        </h2>
                        {project.description && (
                          <p className="text-xs text-slate-500 truncate mb-1">{project.description}</p>
                        )}
                        <p className="text-xs text-slate-400 font-medium">{formatDate(project.created_at)}</p>
                      </div>
                      <div className="mt-5 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 font-headline-md">
                          Project
                        </span>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-primary font-headline-md flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                          Open
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}

              {/* New project card */}
              <button
                onClick={() => setShowNewProject(true)}
                className="rounded-[24px] p-6 border-2 border-dashed border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 min-h-[180px] group"
              >
                <span className="material-symbols-outlined text-3xl text-slate-300 group-hover:text-primary transition-colors">
                  add_circle
                </span>
                <span className="text-sm font-bold text-slate-400 group-hover:text-primary transition-colors font-headline-md">
                  New Project
                </span>
              </button>
            </div>
          </>
        )}

        {/* Standalone Boards — always visible */}
        {!loading && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="font-headline-md text-sm font-bold text-slate-500 uppercase tracking-widest">
                Standalone Boards
              </h2>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div ref={menuRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {standaloneBoards.map((board, idx) => {
                const gradient = GRADIENT_PAIRS[idx % GRADIENT_PAIRS.length];
                const isArchiving = archivingId === board.id;
                const menuOpen = menuOpenId === board.id;
                return (
                  <div
                    key={board.id}
                    className={`glass-row rounded-[24px] p-6 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all group relative ${isArchiving ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <div className="flex items-start justify-between mb-5">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-base flex-shrink-0`}
                      >
                        {initials(board.title)}
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
                            <div className="border-t border-slate-100 mx-2 my-1" />
                            <button
                              onClick={() => handleArchive(board.id)}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                              Move to Archive
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
                          Board
                        </span>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-primary font-headline-md flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">table_rows</span>
                          View
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}

              {/* New standalone board card */}
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
          </section>
        )}
      </main>

      {/* New Board Modal (standalone) */}
      {showNewBoard && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center"
          onClick={resetBoardModal}
        >
          <div
            className="glass-card rounded-t-[24px] sm:rounded-[24px] p-6 sm:p-8 w-full sm:max-w-md"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden" />
            <h2 className="font-headline-md text-headline-md text-on-surface mb-6">New Board</h2>

            {boardWizardStep === "info" && (
              <div className="space-y-4">
                <div>
                  <label className="block font-label-caps text-label-caps text-slate-500 mb-2">Board Adı</label>
                  <input
                    autoFocus
                    type="text"
                    value={boardTitle}
                    onChange={(e) => setBoardTitle(e.target.value)}
                    placeholder="örn. Product Sprint 2026"
                    className="w-full bg-white/50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-on-surface"
                  />
                </div>
                <div>
                  <label className="block font-label-caps text-label-caps text-slate-500 mb-2">Açıklama (AI için)</label>
                  <textarea
                    value={boardDescription}
                    onChange={(e) => setBoardDescription(e.target.value)}
                    placeholder="AI'ın kolon yapısı oluşturması için proje hedefini açıklayın"
                    rows={3}
                    className="w-full bg-white/50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-on-surface resize-none"
                  />
                </div>
                {teams.length > 0 && (
                  <div>
                    <label className="block font-label-caps text-label-caps text-slate-500 mb-2">Takım (opsiyonel)</label>
                    <select
                      value={boardTeamId}
                      onChange={(e) => setBoardTeamId(e.target.value)}
                      className="w-full bg-white/50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-secondary/20 transition-all text-sm"
                    >
                      <option value="">— Takım yok —</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCreateStandaloneBoard()}
                    disabled={boardCreating || !boardTitle.trim()}
                    className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-headline-md font-bold hover:bg-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {boardCreating ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={boardCreating || aiLoading || !boardTitle.trim() || !boardDescription.trim()}
                    className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-headline-md font-bold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✨ Generate with AI
                  </button>
                  <button
                    type="button"
                    onClick={resetBoardModal}
                    className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {boardWizardStep === "preview" && (
              <div className="space-y-4">
                {aiLoading && (
                  <div className="rounded-xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin inline-block" />
                      Generating AI board structure...
                    </div>
                  </div>
                )}
                {aiError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-3">{aiError}</div>
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
                    onClick={() => setBoardWizardStep("info")}
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
                    onClick={() => handleCreateStandaloneBoard(generatedColumns)}
                    disabled={boardCreating || aiLoading || !!aiError || generatedColumns.length === 0}
                    className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-headline-md font-bold hover:bg-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {boardCreating ? "Creating..." : "✅ Create Board"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProject && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center"
          onClick={resetProjectModal}
        >
          <div
            className="glass-card rounded-t-[24px] sm:rounded-[24px] p-6 sm:p-8 w-full sm:max-w-md"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden" />
            <h2 className="font-headline-md text-headline-md text-on-surface mb-6">Create New Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block font-label-caps text-label-caps text-slate-500 mb-2">
                  Project Name
                </label>
                <input
                  autoFocus
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Kanban App"
                  className="w-full bg-white/50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-on-surface"
                />
              </div>
              <div>
                <label className="block font-label-caps text-label-caps text-slate-500 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="A short description of the project"
                  rows={3}
                  className="w-full bg-white/50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-on-surface resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-headline-md font-bold hover:bg-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? "Creating..." : "Create Project"}
                </button>
                <button
                  type="button"
                  onClick={resetProjectModal}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
