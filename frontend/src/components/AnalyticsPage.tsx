import { useEffect, useMemo, useState } from "react";
import { useBoardStore } from "../store/useBoardStore";
import { useSprintStore } from "../store/useSprintStore";
import { useAIStore } from "../store/useAIStore";
import AIInsightsPanel from "./AIInsightsPanel";
import type { Card } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_META = {
  urgent: { label: "Acil",   color: "bg-red-500",    text: "text-red-600",    light: "bg-red-50"    },
  high:   { label: "High", color: "bg-orange-400", text: "text-orange-600", light: "bg-orange-50" },
  medium: { label: "Orta",   color: "bg-yellow-400", text: "text-yellow-600", light: "bg-yellow-50" },
  low:    { label: "Low",  color: "bg-green-400",  text: "text-green-600",  light: "bg-green-50"  },
  none:   { label: "Yok",    color: "bg-slate-300",  text: "text-slate-500",  light: "bg-slate-50"  },
} as const;

type PriorityKey = keyof typeof PRIORITY_META;

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, accent,
}: {
  icon: string; label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="glass-card rounded-[20px] p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ?? "bg-primary/10 text-primary"}`}>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
        <p className="text-xs font-semibold text-slate-500 mt-1">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function BarRow({ label, count, total, colorClass }: { label: string; count: number; total: number; colorClass: string }) {
  const p = pct(count, total);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-600 w-24 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
          style={{ width: `${p}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-700 w-8 text-right">{count}</span>
      <span className="text-[10px] text-slate-400 w-8 text-right">{p}%</span>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-[20px] p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="material-symbols-outlined text-[18px] text-primary">{icon}</span>
        <h3 className="font-bold text-sm text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { boards, columns, members, fetchBoards, fetchColumns, fetchMembers } = useBoardStore();
  const { sprints, fetchSprints } = useSprintStore();
  const { boardInsights, streamingText, boardLoading, boardError, getBoardInsights, clearInsights } = useAIStore();
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    const init = async () => {
      const loaded = await fetchBoards();
      if (loaded.length) {
        const first = loaded[0].id;
        setSelectedBoardId(first);
        await Promise.all([fetchColumns(first), fetchMembers(first), fetchSprints(first)]);
      }
      setLoading(false);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Board switch
  const handleBoardChange = async (id: string) => {
    setSelectedBoardId(id);
    clearInsights();
    await Promise.all([fetchColumns(id), fetchMembers(id), fetchSprints(id)]);
  };

  // ── Compute stats ────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const boardColumns = columns.filter((c) => c.board_id === selectedBoardId);
    const allCards: Card[] = boardColumns.flatMap((c) => c.cards);
    const total = allCards.length;

    // Done detection: last column or title contains "done/tamamlandı/completed"
    const doneCol = boardColumns.find((c) =>
      /done|tamamland[ıi]|complet/i.test(c.title)
    ) ?? boardColumns[boardColumns.length - 1];
    const doneCards = doneCol?.cards.length ?? 0;

    // Priority counts
    const byCriticality = {
      urgent: allCards.filter((c) => c.priority === "urgent").length,
      high:   allCards.filter((c) => c.priority === "high").length,
      medium: allCards.filter((c) => c.priority === "medium").length,
      low:    allCards.filter((c) => c.priority === "low").length,
      none:   allCards.filter((c) => !c.priority).length,
    };

    // Cards per column
    const byColumn = boardColumns.map((col) => ({
      id: col.id,
      title: col.title,
      count: col.cards.length,
      isDone: col.id === doneCol?.id,
    }));

    // Assignee workload
    const assigneeMap: Record<string, number> = {};
    allCards.forEach((c) => {
      const key = c.assignee_email ?? "Unassigned";
      assigneeMap[key] = (assigneeMap[key] ?? 0) + 1;
    });
    const byAssignee = Object.entries(assigneeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return { total, doneCards, byCriticality, byColumn, byAssignee };
  }, [columns, selectedBoardId]);

  const selectedBoard = boards.find((b) => b.id === selectedBoardId);
  const acceptedMembers = members.filter((m) => m.status === "accepted").length;

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="p-4 md:p-section-margin max-w-7xl mx-auto">
        <div className="mb-8 md:mb-12">
          <div className="h-3 bg-slate-200 rounded-full w-20 mb-3 animate-pulse" />
          <div className="h-8 bg-slate-200 rounded-xl w-48 mb-2 animate-pulse" />
          <div className="h-4 bg-slate-200 rounded-full w-64 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-[20px] p-5 flex items-start gap-4 animate-pulse">
              <div className="w-10 h-10 bg-slate-200 rounded-xl flex-shrink-0" />
              <div className="flex-1">
                <div className="h-6 bg-slate-200 rounded-full w-10 mb-2" />
                <div className="h-3 bg-slate-200 rounded-full w-20" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <div key={i} className="glass-card rounded-[20px] p-6 animate-pulse">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-5 h-5 bg-slate-200 rounded" />
                <div className="h-4 bg-slate-200 rounded-full w-32" />
              </div>
              <div className="space-y-4">
                {[0, 1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="h-3 bg-slate-200 rounded-full w-24 flex-shrink-0" />
                    <div className="flex-1 h-2.5 bg-slate-200 rounded-full" />
                    <div className="h-3 bg-slate-200 rounded-full w-8" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (boards.length === 0) {
    return (
      <main className="p-8 max-w-3xl mx-auto text-center mt-20">
        <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">monitoring</span>
        <h2 className="font-bold text-slate-700 text-lg mb-1">No board yet</h2>
        <p className="text-slate-400 text-sm">Create a project first to see analytics.</p>
      </main>
    );
  }

  const { total, doneCards, byCriticality, byColumn, byAssignee } = stats;
  const completionPct = pct(doneCards, total);

  return (
    <>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[150px]" />
      </div>

      <main className="p-4 md:p-8 pb-24 md:pb-12 max-w-5xl mx-auto">

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <nav className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Analytics</nav>
            <h1 className="font-display text-2xl font-black text-slate-900">
              {selectedBoard?.title ?? "—"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">{total} cards · {acceptedMembers} members</p>
          </div>

          {/* Board selector */}
          <div className="flex flex-wrap gap-2">
            {boards.map((b) => (
              <button
                key={b.id}
                onClick={() => handleBoardChange(b.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  b.id === selectedBoardId
                    ? "bg-primary text-white shadow-md shadow-primary/25"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary"
                }`}
              >
                {b.title}
              </button>
            ))}
          </div>
        </header>

        {total === 0 ? (
          <div className="glass-card rounded-[20px] p-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">inbox</span>
            <p className="text-slate-500 font-medium">No cards yet on this board.</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* ── Stat Cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon="check_circle"
                label="Completenan"
                value={`${completionPct}%`}
                sub={`${doneCards} / ${total} kart`}
                accent="bg-green-50 text-green-600"
              />
              <StatCard
                icon="pending"
                label="Devam Eden"
                value={total - doneCards}
                sub="kart aktif"
                accent="bg-blue-50 text-blue-600"
              />
              <StatCard
                icon="priority_high"
                label="Acil + High"
                value={byCriticality.urgent + byCriticality.high}
                sub="priority cards"
                accent={
                  byCriticality.urgent + byCriticality.high > 0
                    ? "bg-red-50 text-red-600"
                    : "bg-slate-50 text-slate-500"
                }
              />
              <StatCard
                icon="group"
                label="Members"
                value={acceptedMembers}
                sub={`${members.filter(m => m.status === "pending").length} beklemede`}
                accent="bg-purple-50 text-purple-600"
              />
            </div>

            {/* ── Middle row ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Column distribution */}
              <SectionCard title="Column Distribution" icon="view_kanban">
                {byColumn.length === 0 ? (
                  <p className="text-sm text-slate-400">No columns.</p>
                ) : (
                  <div className="space-y-3">
                    {byColumn.map((col) => (
                      <BarRow
                        key={col.id}
                        label={col.title}
                        count={col.count}
                        total={total}
                        colorClass={col.isDone ? "bg-green-400" : "bg-primary"}
                      />
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Priority breakdown */}
              <SectionCard title="Priority Distribution" icon="flag">
                <div className="space-y-3">
                  {(["urgent", "high", "medium", "low", "none"] as PriorityKey[]).map((key) => {
                    const count = byCriticality[key];
                    const meta = PRIORITY_META[key];
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 w-24 flex-shrink-0`}>
                          <div className={`w-2.5 h-2.5 rounded-full ${meta.color}`} />
                          <span className={`text-xs font-semibold ${meta.text}`}>{meta.label}</span>
                        </div>
                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${meta.color}`}
                            style={{ width: `${pct(count, total)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Priority legend pills */}
                <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100">
                  {(["urgent", "high", "medium", "low", "none"] as PriorityKey[]).map((key) => {
                    const count = byCriticality[key];
                    if (count === 0) return null;
                    const meta = PRIORITY_META[key];
                    return (
                      <span key={key} className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${meta.light} ${meta.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.color}`} />
                        {meta.label}: {count}
                      </span>
                    );
                  })}
                </div>
              </SectionCard>
            </div>

            {/* ── Assignee Workload ──────────────────────────────────────── */}
            <SectionCard title="Assignee Workload" icon="person_check">
              {byAssignee.length === 0 ? (
                <p className="text-sm text-slate-400">No cards are assigned.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  {byAssignee.map(([email, count]) => {
                    const initial = email === "Unassigned" ? "?" : email.charAt(0).toUpperCase();
                    const isUnassigned = email === "Unassigned";
                    return (
                      <div key={email} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 ${
                          isUnassigned ? "bg-slate-100 text-slate-400" : "bg-primary/10 text-primary"
                        }`}>
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-xs font-semibold text-slate-700 truncate max-w-[140px]">
                              {email}
                            </span>
                            <span className="text-xs font-bold text-slate-500 ml-2 flex-shrink-0">{count} kart</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${isUnassigned ? "bg-slate-300" : "bg-primary"}`}
                              style={{ width: `${pct(count, total)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* ── All Boards Summary ────────────────────────────────────── */}
            {boards.length > 1 && (
              <SectionCard title="All Projects" icon="dashboard">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {boards.map((b) => {
                    const isSelected = b.id === selectedBoardId;
                    return (
                      <button
                        key={b.id}
                        onClick={() => handleBoardChange(b.id)}
                        className={`p-3 rounded-xl border text-left transition-all hover:border-primary/30 ${
                          isSelected ? "border-primary/40 bg-primary/5" : "border-slate-200 bg-white/50"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black mb-2 ${
                          isSelected ? "bg-primary text-white" : "bg-primary/10 text-primary"
                        }`}>
                          {b.title.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate">{b.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(b.created_at).toLocaleDateString("en-US")}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {/* ── AI Evaluation ────────────────────────────────────── */}
            <div className="glass-card rounded-[20px] p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-purple-600">auto_awesome</span>
                  <h3 className="font-bold text-sm text-slate-800">AI Evaluation</h3>
                </div>
                {!boardLoading && (
                  <button
                    onClick={() => {
                      const selectedBoard = boards.find((b) => b.id === selectedBoardId);
                      const boardColumns = columns.filter((c) => c.board_id === selectedBoardId);
                      const activeSprint = sprints.find((s) => s.board_id === selectedBoardId && s.state === "active") ?? null;
                      getBoardInsights(selectedBoard?.title ?? "Board", boardColumns, activeSprint, members.length);
                    }}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:brightness-110 transition-all shadow-sm shadow-purple-500/20"
                  >
                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                    {boardInsights ? "Yenile" : "Analiz Et"}
                  </button>
                )}
              </div>
              <AIInsightsPanel
                insights={boardInsights}
                streamingText={streamingText}
                loading={boardLoading}
                error={boardError}
              />
            </div>

          </div>
        )}
      </main>
    </>
  );
}
