import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBoardStore } from "../store/useBoardStore";

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

export default function ArchivePage() {
  const navigate = useNavigate();
  const { archivedBoards, fetchArchivedBoards, unarchiveBoard } = useBoardStore();
  const [unarchiving, setUnarchiving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchivedBoards().finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUnarchive = async (id: string) => {
    setUnarchiving(id);
    try {
      await unarchiveBoard(id);
    } finally {
      setUnarchiving(null);
    }
  };

  return (
    <main className="p-4 md:p-section-margin max-w-7xl mx-auto">
      <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-slate-400 text-xs mb-2 font-headline-md uppercase tracking-widest">
            <span className="text-primary font-bold">Archive</span>
          </nav>
          <h1 className="font-display text-2xl md:text-display text-slate-900">Archive</h1>
          <p className="text-slate-500 font-body-md mt-1 md:mt-2 text-sm md:text-base">
            {archivedBoards.length > 0
              ? `${archivedBoards.length} archived projects`
              : "No archived projects yet."}
          </p>
        </div>

        <button
          onClick={() => navigate("/projects")}
          className="px-5 py-3 bg-white border border-slate-200 rounded-xl font-headline-md text-sm font-bold text-slate-900 hover:bg-slate-50 transition-all flex items-center gap-2 w-fit"
        >
          <span className="material-symbols-outlined text-sm">folder_open</span>
          Active Projeler
        </button>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-row rounded-[24px] p-6 flex flex-col gap-4 animate-pulse">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                <div className="h-6 w-16 bg-slate-200 rounded-full" />
              </div>
              <div>
                <div className="h-5 bg-slate-200 rounded-full w-3/4 mb-2" />
                <div className="h-3 bg-slate-200 rounded-full w-1/3" />
              </div>
              <div className="h-10 bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      ) : archivedBoards.length === 0 ? (
        <section className="glass-row rounded-[24px] p-8 md:p-12 text-center border border-dashed border-slate-300/60">
          <span className="material-symbols-outlined text-5xl text-slate-300 mb-3 block">inventory_2</span>
          <h2 className="font-display text-2xl text-slate-900 mb-2">Archive is empty</h2>
          <p className="text-slate-500 mb-6 max-w-lg mx-auto">
            To archive a project, use Project Settings → Danger Zone.
          </p>
          <button
            onClick={() => navigate("/projects")}
            className="px-6 py-3 bg-primary text-white rounded-xl font-headline-md text-sm font-bold shadow-lg shadow-primary/20"
          >
            Back to Projects
          </button>
        </section>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {archivedBoards.map((board) => (
            <div
              key={board.id}
              className="glass-row rounded-[24px] p-6 flex flex-col gap-4 opacity-80 hover:opacity-100 transition-opacity"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 font-black text-base flex-shrink-0">
                  {boardInitials(board.title)}
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                  <span className="material-symbols-outlined text-[12px]">inventory_2</span>
                  Archive
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-headline-md text-base font-black text-slate-900 truncate mb-1">
                  {board.title}
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  {formatDate(board.created_at)}
                </p>
              </div>

              <button
                onClick={() => handleUnarchive(board.id)}
                disabled={unarchiving === board.id}
                className="w-full py-2.5 bg-white border border-slate-200 rounded-xl font-headline-md text-sm font-bold text-slate-700 hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">unarchive</span>
                {unarchiving === board.id ? "Restoring..." : "Restore from Archive"}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
