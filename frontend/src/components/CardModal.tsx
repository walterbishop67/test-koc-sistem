import { useEffect, useRef, useState } from "react";
import type { Card, CardActivity, Label, Priority } from "../types";
import { useBoardStore } from "../store/useBoardStore";
import { pendingActivityMap } from "../store/useBoardStore";
import { api } from "../api/client";
import { addLabelToCard, createLabel, deleteLabel, getLabels, removeLabelFromCard, updateLabel } from "../api/labels";
import { useSprintStore } from "../store/useSprintStore";
import { useAIStore } from "../store/useAIStore";
import { getTokenEmail } from "../utils/auth";

const LABEL_COLORS = [
  "#6366f1", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#ec4899", "#8b5cf6",
];

interface Props {
  card: Card;
  boardId: string;
  onClose: () => void;
}

function ActivityTimeline({
  activities,
  loading,
  formatDate,
}: {
  activities: CardActivity[];
  loading: boolean;
  formatDate: (iso: string) => string;
}) {
  if (loading) return (
    <div>
      <div className="h-3 w-20 bg-slate-100 rounded mb-3" />
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-3 items-start animate-pulse">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-slate-100 rounded w-3/4" />
              <div className="h-2.5 bg-slate-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (activities.length === 0) return null;

  const PRIORITY_LABELS: Record<string, { label: string; cls: string }> = {
    urgent: { label: "Urgent", cls: "bg-red-50 text-red-500 border border-red-200" },
    high:   { label: "High",   cls: "bg-orange-50 text-orange-500 border border-orange-200" },
    medium: { label: "Medium", cls: "bg-blue-50 text-blue-500 border border-blue-200" },
    low:    { label: "Low",    cls: "bg-slate-100 text-slate-400 border border-slate-200" },
  };

  const PriorityChip = ({ value }: { value: string | null }) => {
    if (!value) return <span className="text-slate-400 italic">yok</span>;
    const p = PRIORITY_LABELS[value];
    return p
      ? <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${p.cls}`}>{p.label}</span>
      : <span className="font-semibold text-slate-700">{value}</span>;
  };

  const actionIcon = (action: string) => {
    if (action === "created") return "add_circle";
    if (action === "priority_changed") return "flag";
    return "swap_horiz";
  };

  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
        Aktivite <span className="text-slate-300">({activities.length})</span>
      </label>
      <div className="space-y-2">
        {activities.map((a) => (
          <div key={a.id} className="flex gap-3 items-start">
            <div className="mt-0.5 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[13px] text-slate-500">
                {actionIcon(a.action)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-600">
                {a.action === "created" ? (
                  <>
                    <span className="font-medium">Created</span>
                    {a.to_col && (
                      <> — <span className="font-semibold text-slate-700">{a.to_col}</span></>
                    )}
                  </>
                ) : a.action === "priority_changed" ? (
                  <>
                    <span className="font-medium">Priority changed</span>
                    {" "}<PriorityChip value={a.from_priority} />
                    {" "}<span className="material-symbols-outlined text-[13px] align-middle text-slate-400">arrow_forward</span>
                    {" "}<PriorityChip value={a.to_priority} />
                    {a.user_name && (
                      <> <span className="text-slate-400">— {a.user_name}</span></>
                    )}
                  </>
                ) : (
                  <>
                    <span className="font-medium">Moved</span>
                    {a.from_col && a.to_col ? (
                      <>
                        {" "}<span className="text-slate-400">{a.from_col}</span>
                        {" "}<span className="material-symbols-outlined text-[13px] align-middle text-slate-400">arrow_forward</span>
                        {" "}<span className="font-semibold text-slate-700">{a.to_col}</span>
                        {a.user_name && (
                          <> <span className="text-slate-400">— {a.user_name}</span></>
                        )}
                      </>
                    ) : a.to_col ? (
                      <> → <span className="font-semibold text-slate-700">{a.to_col}</span></>
                    ) : null}
                  </>
                )}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(a.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const PRIORITIES: { value: Priority; label: string; icon: string; cls: string }[] = [
  { value: "urgent", label: "Urgent", icon: "priority_high",  cls: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"    },
  { value: "high",   label: "High",   icon: "arrow_upward",   cls: "bg-orange-50 text-orange-500 border-orange-200 hover:bg-orange-100" },
  { value: "medium", label: "Medium", icon: "remove",         cls: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"  },
  { value: "low",    label: "Low",    icon: "arrow_downward", cls: "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100" },
];

export default function CardModal({ card, boardId, onClose }: Props) {
  const { updateCard, deleteCard, members, fetchMembers, comments, fetchComments, addComment, deleteComment, boards, updateCardLabels } = useBoardStore();
  const boardPrefix = (boards.find((b) => b.id === boardId)?.title ?? "").slice(0, 2).toUpperCase() || "??";
  const { sprints, fetchSprints } = useSprintStore();

  const [title, setTitle]         = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [priority, setPriority]   = useState<Priority | null>(card.priority ?? null);
  const [assignee, setAssignee]   = useState<string | null>(card.assignee_email ?? null);
  const [dueDate, setDueDate]     = useState<string>(card.due_date ?? "");
  const [sprintId, setSprintId]   = useState<string | null>(card.sprint_id ?? null);
  const [activities, setActivities] = useState<CardActivity[]>([]);
  const [loadingAct, setLoadingAct] = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);

  const [boardLabels, setBoardLabels] = useState<Label[]>([]);
  const [cardLabelIds, setCardLabelIds] = useState<Set<string>>(
    new Set((card.labels ?? []).map((l) => l.id))
  );
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [labelSaving, setLabelSaving] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(LABEL_COLORS[0]);
  const { getCardDescription } = useAIStore();
  const titleRef = useRef<HTMLInputElement>(null);
  const currentEmail = getTokenEmail();

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    getLabels(boardId).then(setBoardLabels).catch(() => {});
  }, [boardId]);

  const handleToggleLabel = async (label: Label) => {
    const isOn = cardLabelIds.has(label.id);
    const next = new Set(cardLabelIds);
    if (isOn) {
      next.delete(label.id);
      setCardLabelIds(next);
      await removeLabelFromCard(card.id, label.id).catch(() => {
        next.add(label.id);
        setCardLabelIds(new Set(next));
      });
    } else {
      next.add(label.id);
      setCardLabelIds(next);
      await addLabelToCard(card.id, label.id).catch(() => {
        next.delete(label.id);
        setCardLabelIds(new Set(next));
      });
    }
    const updatedLabels = boardLabels.filter((l) => next.has(l.id));
    updateCardLabels(card.id, updatedLabels);
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    setLabelSaving(true);
    setLabelError(null);
    try {
      const created = await createLabel(boardId, newLabelName.trim(), newLabelColor);
      const nextBoardLabels = [...boardLabels, created];
      setBoardLabels(nextBoardLabels);
      const next = new Set(cardLabelIds);
      next.add(created.id);
      setCardLabelIds(next);
      await addLabelToCard(card.id, created.id);
      updateCardLabels(card.id, nextBoardLabels.filter((l) => next.has(l.id)));
      setNewLabelName("");
    } catch {
      setLabelError("Bu adda bir etiket zaten mevcut.");
    } finally {
      setLabelSaving(false);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    await deleteLabel(labelId);
    const updatedBoard = boardLabels.filter((l) => l.id !== labelId);
    setBoardLabels(updatedBoard);
    const next = new Set(cardLabelIds);
    next.delete(labelId);
    setCardLabelIds(next);
    updateCardLabels(card.id, updatedBoard.filter((l) => next.has(l.id)));
  };

  const startEditLabel = (label: Label) => {
    setEditingLabelId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  const handleEditLabel = async (labelId: string) => {
    if (!editName.trim()) return;
    const updated = await updateLabel(labelId, editName.trim(), editColor);
    const updatedBoard = boardLabels.map((l) => l.id === labelId ? updated : l);
    setBoardLabels(updatedBoard);
    setEditingLabelId(null);
    updateCardLabels(card.id, updatedBoard.filter((l) => cardLabelIds.has(l.id)));
  };

  useEffect(() => {
    fetchMembers(boardId);
    fetchComments(card.id);
    fetchSprints(boardId);
    const pending = pendingActivityMap.get(card.id);
    if (pending) {
      pendingActivityMap.delete(card.id);
      setActivities([pending]);
      setLoadingAct(false);
    } else {
      setLoadingAct(true);
    }
    api.get<CardActivity[]>(`/cards/${card.id}/activity`).then(({ data }) => {
      if (pending) {
        const serverHasIt = data.some(
          (a) => a.action === "moved" && a.from_col === pending.from_col && a.to_col === pending.to_col
        );
        setActivities(serverHasIt ? data : [pending, ...data]);
      } else {
        setActivities(data);
      }
    }).finally(() => setLoadingAct(false));
  }, [boardId, card.id, fetchMembers, fetchComments, fetchSprints]);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateCard(card.id, {
        title: title.trim(),
        description,
        priority,
        assignee_email: assignee,
        due_date: dueDate || null,
        sprint_id: sprintId,
      });
      onClose();
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this card?")) return;
    await deleteCard(card.id);
    onClose();
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommentSaving(true);
    try {
      await addComment(card.id, commentText.trim());
      setCommentText("");
    } finally {
      setCommentSaving(false);
    }
  };

  const handleAIDescription = async () => {
    setGeneratingDesc(true);
    try {
      const activeSprint = sprints.find((s) => s.state === "active") ?? null;
      const generated = await getCardDescription(title, activeSprint?.goal, undefined);
      setDescription(generated);
    } catch {
      // silently fail — user can retry
    } finally {
      setGeneratingDesc(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const avatarLabel = (comment: { users: { full_name: string | null; email: string } }) =>
    (comment.users.full_name || comment.users.email).charAt(0).toUpperCase();

  const availableSprints = sprints.filter((s) => s.state !== "completed");

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">
              Card Details
            </h2>
            {card.card_number != null && (
              <span className="text-[11px] font-bold font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                {boardPrefix}-{card.card_number}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Title
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9423A]/20 focus:border-[#F9423A]/50 transition-all"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Priority
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPriority(priority === p.value ? null : p.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                    priority === p.value
                      ? p.cls + " ring-2 ring-offset-1 ring-current/30"
                      : p.cls
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">{p.icon}</span>
                  {p.label}
                </button>
              ))}
              {priority && (
                <button
                  onClick={() => setPriority(null)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Assignee
            </label>
            {members.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No board members yet — invite from settings.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const isSelected = assignee === m.invited_email;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setAssignee(isSelected ? null : m.invited_email)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm transition-all ${
                        isSelected
                          ? "bg-[#F9423A]/10 border-[#F9423A]/30 text-[#F9423A] font-semibold ring-2 ring-[#F9423A]/20"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                        isSelected ? "bg-[#F9423A] text-white" : "bg-slate-200 text-slate-600"
                      }`}>
                        {m.invited_email.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[160px]">{m.invited_email}</span>
                      {isSelected && (
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Due Date + Sprint row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                End date Tarihi
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9423A]/20 focus:border-[#F9423A]/50 transition-all"
                />
                {dueDate && (
                  <button
                    onClick={() => setDueDate("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sprint */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Sprint
              </label>
              {availableSprints.length === 0 ? (
                <p className="text-xs text-slate-400 italic mt-2.5">No sprint</p>
              ) : (
                <select
                  value={sprintId ?? ""}
                  onChange={(e) => setSprintId(e.target.value || null)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9423A]/20 transition-all bg-white"
                >
                  <option value="">— Select sprint —</option>
                  {availableSprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.state === "active" ? "🟢" : "📋"}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Etiketler
            </label>

            {/* Existing board labels */}
            {boardLabels.length > 0 && (
              <div className="flex flex-col gap-1 mb-3">
                {boardLabels.map((label) => {
                  const isOn = cardLabelIds.has(label.id);
                  const isEditing = editingLabelId === label.id;
                  return (
                    <div key={label.id} className="group">
                      {isEditing ? (
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
                          <input
                            autoFocus
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleEditLabel(label.id); if (e.key === "Escape") setEditingLabelId(null); }}
                            className="flex-1 min-w-0 bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#F9423A]/20"
                          />
                          <div className="flex gap-1">
                            {LABEL_COLORS.map((c) => (
                              <button
                                key={c}
                                onClick={() => setEditColor(c)}
                                className={`w-4 h-4 rounded-full transition-transform flex-shrink-0 ${editColor === c ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : "hover:scale-110"}`}
                                style={{ background: c }}
                              />
                            ))}
                          </div>
                          <button
                            onClick={() => handleEditLabel(label.id)}
                            disabled={!editName.trim()}
                            className="flex-shrink-0 bg-[#F9423A] text-white px-2 py-1 rounded text-[11px] font-bold disabled:opacity-50"
                          >
                            Kaydet
                          </button>
                          <button
                            onClick={() => setEditingLabelId(null)}
                            className="flex-shrink-0 text-slate-400 hover:text-slate-600"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleToggleLabel(label)}
                            style={{
                              background: isOn ? label.color + "22" : "#f8fafc",
                              color: isOn ? label.color : "#94a3b8",
                              borderColor: isOn ? label.color + "55" : "#e2e8f0",
                            }}
                            className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all text-left"
                          >
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ background: label.color }}
                            />
                            <span className="flex-1">{label.name}</span>
                            {isOn && <span className="material-symbols-outlined text-[12px]">check</span>}
                          </button>
                          <button
                            onClick={() => startEditLabel(label)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-slate-500 ml-0.5 p-1"
                            title="Düzenle"
                          >
                            <span className="material-symbols-outlined text-[13px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteLabel(label.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400 p-1"
                            title="Etiketi sil"
                          >
                            <span className="material-symbols-outlined text-[13px]">delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Create new label */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newLabelName}
                onChange={(e) => { setNewLabelName(e.target.value); setLabelError(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleCreateLabel()}
                placeholder="Yeni etiket adı..."
                className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#F9423A]/20 focus:border-[#F9423A]/50 transition-all"
              />
              <div className="flex gap-1">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewLabelColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${newLabelColor === c ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : "hover:scale-110"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <button
                onClick={handleCreateLabel}
                disabled={labelSaving || !newLabelName.trim()}
                className="flex-shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 transition-all"
              >
                {labelSaving ? <span className="animate-spin material-symbols-outlined text-[12px]">progress_activity</span> : "Ekle"}
              </button>
            </div>
            {labelError && (
              <p className="text-[11px] text-red-500 mt-1">{labelError}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                Description
              </label>
              <button
                type="button"
                onClick={handleAIDescription}
                disabled={generatingDesc || !title.trim()}
                className="flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-lg"
              >
                {generatingDesc
                  ? <><span className="animate-spin material-symbols-outlined text-[12px]">progress_activity</span>Creating...</>
                  : <><span className="material-symbols-outlined text-[12px]">auto_awesome</span>AI ile Create</>
                }
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Description ekle..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9423A]/20 focus:border-[#F9423A]/50 resize-none transition-all"
            />
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
              Yorumlar {comments.length > 0 && <span className="text-slate-300">({comments.length})</span>}
            </label>

            {/* Comment list */}
            {comments.length > 0 && (
              <div className="space-y-3 mb-4">
                {comments.map((c) => {
                  const isOwn = c.users.email === currentEmail;
                  const displayName = c.users.full_name || c.users.email;
                  return (
                    <div key={c.id} className="flex gap-3">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-[#F9423A]/15 text-[#F9423A] flex items-center justify-center text-xs font-bold flex-shrink-0 select-none">
                        {avatarLabel(c)}
                      </div>
                      {/* Bubble */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-slate-700 truncate">{displayName}</span>
                          <span className="text-[11px] text-slate-400 flex-shrink-0">{formatDate(c.created_at)}</span>
                          {isOwn && (
                            <button
                              onClick={() => deleteComment(c.id, card.id)}
                              className="ml-auto text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                              title="Yorumu sil"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap break-words bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                          {c.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* New comment input */}
            <div className="flex gap-2 items-end">
              <div className="w-8 h-8 rounded-full bg-[#F9423A]/15 text-[#F9423A] flex items-center justify-center text-xs font-bold flex-shrink-0 select-none">
                {currentEmail ? currentEmail.charAt(0).toUpperCase() : "?"}
              </div>
              <div className="flex-1">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddComment();
                  }}
                  rows={2}
                  placeholder="Write a comment... (Cmd+Enter to send)"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9423A]/20 focus:border-[#F9423A]/50 resize-none transition-all"
                />
                <div className="flex justify-end mt-1.5">
                  <button
                    onClick={handleAddComment}
                    disabled={commentSaving || !commentText.trim()}
                    className="bg-[#F9423A] hover:brightness-110 text-white px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-1"
                  >
                    {commentSaving
                      ? <><span className="animate-spin material-symbols-outlined text-[13px]">progress_activity</span>Sendiliyor</>
                      : <><span className="material-symbols-outlined text-[13px]">send</span>Send</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Activity */}
          <ActivityTimeline activities={activities} loading={loadingAct} formatDate={formatDate} />

        </div>

        {/* Footer */}
        <div className="flex flex-col px-6 pb-5 pt-3 border-t border-slate-100 flex-shrink-0 gap-3">
          {error && (
            <p className="text-xs text-red-500 text-right">{error}</p>
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Delete Card
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !title.trim()}
                className="bg-[#F9423A] hover:brightness-110 text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {saving
                  ? <><span className="animate-spin material-symbols-outlined text-[16px]">progress_activity</span>Kaydediliyor</>
                  : <><span className="material-symbols-outlined text-[16px]">save</span>Kaydet</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
