import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBoardStore } from "../store/useBoardStore";

export default function BoardSettings() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { boards, columns, fetchBoards, fetchColumns, updateBoard, deleteBoard, archiveBoard, renameColumn, deleteColumn, createColumn } = useBoardStore();

  const board = boards.find((b) => b.id === boardId);
  const boardColumns = columns.filter((c) => c.board_id === boardId);

  const [title, setTitle] = useState(board?.title ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingColTitle, setEditingColTitle] = useState("");
  const [addingCol, setAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!boards.length) fetchBoards();
  }, [boards.length, fetchBoards]);

  useEffect(() => {
    if (boardId) fetchColumns(boardId);
  }, [boardId, fetchColumns]);

  useEffect(() => {
    if (board) setTitle(board.title);
  }, [board?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editingColId) editInputRef.current?.focus();
  }, [editingColId]);

  const handleSave = async () => {
    if (!boardId || !title.trim() || title.trim() === board?.title) return;
    setSaving(true);
    try {
      await updateBoard(boardId, title.trim());
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setTitle(board?.title ?? "");
  };

  const handleDeleteBoard = async () => {
    if (!boardId) return;
    setDeleting(true);
    try {
      await deleteBoard(boardId);
      navigate("/");
    } finally {
      setDeleting(false);
    }
  };

  const handleArchiveBoard = async () => {
    if (!boardId) return;
    setArchiving(true);
    try {
      await archiveBoard(boardId);
      navigate("/projects");
    } finally {
      setArchiving(false);
    }
  };

  const startEditCol = (id: string, currentTitle: string) => {
    setEditingColId(id);
    setEditingColTitle(currentTitle);
  };

  const commitColRename = async () => {
    if (!editingColId || !editingColTitle.trim()) {
      setEditingColId(null);
      return;
    }
    const col = boardColumns.find((c) => c.id === editingColId);
    if (col && editingColTitle.trim() !== col.title) {
      await renameColumn(editingColId, editingColTitle.trim());
    }
    setEditingColId(null);
  };

  const handleDeleteCol = async (colId: string) => {
    if (!window.confirm("Are you sure you want to delete this column?")) return;
    await deleteColumn(colId);
  };

  const handleAddCol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColTitle.trim() || !boardId) return;
    setAddingCol(true);
    try {
      await createColumn(boardId, newColTitle.trim());
      setNewColTitle("");
    } finally {
      setAddingCol(false);
    }
  };

  const isDirty = title.trim() !== (board?.title ?? "");

  return (
    <>
      {/* Background blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main */}
      <main className="p-4 md:p-12 pb-32">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12">
            <h1 className="font-display text-display text-on-surface mb-2">Project Settings</h1>
            <p className="font-body-lg text-slate-500">
              Configure settings for {board?.title}.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">

              {/* General Information */}
              <section className="bg-white/70 backdrop-blur-md border border-slate-200/50 rounded-[24px] p-8 shadow-[0_20px_40px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">tune</span>
                  </div>
                  <h2 className="font-headline-md text-headline-md">General Information</h2>
                </div>

                <div className="space-y-6">
                  <div className="relative">
                    <label className="absolute -top-2 left-3 px-1 bg-white text-xs font-bold text-slate-500 tracking-wider z-10">
                      PROJECT NAME
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-secondary focus:border-transparent transition-all font-body-md outline-none bg-white"
                    />
                  </div>
                </div>
              </section>

              {/* Workflow Engine */}
              <section className="bg-white/70 backdrop-blur-md border border-slate-200/50 rounded-[24px] overflow-hidden shadow-[0_20px_40px_rgba(15,23,42,0.04)]">
                <div className="bg-slate-900/5 p-6 border-b border-slate-200/50 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined">account_tree</span>
                    </div>
                    <h2 className="font-headline-md text-headline-md">Workflow Engine</h2>
                  </div>
                  <button
                    onClick={() => setAddingCol((v) => !v)}
                    className="text-secondary font-bold text-sm hover:underline"
                  >
                    {addingCol ? "Cancel" : "Add Column"}
                  </button>
                </div>

                <div className="p-8 space-y-3">
                  {boardColumns.map((col) => (
                    <div
                      key={col.id}
                      className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-slate-100 hover:border-secondary/30 transition-all group"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <span className="material-symbols-outlined text-slate-300">drag_indicator</span>
                        {editingColId === col.id ? (
                          <input
                            ref={editInputRef}
                            value={editingColTitle}
                            onChange={(e) => setEditingColTitle(e.target.value)}
                            onBlur={commitColRename}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitColRename();
                              if (e.key === "Escape") setEditingColId(null);
                            }}
                            className="flex-1 px-3 py-1 rounded-lg border border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 text-sm font-medium"
                          />
                        ) : (
                          <span className="font-medium text-slate-800 truncate">{col.title}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all ml-4">
                        <button
                          onClick={() => startEditCol(col.id, col.title)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCol(col.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {addingCol && (
                    <form onSubmit={handleAddCol} className="flex gap-3 mt-2">
                      <input
                        autoFocus
                        type="text"
                        value={newColTitle}
                        onChange={(e) => setNewColTitle(e.target.value)}
                        placeholder="Column name..."
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-secondary focus:border-transparent outline-none text-sm font-medium"
                      />
                      <button
                        type="submit"
                        disabled={!newColTitle.trim()}
                        className="px-6 py-3 bg-secondary text-white rounded-xl font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50"
                      >
                        Add
                      </button>
                    </form>
                  )}

                  {boardColumns.length === 0 && !addingCol && (
                    <p className="text-center text-slate-400 text-sm py-6">
                      No columns yet. Add one above.
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <section className="bg-red-50/30 backdrop-blur-md border border-red-100 rounded-[24px] p-8 shadow-[0_20px_40px_rgba(15,23,42,0.04)]">
                <h2 className="font-label-caps text-label-caps text-red-600 mb-6 tracking-widest">
                  DANGER ZONE
                </h2>
                <div className="space-y-4">
                  <button
                    onClick={handleArchiveBoard}
                    disabled={archiving}
                    className="w-full py-4 px-4 bg-white border border-amber-100 rounded-xl text-amber-600 font-bold text-sm hover:bg-amber-500 hover:text-white transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{archiving ? "Archiving..." : "Archive Board"}</span>
                    <span className="material-symbols-outlined opacity-50 group-hover:opacity-100">inventory_2</span>
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-4 px-4 bg-white border border-red-100 rounded-xl text-red-600 font-bold text-sm hover:bg-red-600 hover:text-white transition-all flex items-center justify-between group"
                  >
                    <span>Delete Board</span>
                    <span className="material-symbols-outlined opacity-50 group-hover:opacity-100">delete_forever</span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky save footer */}
      <footer
        className="fixed bottom-0 md:bottom-8 left-0 md:left-64 right-0 md:right-8 z-40 px-4 md:px-8 pb-4 md:pb-0"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-6xl mx-auto bg-white/70 backdrop-blur-md border border-slate-200/50 rounded-[20px] p-4 flex justify-between items-center shadow-2xl">
          <p className="text-sm font-medium text-slate-500 px-4">
            {isDirty ? "You have unsaved changes." : "All changes saved."}
          </p>
          <div className="flex gap-4">
            <button
              onClick={handleDiscard}
              disabled={!isDirty}
              className="px-8 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="px-10 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:scale-105 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </footer>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-8"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-[24px] p-8 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-red-600">warning</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-slate-900 mb-2">Delete Project</h2>
            <p className="text-slate-500 font-body-md mb-8">
              Are you sure you want to permanently delete <strong>"{board?.title}"</strong> and all its columns and cards? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteBoard}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
