import { useEffect, useState } from "react";
import { useTeamStore } from "../store/useTeamStore";
import { Skeleton } from "./ui/Skeleton";
import UserPickerModal from "./UserPickerModal";
import type { Team } from "../types";
import { getTokenUserId } from "../utils/auth";

function TeamCard({ team }: { team: Team }) {
  const { teamMembers, fetchTeamMembers, addTeamMember, removeTeamMember, deleteTeam } =
    useTeamStore();

  const [expanded, setExpanded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const members = teamMembers[team.id] ?? [];
  const isLoadingMembers = expanded && teamMembers[team.id] === undefined;
  const currentUserId = getTokenUserId();
  const isOwner = currentUserId === team.owner_id;

  useEffect(() => {
    if (expanded && !teamMembers[team.id]) fetchTeamMembers(team.id);
  }, [expanded, team.id, teamMembers, fetchTeamMembers]);

  const handleAdd = async (email: string) => {
    await addTeamMember(team.id, email);
  };

  return (
    <div className="glass-row rounded-[24px] overflow-hidden">
      <div className="flex items-center gap-4 p-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
          {team.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-headline-md text-sm font-bold text-slate-900 truncate">{team.name}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {teamMembers[team.id] ? `${members.length} members` : "Expand to view members"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
            title={expanded ? "Close" : "Show members"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {expanded ? "expand_less" : "expand_more"}
            </span>
          </button>
          {isOwner && (
            <button
              onClick={() => { if (confirm(`Are you sure you want to delete "${team.name}" team?`)) deleteTeam(team.id); }}
              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Delete team"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          {isLoadingMembers ? (
            <div className="flex flex-wrap gap-2 mb-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-7 w-24 rounded-full" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-3">No members yet</p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-3">
              {members.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center gap-1.5 rounded-full pl-3 pr-1 py-1 text-sm ${
                    m.status === "pending"
                      ? "bg-amber-50 border border-amber-200 text-amber-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <span className={`material-symbols-outlined text-[14px] ${m.status === "pending" ? "text-amber-400" : "text-slate-400"}`}>
                    {m.status === "pending" ? "schedule" : "person"}
                  </span>
                  <span className="text-xs font-medium">{m.email}</span>
                  {m.status === "pending" && (
                    <span className="text-[9px] font-bold uppercase tracking-wide text-amber-500 px-1">pending</span>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => removeTeamMember(team.id, m.id)}
                      className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-500 text-slate-400 transition-all"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isOwner && (
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary-container font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Add member
            </button>
          )}

          {showPicker && (
            <UserPickerModal
              existingEmails={members.map((m) => m.email)}
              onSelect={handleAdd}
              onClose={() => setShowPicker(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function TeamPage() {
  const { teams, fetchTeams, createTeam } = useTeamStore();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);

  useEffect(() => {
    fetchTeams().finally(() => setLoadingTeams(false));
  }, [fetchTeams]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createTeam(newName.trim());
      setNewName("");
      setShowNew(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-surface-container-highest/30 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] rounded-full bg-secondary-fixed/20 blur-[150px]" />
      </div>

      <main className="p-4 md:p-8 pb-24 md:pb-8 max-w-3xl mx-auto">
        <header className="flex items-end justify-between mb-8">
          <div>
            <nav className="flex items-center gap-2 text-slate-400 text-xs mb-2 font-headline-md uppercase tracking-widest">
              <span className="text-primary font-bold">Team</span>
            </nav>
            <h1 className="font-display text-headline-lg text-on-surface">Teams</h1>
            <p className="text-on-surface-variant font-body-md mt-1">
              {teams.length} team
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-headline-md text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">group_add</span>
            New Team
          </button>
        </header>

        {loadingTeams ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-row rounded-[24px] p-5 flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 rounded-lg" />
                  <Skeleton className="h-3 w-20 rounded-lg" />
                </div>
                <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="glass-row rounded-[24px] p-12 text-center border border-dashed border-slate-300/60">
            <span className="material-symbols-outlined text-5xl text-primary mb-3 block">groups</span>
            <h2 className="font-display text-xl text-slate-900 mb-2">No teams yet</h2>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto text-sm">
              Create a team, add members, and assign them in bulk when creating a board.
            </p>
            <button
              onClick={() => setShowNew(true)}
              className="px-6 py-3 bg-primary text-white rounded-xl font-headline-md text-sm font-bold shadow-lg shadow-primary/20"
            >
              Create First Team
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => <TeamCard key={team.id} team={team} />)}
          </div>
        )}
      </main>

      {showNew && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center"
          onClick={() => setShowNew(false)}
        >
          <div
            className="glass-card rounded-t-[24px] sm:rounded-[24px] p-6 sm:p-8 w-full sm:max-w-md"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5 sm:hidden" />
            <h2 className="font-headline-md text-headline-md text-on-surface mb-6">New Team</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block font-label-caps text-label-caps text-slate-500 mb-2">
                  Team Name
                </label>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Frontend Team"
                  className="w-full bg-white/50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-on-surface"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-headline-md font-bold hover:bg-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNew(false); setNewName(""); }}
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
