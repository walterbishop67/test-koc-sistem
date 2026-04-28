import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBoardStore } from "../store/useBoardStore";
import { useSprintStore } from "../store/useSprintStore";
import { useTeamStore } from "../store/useTeamStore";
import EmailAutocomplete from "./EmailAutocomplete";
import CardModal from "./CardModal";
import type { Card, Priority } from "../types";

const ITEMS_PER_PAGE = 10;

const priorityConfig: Record<Priority, { label: string; icon: string; className: string }> = {
  urgent: { label: "URGENT", icon: "priority_high", className: "bg-primary/10 text-primary" },
  high:   { label: "HIGH",   icon: "priority_high", className: "bg-primary/10 text-primary" },
  medium: { label: "MEDIUM", icon: "arrow_upward",  className: "bg-blue-100 text-blue-600"  },
  low:    { label: "LOW",    icon: "arrow_downward", className: "bg-slate-100 text-slate-400" },
};

function SprintBadge({ card, sprints, onAssign }: {
  card: Card;
  sprints: { id: string; name: string; state: string }[];
  onAssign: (cardId: string, sprintId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const availableSprints = sprints.filter((s) => s.state !== "completed");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const assigned = sprints.find((s) => s.id === card.sprint_id);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
          assigned
            ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
        }`}
      >
        <span className="material-symbols-outlined text-[13px]">sprint</span>
        <span className="hidden sm:inline">{assigned ? assigned.name : "Sprint'e Ekle"}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden">
          {assigned && (
            <button
              onClick={(e) => { e.stopPropagation(); onAssign(card.id, null); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors border-b border-slate-100"
            >
              <span className="material-symbols-outlined text-[14px]">sprint</span>
              Remove from Sprint
            </button>
          )}
          {availableSprints.length === 0 && (
            <p className="px-3 py-3 text-xs text-slate-400 text-center">No sprint</p>
          )}
          {availableSprints.map((s) => (
            <button
              key={s.id}
              onClick={(e) => { e.stopPropagation(); onAssign(card.id, s.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${
                card.sprint_id === s.id ? "bg-green-50 text-green-700" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{s.state === "active" ? "bolt" : "schedule"}</span>
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BoardList() {
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();
  const { boards, columns, members, fetchBoards, fetchColumns, createCard, createBoard, fetchMembers, inviteMember, removeMember, assignCardToSprint } = useBoardStore();
  const { sprints, fetchSprints } = useSprintStore();

  const [filterText, setFilterText] = useState("");
  const [page, setPage] = useState(1);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [addSprint, setAddSprint] = useState(false);
  const [sprintName, setSprintName] = useState("Sprint 1");
  const [sprintStart, setSprintStart] = useState("");
  const [sprintEnd, setSprintEnd] = useState("");
  const [sprintGoal, setSprintGoal] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);
  const [newBoardTeamId, setNewBoardTeamId] = useState("");
  const [modalCard, setModalCard] = useState<Card | null>(null);
  const [viewMode, setViewMode] = useState<"backlog" | "sprint">("backlog");

  const { teams, teamMembers, fetchTeams, fetchTeamMembers } = useTeamStore();

  useEffect(() => {
    fetchBoards();
    fetchTeams();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeBoard = boards.find((b) => b.id === boardId) ?? null;

  useEffect(() => {
    if (boards.length > 0 && boardId && !activeBoard) {
      navigate("/projects", { replace: true });
    }
  }, [boards, boardId, activeBoard, navigate]);

  useEffect(() => {
    if (boardId) {
      fetchColumns(boardId);
      fetchSprints(boardId);
    }
  }, [boardId]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCols = columns.filter((col) => col.board_id === boardId);
  const allCards = activeCols.flatMap((col) =>
    col.cards.map((card) => ({ ...card, columnTitle: col.title }))
  );

  const activeSprint = sprints.find((s) => s.state === "active");
  const backlogCards = allCards.filter((c) => !c.sprint_id);
  const sprintCards = activeSprint ? allCards.filter((c) => c.sprint_id === activeSprint.id) : [];
  const displayCards = viewMode === "sprint" && activeSprint ? sprintCards : backlogCards;

  const filtered = displayCards.filter((c) =>
    c.title.toLowerCase().includes(filterText.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const inProgress = allCards.filter((c) => /progress|doing|in.?prog/i.test(c.columnTitle)).length;
  const completed  = allCards.filter((c) => /done|ready|review/i.test(c.columnTitle)).length;

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const firstCol = activeCols[0];
    if (!newTaskTitle.trim() || !firstCol) return;
    setCreating(true);
    try {
      await createCard(firstCol.id, newTaskTitle.trim());
      setNewTaskTitle("");
      setShowNewTask(false);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newBoardTitle.trim();
    if (!title) return;
    setCreatingBoard(true);
    try {
      const sprintPayload = addSprint && sprintName.trim()
        ? {
            name: sprintName.trim(),
            ...(sprintStart && { start_date: sprintStart }),
            ...(sprintEnd && { end_date: sprintEnd }),
            ...(sprintGoal.trim() && { goal: sprintGoal.trim() }),
          }
        : undefined;

      const board = await createBoard(title, sprintPayload);
      if (newBoardTeamId) {
        const mems = teamMembers[newBoardTeamId] ?? await fetchTeamMembers(newBoardTeamId);
        await Promise.all(mems.map((m) => inviteMember(board.id, m.email, "member")));
      }
      setShowNewBoard(false);
      setNewBoardTitle("");
      setNewBoardTeamId("");
      setAddSprint(false);
      setSprintName("Sprint 1");
      setSprintStart("");
      setSprintEnd("");
      setSprintGoal("");
      navigate(`/projects/${board.id}`);
    } finally {
      setCreatingBoard(false);
    }
  };

  return (
    <>
      <main className="p-4 md:p-section-margin max-w-7xl mx-auto">
        {/* Mobile search */}
        <div className="sm:hidden mb-4 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            className="pl-10 pr-4 py-2.5 bg-white/70 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 w-full outline-none"
            placeholder="Search issues..."
            type="text"
            value={filterText}
            onChange={(e) => { setFilterText(e.target.value); setPage(1); }}
          />
        </div>

        <header className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div>
            <nav className="flex items-center gap-2 text-slate-400 text-xs mb-2 font-headline-md uppercase tracking-widest">
              <button onClick={() => navigate("/projects")} className="hover:text-primary transition-colors">Projects</button>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-primary font-bold">{activeBoard?.title ?? "..."} Backlog</span>
            </nav>
            <h1 className="font-display text-2xl md:text-display text-slate-900">Product Backlog</h1>
            <p className="text-slate-500 font-body-md mt-1 md:mt-2 text-sm md:text-base">
              Manage tasks, prioritize them, and assign them to sprints.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {activeBoard && (
              <button onClick={() => navigate(`/board/${activeBoard.id}`)}
                className="px-4 md:px-5 py-2.5 md:py-3 bg-white border border-slate-200 rounded-xl font-headline-md text-sm font-bold text-slate-900 hover:bg-slate-50 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">view_kanban</span>
                <span className="hidden sm:inline">Kanban Board</span>
              </button>
            )}
            {activeBoard && (
              <button onClick={() => { setShowMembers(true); fetchMembers(activeBoard.id); }}
                className="px-4 md:px-5 py-2.5 md:py-3 bg-white border border-slate-200 rounded-xl font-headline-md text-sm font-bold text-slate-900 hover:bg-slate-50 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">group</span>
                <span className="hidden sm:inline">Members</span>
              </button>
            )}
            <button
              onClick={() => { if (activeBoard) setShowNewTask(true); else setShowNewBoard(true); }}
              className="px-4 md:px-6 py-2.5 md:py-3 bg-primary text-white rounded-xl font-headline-md text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              <span className="hidden sm:inline">{activeBoard ? "Issue Create" : "Board Create"}</span>
              <span className="sm:hidden">Yeni</span>
            </button>
          </div>
        </header>

        {activeBoard && (
          <>
            {/* Stats */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-gutter mb-8 md:mb-12">
              <div className="glass-row p-4 md:p-6 rounded-[24px]">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <span className="material-symbols-outlined text-primary bg-primary/10 p-1.5 md:p-2 rounded-lg">list_alt</span>
                  <span className="text-xs font-bold text-green-500 font-headline-md hidden sm:block">
                    {allCards.length > 0 ? `${allCards.length} issue` : "—"}
                  </span>
                </div>
                <div className="text-slate-500 font-headline-md text-[10px] md:text-xs uppercase tracking-wider mb-1">Toplam Issue</div>
                <div className="font-display text-2xl md:text-headline-lg text-slate-900">{allCards.length}</div>
              </div>

              <div className="glass-row p-4 md:p-6 rounded-[24px]">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <span className="material-symbols-outlined text-amber-500 bg-amber-500/10 p-1.5 md:p-2 rounded-lg">timer</span>
                  <span className="text-xs font-bold text-slate-400 font-headline-md hidden sm:block">Devam Eden</span>
                </div>
                <div className="text-slate-500 font-headline-md text-[10px] md:text-xs uppercase tracking-wider mb-1">Active Task</div>
                <div className="font-display text-2xl md:text-headline-lg text-slate-900">{inProgress}</div>
              </div>

              <div className="glass-row p-4 md:p-6 rounded-[24px]">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <span className="material-symbols-outlined text-blue-500 bg-blue-500/10 p-1.5 md:p-2 rounded-lg">bolt</span>
                  <span className="text-xs font-bold text-blue-500 font-headline-md hidden sm:block">Bitti</span>
                </div>
                <div className="text-slate-500 font-headline-md text-[10px] md:text-xs uppercase tracking-wider mb-1">Completed</div>
                <div className="font-display text-2xl md:text-headline-lg text-slate-900">{completed}</div>
              </div>

              <div className="glass-row col-span-2 md:col-span-1 p-4 md:p-6 rounded-[24px] !bg-slate-900 border-none">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <span className="material-symbols-outlined text-primary">sprint</span>
                </div>
                <div className="text-slate-400 font-headline-md text-[10px] md:text-xs uppercase tracking-wider mb-1">Sprint Durumu</div>
                <div className="font-body-md text-sm leading-relaxed text-white">
                  {activeSprint
                    ? `${activeSprint.name} aktif — ${sprintCards.length}tasks`
                    : "Active sprint yok"}
                </div>
              </div>
            </section>

            {/* View toggle + search */}
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-slate-100/70 p-1 rounded-xl">
                <button
                  onClick={() => { setViewMode("backlog"); setPage(1); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "backlog" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Backlog <span className="text-slate-400 ml-1">({backlogCards.length})</span>
                </button>
                {activeSprint && (
                  <button
                    onClick={() => { setViewMode("sprint"); setPage(1); }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${viewMode === "sprint" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <span className="material-symbols-outlined text-[13px] text-green-600">sprint</span>
                    {activeSprint.name}
                    <span className="text-slate-400 ml-0.5">({sprintCards.length})</span>
                  </button>
                )}
              </div>

              <div className="hidden sm:block relative max-w-sm">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input
                  className="pl-10 pr-4 py-1.5 bg-white/70 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 w-56 outline-none"
                  placeholder="Search issues..."
                  type="text"
                  value={filterText}
                  onChange={(e) => { setFilterText(e.target.value); setPage(1); }}
                />
              </div>
            </div>

            {/* Table header */}
            <div className="hidden md:flex items-center px-6 text-xs font-bold text-slate-400 uppercase tracking-widest font-headline-md mb-2">
              <div className="w-16">ID</div>
              <div className="flex-1">Task</div>
              <div className="w-32">Priority</div>
              <div className="w-32">Durum</div>
              <div className="w-36">Sprint</div>
              <div className="w-8" />
            </div>

            {/* Cards */}
            <div className="space-y-3 md:space-y-2">
              {paginated.length === 0 ? (
                <div className="glass-row rounded-[24px] p-8 md:p-12 text-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                  {filterText ? "No matching tasks found." : viewMode === "sprint" ? "No tasks in this sprint." : "Backlog is empty."}
                </div>
              ) : (
                paginated.map((card, i) => {
                  const pri = card.priority ? priorityConfig[card.priority] : null;
                  const isUrgentOrHigh = card.priority === "urgent" || card.priority === "high";
                  const rowIndex = (page - 1) * ITEMS_PER_PAGE + i;
                  const cardId = `KS-${String(rowIndex + 1).padStart(3, "0")}`;
                  const dueDate = card.due_date ? new Date(card.due_date) : null;
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const isOverdue = dueDate ? dueDate < today : false;

                  return (
                    <div
                      key={card.id}
                      className="glass-row p-4 md:py-3 md:px-6 rounded-[20px] flex items-start md:items-center gap-3 md:gap-4 relative cursor-pointer active:scale-[0.99] transition-transform hover:bg-white/80"
                      onClick={() => setModalCard(card)}
                    >
                      {isUrgentOrHigh && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-[20px]" />
                      )}

                      <div className="hidden md:block w-16 font-headline-md text-xs font-bold text-slate-400 flex-shrink-0">
                        {cardId}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-headline-md text-body-md font-bold text-slate-900 truncate">
                          {card.title}
                        </div>
                        {card.description && (
                          <div className="text-xs text-slate-400 mt-0.5 truncate">{card.description}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 md:hidden flex-wrap">
                          {pri && (
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-headline-md ${pri.className}`}>
                              <span className="material-symbols-outlined text-[10px]">{pri.icon}</span>
                              {pri.label}
                            </span>
                          )}
                          <span className="text-[10px] font-black font-headline-md text-slate-700 uppercase bg-surface-container-highest px-2 py-0.5 rounded-full">
                            {card.columnTitle}
                          </span>
                          {dueDate && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOverdue ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"}`}>
                              {dueDate.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="hidden md:block w-32 flex-shrink-0">
                        {pri ? (
                          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-headline-md w-fit ${pri.className}`}>
                            <span className="material-symbols-outlined text-xs">{pri.icon}</span>
                            {pri.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 font-headline-md">—</span>
                        )}
                      </div>

                      <div className="hidden md:block w-32 flex-shrink-0">
                        <span className="text-[10px] font-black font-headline-md text-slate-900 uppercase bg-surface-container-highest px-3 py-1 rounded-full">
                          {card.columnTitle}
                        </span>
                      </div>

                      <div className="hidden md:flex w-36 flex-shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
                        <SprintBadge card={card} sprints={sprints} onAssign={assignCardToSprint} />
                      </div>

                      <button
                        className="p-2 text-slate-300 hover:text-slate-600 transition-all flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="material-symbols-outlined">more_horiz</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            <footer className="mt-8 md:mt-12 flex flex-col sm:flex-row items-center justify-between border-t border-slate-200/50 pt-6 md:pt-8 gap-4">
              <div className="text-xs text-slate-400 font-headline-md font-medium uppercase tracking-widest">
                Showing {paginated.length} of {filtered.length} tasks
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, idx) => idx + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold font-headline-md transition-all ${
                        page === p ? "bg-primary text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  {totalPages > 5 && (
                    <>
                      <span className="px-2 text-slate-400">...</span>
                      <button
                        onClick={() => setPage(totalPages)}
                        className="w-8 h-8 rounded-lg bg-white text-slate-600 text-xs font-bold font-headline-md hover:bg-slate-50"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </footer>
          </>
        )}
      </main>

      {/* Create Issue Modal */}
      {showNewTask && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center" onClick={() => setShowNewTask(false)}>
          <div className="glass-card rounded-t-[24px] sm:rounded-[24px] p-6 sm:p-8 w-full sm:max-w-md" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden" />
            <h2 className="font-headline-md text-headline-md text-on-surface mb-6">Yeni Issue Create</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block font-label-caps text-label-caps text-slate-500 mb-2">Task Title</label>
                <input autoFocus type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Describe the issue..."
                  className="w-full bg-white/50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-on-surface" />
              </div>
              {activeCols[0] ? (
                <p className="text-xs text-slate-400">
                  Column to add: <span className="font-semibold text-slate-600">{activeCols[0].title}</span>
                </p>
              ) : (
                <p className="text-xs text-red-400">No columns yet — add columns from the kanban board first.</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creating || !newTaskTitle.trim() || !activeCols[0]}
                  className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-headline-md font-bold hover:bg-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {creating ? "Creating..." : "Issue Create"}
                </button>
                <button type="button" onClick={() => { setShowNewTask(false); setNewTaskTitle(""); }}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-medium">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      {showMembers && activeBoard && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setShowMembers(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-headline-md text-base font-bold text-slate-900">Manage Members</h2>
                <p className="text-xs text-slate-400 truncate max-w-[240px]">{activeBoard.title}</p>
              </div>
              <button onClick={() => setShowMembers(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {teams.length > 0 && (
              <div className="px-6 py-4 border-b border-slate-100 bg-primary/5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Team'den toplu ekle</p>
                <div className="flex gap-2">
                  <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                    <option value="">Select team...</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <button disabled={!selectedTeamId || addingTeam}
                    onClick={async () => {
                      if (!selectedTeamId || !activeBoard) return;
                      setAddingTeam(true);
                      try {
                        const mems = teamMembers[selectedTeamId] ?? await fetchTeamMembers(selectedTeamId);
                        await Promise.all(mems.map((m) => inviteMember(activeBoard.id, m.email, "member")));
                        await fetchMembers(activeBoard.id);
                        setSelectedTeamId("");
                      } finally { setAddingTeam(false); }
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-all hover:brightness-110 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">group_add</span>
                    {addingTeam ? "..." : "Hepsini Ekle"}
                  </button>
                </div>
              </div>
            )}

            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Email ile davet et</p>
              <div className="flex gap-2">
                <EmailAutocomplete value={inviteEmail} onChange={setInviteEmail} placeholder="kullanici@ornek.com"
                  inputClassName="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button disabled={inviting || !inviteEmail.trim()}
                onClick={async () => {
                  if (!inviteEmail.trim()) return;
                  setInviting(true);
                  try { await inviteMember(activeBoard.id, inviteEmail.trim(), inviteRole); setInviteEmail(""); }
                  finally { setInviting(false); }
                }}
                className="mt-3 w-full py-2.5 bg-primary text-white rounded-xl font-headline-md text-sm font-bold shadow-md shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {inviting ? "Sending invite..." : "Send Invite"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {members.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <span className="material-symbols-outlined text-3xl mb-2 block">group_off</span>
                  <p className="text-sm">No members yet</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {m.invited_email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{m.invited_email}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">{m.role}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${m.status === "accepted" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                            {m.status}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => removeMember(activeBoard.id, m.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100" title="Remove member">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Board Modal */}
      {showNewBoard && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center" onClick={() => setShowNewBoard(false)}>
          <div className="glass-card rounded-t-[24px] sm:rounded-[24px] w-full sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-6 sm:px-8 pt-6 sm:pt-8 flex-shrink-0">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden" />
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6">Create New Board</h2>
            </div>
            <form onSubmit={handleCreateBoard} className="space-y-4 overflow-y-auto px-6 sm:px-8 pb-6 sm:pb-8">
              <div>
                <label className="block font-label-caps text-label-caps text-slate-500 mb-2">Board Name</label>
                <input autoFocus type="text" value={newBoardTitle} onChange={(e) => setNewBoardTitle(e.target.value)}
                  placeholder="e.g. Product Sprint 2026"
                  className="w-full bg-white/50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-on-surface" />
              </div>
              {teams.length > 0 && (
                <div>
                  <label className="block font-label-caps text-label-caps text-slate-500 mb-2">Assign Team (optional)</label>
                  <select value={newBoardTeamId} onChange={(e) => setNewBoardTeamId(e.target.value)}
                    className="w-full bg-white/50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-secondary/20 transition-all text-sm">
                    <option value="">— No team —</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => setAddSprint((v) => !v)}>
                <div className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative ${addSprint ? "bg-primary" : "bg-slate-200"}`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${addSprint ? "translate-x-5" : ""}`} />
                </div>
                <span className="font-headline-md text-sm text-slate-600 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">sprint</span>
                  Add sprint (optional)
                </span>
              </div>
              {addSprint && (
                <div className="space-y-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <input type="text" value={sprintName} onChange={(e) => setSprintName(e.target.value)} placeholder="Sprint 1"
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={sprintStart} onChange={(e) => setSprintStart(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
                    <input type="date" value={sprintEnd} min={sprintStart} onChange={(e) => setSprintEnd(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
                  </div>
                  <input type="text" value={sprintGoal} onChange={(e) => setSprintGoal(e.target.value)}
                    placeholder="Sprint hedefi (opsiyonel)"
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creatingBoard || !newBoardTitle.trim()}
                  className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-headline-md font-bold hover:bg-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {creatingBoard ? "Creating..." : "Board Create"}
                </button>
                <button type="button" onClick={() => { setShowNewBoard(false); setNewBoardTitle(""); setAddSprint(false); }}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-medium">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Card Modal */}
      {modalCard && boardId && <CardModal card={modalCard} boardId={boardId} onClose={() => setModalCard(null)} />}
    </>
  );
}
