import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card, Column } from "../types";
import SortableCard from "./SortableCard";
import { useBoardStore } from "../store/useBoardStore";

interface Props {
  column: Column;
  onOpenCard: (card: Card) => void;
  cardDragDisabled?: boolean;
}

// Badge colors per column index — same style as HTML
const COLUMN_BADGE: { bg: string; text: string }[] = [
  { bg: "bg-slate-200/50", text: "text-slate-500" },
  { bg: "bg-blue-100",     text: "text-blue-600"  },
  { bg: "bg-orange-100",   text: "text-orange-600" },
  { bg: "bg-green-100",    text: "text-green-600"  },
  { bg: "bg-purple-100",   text: "text-purple-600" },
];

function ColumnHeader({ column }: { column: Column }) {
  const { renameColumn, deleteColumn, columns } = useBoardStore();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [menuOpen, setMenuOpen] = useState(false);

  const idx = Math.max(0, columns.findIndex((c) => c.id === column.id));
  const badge = COLUMN_BADGE[idx % COLUMN_BADGE.length];

  const save = () => {
    if (title.trim() && title !== column.title) renameColumn(column.id, title.trim());
    else setTitle(column.title);
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between w-full group">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") { setTitle(column.title); setEditing(false); }
            }}
            className="text-sm font-semibold border border-[#F9423A]/30 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#F9423A]/20 bg-white w-36"
          />
        ) : (
          <h2
            className="font-headline-md text-sm font-semibold text-slate-800 cursor-pointer hover:text-[#F9423A] transition-colors truncate"
            onDoubleClick={() => setEditing(true)}
          >
            {column.title}
          </h2>
        )}
        <span className={`text-sm ${badge.bg} ${badge.text} px-2 py-0.5 rounded-full font-semibold flex-shrink-0`}>
          {column.cards.length}
        </span>
      </div>
      {/* Dropdown menu */}
      <div className="relative flex-shrink-0">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 text-slate-300 hover:text-[#F9423A] hover:bg-[#F9423A]/5 rounded-lg transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">more_horiz</span>
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-8 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setMenuOpen(false); setEditing(true); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-slate-400">edit</span>
              Rename
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                if (confirm(`"${column.title}" Are you sure you want to delete this column?`)) deleteColumn(column.id);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddCardForm({ columnId, onDone }: { columnId: string; onDone: () => void }) {
  const { createCard } = useBoardStore();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      await createCard(columnId, title.trim());
      setTitle("");
      onDone();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass-card rounded-[20px] p-4">
      <textarea
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e as unknown as React.FormEvent); }
          if (e.key === "Escape") onDone();
        }}
        placeholder="Task title..."
        rows={2}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9423A]/20 resize-none bg-white/70"
      />
      <div className="flex gap-2 mt-2">
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="bg-[#F9423A] text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors font-medium"
        >
          Add
        </button>
        <button type="button" onClick={onDone} className="text-slate-500 hover:text-slate-800 text-xs px-2 py-1.5 rounded-lg">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function SortableColumn({ column, onOpenCard, cardDragDisabled = false }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id, data: { type: "column", column } });
  const { boards } = useBoardStore();
  const boardPrefix = (boards.find((b) => b.id === column.board_id)?.title ?? "").slice(0, 2).toUpperCase() || "??";

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `col-drop-${column.id}`,
    data: { type: "column", columnId: column.id },
  });

  const [showAddCard, setShowAddCard] = useState(false);

  return (
    <div
      ref={setSortableRef}
      data-column-id={column.id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`space-y-6 flex-shrink-0 w-72 transition-opacity ${isDragging ? "opacity-40" : ""}`}
    >
      {/* Column header — drag handle */}
      <div
        {...attributes}
        {...listeners}
        style={{ touchAction: 'none' }}
        className="flex items-center justify-between px-2 cursor-grab active:cursor-grabbing"
      >
        <ColumnHeader column={column} />
      </div>

      {/* Cards area — dedicated droppable for card drops */}
      <div
        ref={setDropRef}
        className={`kanban-column space-y-4 rounded-3xl p-2 transition-all min-h-[120px] ${
          isOver
            ? "bg-[#F9423A]/5 ring-2 ring-[#F9423A]/20"
            : "bg-slate-100/30"
        }`}
      >
        <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <SortableCard key={card.id} card={card} onOpen={onOpenCard} dragDisabled={cardDragDisabled} boardPrefix={boardPrefix} />
          ))}
        </SortableContext>

        {column.cards.length === 0 && !isOver && !showAddCard && (
          <div className="flex items-center justify-center py-6">
            <p className="text-xs text-slate-400">No tasks — drag or add one</p>
          </div>
        )}

        {showAddCard ? (
          <AddCardForm columnId={column.id} onDone={() => setShowAddCard(false)} />
        ) : (
          <button
            onClick={() => setShowAddCard(true)}
            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[24px] text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-white/40 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            <span className="font-medium">Add Task</span>
          </button>
        )}
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="glass-card p-5 rounded-[24px] animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="h-4 bg-slate-200 rounded-full w-16" />
        <div className="h-4 bg-slate-200 rounded w-4" />
      </div>
      <div className="h-4 bg-slate-200 rounded-full w-3/4 mb-2" />
      <div className="h-3 bg-slate-200 rounded-full w-full mb-1.5" />
      <div className="h-3 bg-slate-200 rounded-full w-2/3 mb-4" />
      <div className="flex justify-between items-center">
        <div className="h-3 bg-slate-200 rounded-full w-10" />
        <div className="w-6 h-6 bg-slate-200 rounded-full" />
      </div>
    </div>
  );
}

export function ColumnSkeleton() {
  return (
    <div className="space-y-6 flex-shrink-0 w-72">
      <div className="flex items-center gap-2 px-2">
        <div className="h-4 bg-slate-200 rounded-full w-24 animate-pulse" />
        <div className="h-5 w-7 bg-slate-200 rounded-full animate-pulse" />
      </div>
      <div className="kanban-column space-y-4 rounded-3xl p-2 bg-slate-100/30 min-h-[120px]">
        {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  );
}

// Overlay for drag ghost
export default function KanbanColumnOverlay({ column }: { column: Column }) {
  return (
    <div className="space-y-6 flex-shrink-0 w-72 opacity-90 rotate-1">
      <div className="px-2">
        <h2 className="font-headline-md text-sm font-semibold text-slate-800">
          {column.title}
          <span className="ml-2 text-sm bg-slate-200/50 text-slate-500 px-2 py-0.5 rounded-full">
            {column.cards.length}
          </span>
        </h2>
      </div>
      <div className="kanban-column rounded-3xl p-2 bg-slate-100/30 space-y-4 ring-2 ring-[#F9423A]/30">
        {column.cards.slice(0, 3).map((card) => (
          <div key={card.id} className="glass-card px-4 py-3 rounded-[20px]">
            <p className="text-sm text-slate-800 font-semibold">{card.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
