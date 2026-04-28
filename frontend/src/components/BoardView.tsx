import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
  PointerSensor, TouchSensor, useSensor, useSensors,
  pointerWithin, rectIntersection,
  type CollisionDetection,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useBoardStore } from "../store/useBoardStore";
import { useSprintStore } from "../store/useSprintStore";
import { useAIStore } from "../store/useAIStore";
import { SortableColumn, ColumnSkeleton } from "./KanbanColumn";
import KanbanColumnOverlay from "./KanbanColumn";
import SortableCard from "./SortableCard";
import CardModal from "./CardModal";
import AICoachChat from "./AICoachChat";
import AIInsightsPanel from "./AIInsightsPanel";
import type { Card, Column, Label, Priority } from "../types";
import { getLabels } from "../api/labels";

// ── Sprint Management Modal ──────────────────────────────────────────────────

function SprintModal({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const { sprints, fetchSprints, createSprint, deleteSprint, startSprint, completeSprint } = useSprintStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("Sprint 1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [goal, setGoal] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchSprints(boardId);
  }, [boardId, fetchSprints]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createSprint(boardId, {
        name: name.trim(),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
        ...(goal.trim() && { goal: goal.trim() }),
      });
      setName("Sprint 1");
      setStartDate("");
      setEndDate("");
      setGoal("");
      setShowForm(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setCreateError(msg ?? "Failed to create sprint. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const stateLabel: Record<string, string> = { future: "Planned", active: "Active", completed: "Completed" };
  const stateColor: Record<string, string> = {
    future: "bg-slate-100 text-slate-600",
    active: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-bold text-slate-800 text-base">Sprint Management</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {actionError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{actionError}</p>
          )}
          {sprints.length === 0 && !showForm && (
            <div className="text-center py-8 text-slate-400">
              <span className="material-symbols-outlined text-3xl block mb-2">sprint</span>
              <p className="text-sm">No sprint yet.</p>
            </div>
          )}

          {sprints.map((sprint) => (
            <div key={sprint.id} className="border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm truncate">{sprint.name}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${stateColor[sprint.state]}`}>
                      {stateLabel[sprint.state]}
                    </span>
                  </div>
                  {sprint.goal && <p className="text-xs text-slate-500 italic mt-0.5 truncate">"{sprint.goal}"</p>}
                  {(sprint.start_date || sprint.end_date) && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {sprint.start_date && new Date(sprint.start_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                      {sprint.start_date && sprint.end_date && " – "}
                      {sprint.end_date && new Date(sprint.end_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {sprint.state === "future" && (
                    <button
                      disabled={actioningId === sprint.id}
                      onClick={async () => {
                        setActioningId(sprint.id); setActionError(null);
                        try { await startSprint(sprint.id); }
                        catch (err: unknown) {
                          const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
                          setActionError(msg ?? "Failed to start sprint.");
                        } finally { setActioningId(null); }
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-primary text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
                    >
                      {actioningId === sprint.id ? "..." : "Start"}
                    </button>
                  )}
                  {sprint.state === "active" && (
                    <button
                      disabled={actioningId === sprint.id}
                      onClick={async () => {
                        setActioningId(sprint.id); setActionError(null);
                        try { await completeSprint(sprint.id); }
                        catch (err: unknown) {
                          const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
                          setActionError(msg ?? "Failed to complete sprint.");
                        } finally { setActioningId(null); }
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-green-600 text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
                    >
                      {actioningId === sprint.id ? "..." : "Complete"}
                    </button>
                  )}
                  {sprint.state !== "active" && (
                    <button
                      onClick={() => { if (confirm(`"${sprint.name}" Are you sure you want to delete this sprint?`)) deleteSprint(sprint.id); }}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {showForm && (
            <form onSubmit={handleCreate} className="border border-primary/20 bg-primary/5 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">New Sprint</p>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sprint name"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Start date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">End date</label>
                  <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white" />
                </div>
              </div>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Sprint hedefi (opsiyonel)"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              />
              {createError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{createError}</p>
              )}
              <div className="flex gap-2">
                <button type="submit" disabled={creating || !name.trim()} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:brightness-110 transition-all">
                  {creating ? "Creating..." : "Create"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setCreateError(null); }} className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-all">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="px-5 pb-5 flex-shrink-0">
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="w-full py-3 border-2 border-dashed border-primary/30 rounded-xl text-primary text-sm font-bold hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create New Sprint
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Filter Bar ────────────────────────────────────────────────────────────────

const PRIORITY_OPTS: { value: Priority; label: string; cls: string }[] = [
  { value: "urgent", label: "Acil",   cls: "bg-red-100 text-red-600 border-red-200"      },
  { value: "high",   label: "High", cls: "bg-orange-100 text-orange-500 border-orange-200" },
  { value: "medium", label: "Orta",   cls: "bg-blue-100 text-blue-600 border-blue-200"   },
  { value: "low",    label: "Low",  cls: "bg-slate-100 text-slate-500 border-slate-200" },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function BoardView() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { boards, columns, members, fetchBoards, fetchColumns, fetchMembers, createColumn, createCard } = useBoardStore();

  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [modalCard, setModalCard] = useState<Card | null>(null);
  const [newColTitle, setNewColTitle] = useState("");
  const [showColInput, setShowColInput] = useState(false);
  const [addingCol, setAddingCol] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskColId, setNewTaskColId] = useState<string>("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(true);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterPriorities, setFilterPriorities] = useState<Set<Priority>>(new Set());
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [filterLabelIds, setFilterLabelIds] = useState<Set<string>>(new Set());
  const [boardLabels, setBoardLabels] = useState<Label[]>([]);
  const [aiTab, setAiTab] = useState<"chat" | "insights">("chat");

  const board = boards.find((b) => b.id === boardId);
  const { sprints, fetchSprints, startSprint, completeSprint } = useSprintStore();
  const { openBoardChat, clearChat, getBoardInsights, boardInsights, boardLoading, boardError, streamingText, clearInsights } = useAIStore();
  const activeSprint = sprints.find((s) => s.state === "active") ?? sprints.find((s) => s.state === "future") ?? null;

  useEffect(() => { if (!boards.length) fetchBoards(); }, [boards.length, fetchBoards]);
  useEffect(() => {
    if (!boardId) return;
    setLoadingColumns(true);
    setNewTaskColId("");
    setFilterLabelIds(new Set());
    Promise.all([fetchColumns(boardId), fetchMembers(boardId), fetchSprints(boardId)]).finally(() => setLoadingColumns(false));
    getLabels(boardId).then(setBoardLabels).catch(() => {});
  }, [boardId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (columns.length && !newTaskColId) setNewTaskColId(columns[0].id); }, [columns, newTaskColId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 10 } })
  );

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pw = pointerWithin(args);
    if (pw.length > 0) return pw;
    return rectIntersection(args);
  }, []);

  const isDraggingCardRef = useRef(false);
  const pointerColumnRef = useRef<string | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!isDraggingCardRef.current) return;
      const els = document.querySelectorAll<HTMLElement>("[data-column-id]");
      pointerColumnRef.current = null;
      for (const el of Array.from(els)) {
        const r = el.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          pointerColumnRef.current = el.getAttribute("data-column-id");
          break;
        }
      }
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);

  const handleDragStart = ({ active }: DragStartEvent) => {
    if (active.data.current?.type === "card") {
      if (hasActiveFilter) return;
      navigator.vibrate?.(50);
      setActiveCard(active.data.current.card as Card);
      isDraggingCardRef.current = true;
    } else if (active.data.current?.type === "column") {
      setActiveColumn(active.data.current.column as Column);
    }
  };

  const handleDragOver = (_e: DragOverEvent) => {};

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveCard(null);
    setActiveColumn(null);
    isDraggingCardRef.current = false;

    const activeType = active.data.current?.type;

    if (activeType === "card") {
      if (hasActiveFilter) {
        pointerColumnRef.current = null;
        return;
      }
      const card = active.data.current?.card as Card;
      const overData = over?.data.current;
      let toColumnId = card.column_id;
      let overCardId: string | null = null;

      if (overData?.type === "card") {
        toColumnId = overData.card.column_id;
        overCardId = over!.id as string;
      } else if (overData?.type === "column") {
        toColumnId = overData.columnId ?? overData.column?.id ?? card.column_id;
      } else {
        const overId = typeof over?.id === "string" ? over.id : null;
        if (overId?.startsWith("col-drop-")) {
          toColumnId = overId.replace("col-drop-", "");
        } else if (overId && columns.some((c) => c.id === overId)) {
          toColumnId = overId;
        } else {
          toColumnId = pointerColumnRef.current ?? card.column_id;
        }
      }

      pointerColumnRef.current = null;
      useBoardStore.getState().moveCard(card.id, card.column_id, toColumnId, overCardId);
    }

    if (activeType === "column" && over) {
      const overData = over.data.current;
      const overColumnId = overData?.columnId ?? (over.id as string);
      if (overData?.type === "column" && active.id !== overColumnId)
        useBoardStore.getState().moveColumn(active.id as string, overColumnId);
    }
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColTitle.trim() || !boardId) return;
    setAddingCol(true);
    try {
      await createColumn(boardId, newColTitle.trim());
      setNewColTitle("");
      setShowColInput(false);
    } catch {
      alert("Failed to add column. You may not have access to this board.");
    } finally {
      setAddingCol(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskColId) return;
    setCreatingTask(true);
    try { await createCard(newTaskColId, newTaskTitle.trim()); setNewTaskTitle(""); setShowNewTask(false); }
    finally { setCreatingTask(false); }
  };

  const openNewTask = () => { if (columns.length) setNewTaskColId(columns[0].id); setShowNewTask(true); };

  const togglePriority = (p: Priority) => {
    setFilterPriorities((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  };

  const toggleLabelFilter = (labelId: string) => {
    setFilterLabelIds((prev) => {
      const next = new Set(prev);
      if (next.has(labelId)) next.delete(labelId); else next.add(labelId);
      return next;
    });
  };

  const hasActiveFilter = filterPriorities.size > 0 || filterAssignee !== null || searchText.trim() !== "" || filterLabelIds.size > 0;

  const filteredColumns = useMemo(() => {
    if (!hasActiveFilter) return columns;
    return columns.map((col) => ({
      ...col,
      cards: col.cards.filter((card) => {
        if (filterPriorities.size > 0 && !filterPriorities.has(card.priority as Priority)) return false;
        if (filterAssignee && card.assignee_email !== filterAssignee) return false;
        if (searchText.trim() && !card.title.toLowerCase().includes(searchText.trim().toLowerCase())) return false;
        if (filterLabelIds.size > 0 && !card.labels?.some((l) => filterLabelIds.has(l.id))) return false;
        return true;
      }),
    }));
  }, [columns, filterPriorities, filterAssignee, searchText, filterLabelIds, hasActiveFilter]);

  const COLORS = [
    { bg: "rgba(249,66,58,0.13)", color: "#F9423A" },
    { bg: "#dbeafe", color: "#2563eb" },
    { bg: "#dcfce7", color: "#16a34a" },
    { bg: "#fef9c3", color: "#ca8a04" },
    { bg: "#f3e8ff", color: "#9333ea" },
  ];

  return (
    <>
      {/* Subtle background blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-surface-container-highest/30 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] rounded-full bg-secondary-fixed/20 blur-[150px]" />
      </div>

      <main className="p-4 md:p-8 md:pb-8">
        {/* Sprint Banner */}
        {activeSprint && (() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const endDate = activeSprint.end_date ? new Date(activeSprint.end_date) : null;
          const startDate = activeSprint.start_date ? new Date(activeSprint.start_date) : null;
          const daysLeft = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / 86400000) : null;
          const isActive = activeSprint.state === "active";
          const isFuture = activeSprint.state === "future";

          return (
            <div className={`mb-5 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 ${
              isActive ? "bg-green-50 border border-green-200" : "bg-slate-100 border border-slate-200"
            }`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className={`material-symbols-outlined text-xl flex-shrink-0 ${isActive ? "text-green-600" : "text-slate-400"}`}>sprint</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-headline-md font-bold text-sm text-slate-900 truncate">{activeSprint.name}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${
                      isActive ? "bg-green-200 text-green-800" : "bg-slate-200 text-slate-600"
                    }`}>
                      {isActive ? "Active" : "Planned"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {startDate && endDate && (
                      <span className="text-xs text-slate-500">
                        {startDate.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                        {" – "}
                        {endDate.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                    {isActive && daysLeft !== null && (
                      <span className={`text-xs font-bold ${daysLeft <= 2 ? "text-red-500" : daysLeft <= 5 ? "text-amber-500" : "text-green-600"}`}>
                        {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? "Ends today!" : "Overdue"}
                      </span>
                    )}
                    {activeSprint.goal && (
                      <span className="text-xs text-slate-400 italic truncate max-w-[200px]">"{activeSprint.goal}"</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isFuture && (
                  <button onClick={() => startSprint(activeSprint.id)} className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold font-headline-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">play_arrow</span>Sprint Start
                  </button>
                )}
                {isActive && (
                  <button onClick={() => completeSprint(activeSprint.id)} className="px-4 py-2 bg-white border border-green-300 text-green-700 rounded-xl text-xs font-bold font-headline-md hover:bg-green-50 active:scale-95 transition-all flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>Sprinti Complete
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        <header className="flex flex-col md:flex-row md:justify-between md:items-end mb-4 md:mb-6 gap-4">
          <div>
            <nav className="flex items-center gap-2 text-slate-400 text-xs mb-2 font-headline-md uppercase tracking-widest">
              <button onClick={() => navigate("/projects")} className="hover:text-primary transition-colors">Projects</button>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-primary font-bold">{board?.title ?? "Board"}</span>
            </nav>
            <h1 className="font-display text-headline-lg text-on-surface mb-1">Sprint Board</h1>
            <p className="text-on-surface-variant font-body-md">{columns.length} columns</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Member avatars */}
            {(() => {
              const memberEmails = members.map((m) => m.invited_email);
              const assigneeEmails = Array.from(new Set(
                columns.flatMap((col) => col.cards.map((c) => c.assignee_email).filter(Boolean))
              )) as string[];
              const hasUnassigned = columns.some((col) => col.cards.some((c) => !c.assignee_email));
              const allPeople = Array.from(new Set([...memberEmails, ...assigneeEmails]));
              if (allPeople.length === 0 && !hasUnassigned) return null;
              return (
                <div className="hidden sm:flex -space-x-3">
                  {hasUnassigned && (
                    <div title="Unassigned tasks"
                      className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center cursor-default">
                      <span className="material-symbols-outlined text-slate-400 text-[18px]">person</span>
                    </div>
                  )}
                  {allPeople.slice(0, hasUnassigned ? 3 : 4).map((email, i) => {
                    const initial = email.split("@")[0][0].toUpperCase();
                    const member = members.find((m) => m.invited_email === email);
                    const roleLabel = member?.role ?? (assigneeEmails.includes(email) ? "assignee" : "");
                    const { bg, color } = COLORS[i % COLORS.length];
                    return (
                      <button key={email}
                        title={`${email}${roleLabel ? ` (${roleLabel})` : ""}`}
                        onClick={() => setFilterAssignee(filterAssignee === email ? null : email)}
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold cursor-pointer transition-all ${
                          filterAssignee === email ? "border-primary ring-2 ring-primary/40" : "border-white"
                        }`}
                        style={{ background: bg, color }}>
                        {initial}
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Search */}
            <div className="relative hidden md:block">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white/50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 w-40 transition-all outline-none"
                placeholder="Ara..."
                type="text"
              />
            </div>

            {/* Sprints button */}
            <button
              onClick={() => setShowSprintModal(true)}
              className="bg-white/50 border border-slate-200 px-3 md:px-4 py-2 rounded-lg font-medium text-slate-700 hover:bg-white transition-all flex items-center gap-2 text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">sprint</span>
              <span className="hidden sm:inline">Sprints</span>
            </button>

            {/* Filter button */}
            <button
              onClick={() => setShowFilter((v) => !v)}
              className={`px-3 md:px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-sm border ${
                hasActiveFilter
                  ? "bg-primary text-white border-primary shadow-sm shadow-primary/20"
                  : "bg-white/50 border-slate-200 text-slate-700 hover:bg-white"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              <span className="hidden sm:inline">Filter {hasActiveFilter ? "●" : ""}</span>
            </button>

            {/* AI Coach button */}
            <button
              onClick={() => {
                setShowAIPanel(true);
                openBoardChat(board?.title ?? "Board", columns, activeSprint, members.length);
              }}
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-3 md:px-4 py-2 rounded-lg font-medium text-sm hover:brightness-110 transition-all flex items-center gap-2 shadow-sm shadow-purple-500/20"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              <span className="hidden sm:inline">AI Coach</span>
            </button>

            <button onClick={openNewTask} className="hidden md:flex bg-primary text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary-container transition-all items-center gap-2 shadow-sm shadow-primary/20">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>New Task
            </button>
          </div>
        </header>

        {/* Filter Bar */}
        {showFilter && (
          <div className="mb-5 bg-white/70 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 backdrop-blur-sm">
            {/* Priority row */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 w-16 flex-shrink-0">Priority:</span>
              {PRIORITY_OPTS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => togglePriority(p.value)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                    filterPriorities.has(p.value)
                      ? p.cls + " ring-2 ring-offset-1 ring-current/30"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              {filterAssignee && (
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">person</span>
                  {filterAssignee}
                  <button onClick={() => setFilterAssignee(null)} className="hover:text-red-500 ml-1">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </span>
              )}
            </div>

            {/* Label row */}
            {boardLabels.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 w-16 flex-shrink-0">Label:</span>
                {boardLabels.map((label) => {
                  const active = filterLabelIds.has(label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() => toggleLabelFilter(label.id)}
                      style={active ? {
                        background: label.color + "22",
                        color: label.color,
                        borderColor: label.color + "55",
                      } : undefined}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        active ? "ring-2 ring-offset-1 ring-current/30" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: label.color }} />
                      {label.name}
                      {active && <span className="material-symbols-outlined text-[11px]">check</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Clear row */}
            {hasActiveFilter && (
              <div className="flex justify-end">
                <button
                  onClick={() => { setFilterPriorities(new Set()); setFilterAssignee(null); setSearchText(""); setFilterLabelIds(new Set()); }}
                  className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">clear_all</span>
                  Clear All
                </button>
              </div>
            )}
          </div>
        )}
        {hasActiveFilter && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Card drag is disabled while filters are active. Clear filters to move cards.
          </div>
        )}

        {loadingColumns && (
          <div className="overflow-x-auto pb-8">
            <div className="flex gap-6 items-start min-w-max">
              {[0, 1, 2].map((i) => <ColumnSkeleton key={i} />)}
            </div>
          </div>
        )}

        {!loadingColumns && (
        <div className="overflow-x-auto pb-8">
          <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-6 items-start min-w-max">
                {filteredColumns.map((col) => (
                  <SortableColumn
                    key={col.id}
                    column={col}
                    onOpenCard={setModalCard}
                    cardDragDisabled={hasActiveFilter}
                  />
                ))}
                <div className="flex-shrink-0 w-72">
                  {showColInput ? (
                    <form onSubmit={handleAddColumn} className="glass-card rounded-[24px] p-4">
                      <input autoFocus type="text" value={newColTitle} onChange={(e) => setNewColTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Escape" && setShowColInput(false)} placeholder="Column name..."
                        className="w-full rounded-xl px-3 py-2 text-sm bg-white/70 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <div className="flex gap-2 mt-3">
                        <button type="submit" disabled={addingCol || !newColTitle.trim()} className="bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50">Ekle</button>
                        <button type="button" onClick={() => { setShowColInput(false); setNewColTitle(""); }} className="text-slate-500 text-xs px-2 py-1.5 rounded-lg">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <button onClick={() => setShowColInput(true)}
                      className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[24px] text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-white/40 transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">add</span>
                      <span className="font-medium text-sm">Add Column</span>
                    </button>
                  )}
                </div>
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
              {activeCard && <SortableCard card={activeCard} onOpen={() => {}} isDragOverlay />}
              {activeColumn && <KanbanColumnOverlay column={activeColumn} />}
            </DragOverlay>
          </DndContext>
        </div>
        )}
      </main>

      {/* Mobile FAB — add task */}
      <button
        onClick={openNewTask}
        className="md:hidden fixed bottom-6 right-5 w-14 h-14 rounded-full bg-primary text-white shadow-xl shadow-primary/40 flex items-center justify-center z-40 active:scale-95 transition-transform"
        style={{ bottom: "max(24px, calc(env(safe-area-inset-bottom) + 16px))" }}
        aria-label="Yeni görev ekle"
      >
        <span className="material-symbols-outlined text-[26px]">add</span>
      </button>

      {/* New Task Modal */}
      {showNewTask && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center" onClick={() => setShowNewTask(false)}>
          <div className="glass-card rounded-t-[24px] sm:rounded-[24px] p-6 sm:p-8 w-full sm:max-w-md" style={{ paddingBottom: "max(1.5rem,env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden" />
            <h2 className="font-headline-md text-headline-md text-on-surface mb-6">New Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block font-label-caps text-label-caps text-slate-500 mb-2">Task Title</label>
                <input autoFocus type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full bg-white/50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all" />
              </div>
              {columns.length > 0 && (
                <div>
                  <label className="block font-label-caps text-label-caps text-slate-500 mb-2">Column</label>
                  <select value={newTaskColId} onChange={(e) => setNewTaskColId(e.target.value)}
                    className="w-full bg-white/50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-secondary/20 transition-all text-sm">
                    {columns.map((col) => <option key={col.id} value={col.id}>{col.title}</option>)}
                  </select>
                </div>
              )}
              {columns.length === 0 && <p className="text-xs text-red-400">No columns yet — add a column first.</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creatingTask || !newTaskTitle.trim() || !newTaskColId}
                  className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-headline-md font-bold hover:bg-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {creatingTask ? "Creating..." : "Task Create"}
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

      {/* Sprint Modal */}
      {showSprintModal && boardId && <SprintModal boardId={boardId} onClose={() => setShowSprintModal(false)} />}

      {/* Card Modal */}
      {modalCard && boardId && <CardModal card={modalCard} boardId={boardId} onClose={() => setModalCard(null)} />}

      {/* AI Coach Panel */}
      {showAIPanel && (
        <div
          className="fixed inset-0 z-[80] flex items-stretch justify-end"
          style={{ background: "rgba(15,23,42,0.3)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAIPanel(false); clearChat(); } }}
        >
          <div
            className="relative flex flex-col h-full w-full max-w-[420px] shadow-2xl"
            style={{
              background: "linear-gradient(160deg,#faf8ff 0%,#f2f3ff 60%,#fff5f5 100%)",
              borderLeft: "1px solid rgba(185,11,20,0.18)",
            }}
          >
            {/* Ambient glow top */}
            <div
              className="absolute top-0 right-0 w-72 h-72 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at top right,rgba(185,11,20,0.07) 0%,transparent 70%)",
              }}
            />

            {/* Header */}
            <div className="relative flex-shrink-0 px-5 pt-5 pb-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#de2e2a,#b90b14)" }}
                  >
                    <span className="material-symbols-outlined text-white text-[18px]">auto_awesome</span>
                  </div>
                  <div>
                    <h2 className="font-bold text-[15px] leading-tight" style={{ color: "#131b2e" }}>AI Koç</h2>
                    <p className="text-[11px] mt-0.5 truncate max-w-[200px]" style={{ color: "#94a3b8" }}>{board?.title ?? "Board"}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowAIPanel(false); clearChat(); clearInsights(); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-slate-100"
                  style={{ color: "#94a3b8" }}
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Tabs */}
              <div
                className="relative flex p-1 rounded-xl mb-0"
                style={{ background: "rgba(185,11,20,0.07)" }}
              >
                <div
                  className="absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-in-out"
                  style={{
                    width: "calc(50% - 4px)",
                    left: aiTab === "chat" ? "4px" : "calc(50%)",
                    background: "linear-gradient(135deg,#de2e2a,#b90b14)",
                    boxShadow: "0 2px 12px rgba(185,11,20,0.3)",
                  }}
                />
                <button
                  onClick={() => setAiTab("chat")}
                  className="relative z-10 flex-1 py-2 text-xs font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-1.5"
                  style={{ color: aiTab === "chat" ? "#fff" : "#5c403c" }}
                >
                  <span className="material-symbols-outlined text-[14px]">chat</span>
                  Sohbet
                </button>
                <button
                  onClick={() => {
                    setAiTab("insights");
                    if (!boardInsights && !boardLoading) {
                      getBoardInsights(board?.title ?? "Board", columns, activeSprint, members.length);
                    }
                  }}
                  className="relative z-10 flex-1 py-2 text-xs font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-1.5"
                  style={{ color: aiTab === "insights" ? "#fff" : "#5c403c" }}
                >
                  <span className="material-symbols-outlined text-[14px]">analytics</span>
                  Analiz
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-5 mt-4 mb-0 h-px" style={{ background: "rgba(15,23,42,0.07)" }} />

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
              {aiTab === "chat" ? (
                <AICoachChat
                  boardTitle={board?.title ?? "Board"}
                  columns={columns}
                  sprint={activeSprint}
                  memberCount={members.length}
                />
              ) : (
                <AIInsightsPanel
                  insights={boardInsights}
                  streamingText={streamingText}
                  loading={boardLoading}
                  error={boardError}
                  onRefresh={() => getBoardInsights(board?.title ?? "Board", columns, activeSprint, members.length)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
