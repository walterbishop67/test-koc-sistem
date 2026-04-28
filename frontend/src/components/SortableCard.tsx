import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card, Label, Priority } from "../types";

interface Props {
  card: Card;
  onOpen: (card: Card) => void;
  isDragOverlay?: boolean;
  dragDisabled?: boolean;
  boardPrefix?: string;
}

const PRIORITY_STYLES: Record<Priority, { border: string; badge: string; icon: string }> = {
  urgent: { border: "border-l-red-500",    badge: "bg-red-50 text-red-500",      icon: "priority_high"  },
  high:   { border: "border-l-orange-400", badge: "bg-orange-50 text-orange-500", icon: "arrow_upward"   },
  medium: { border: "border-l-blue-400",   badge: "bg-blue-50 text-blue-500",    icon: "remove"         },
  low:    { border: "border-l-slate-300",  badge: "bg-slate-100 text-slate-400", icon: "arrow_downward" },
};

function AssigneeAvatar({ email }: { email: string }) {
  return (
    <div
      title={email}
      className="w-6 h-6 rounded-full bg-[#F9423A]/10 text-[#F9423A] flex items-center justify-center text-[10px] font-black flex-shrink-0"
    >
      {email.charAt(0).toUpperCase()}
    </div>
  );
}

function LabelBadge({ label }: { label: Label }) {
  return (
    <span
      style={{ background: label.color + "22", color: label.color, borderColor: label.color + "44" }}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
    >
      {label.name}
    </span>
  );
}

function DueDateBadge({ dueDate }: { dueDate: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86400000);

  let cls = "bg-green-50 text-green-600";
  let icon = "event_available";
  if (diffDays < 0) { cls = "bg-red-50 text-red-600"; icon = "event_busy"; }
  else if (diffDays <= 3) { cls = "bg-amber-50 text-amber-600"; icon = "schedule"; }

  const label = due.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>
      <span className="material-symbols-outlined text-[11px]">{icon}</span>
      {label}
    </span>
  );
}

export default function SortableCard({ card, onOpen, isDragOverlay = false, dragDisabled = false, boardPrefix }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", card },
    disabled: dragDisabled,
  });

  const pri = card.priority ? PRIORITY_STYLES[card.priority] : null;
  const borderCls = pri ? pri.border : "border-l-transparent";
  const commentCount = card.comment_count ?? 0;

  if (isDragOverlay) {
    return (
      <div className={`glass-card p-5 rounded-[24px] shadow-lg border-l-4 ${borderCls} cursor-grabbing rotate-1 opacity-90`}>
        <h3 className="font-bold text-slate-900 font-headline-md leading-tight">{card.title}</h3>
        {card.description && (
          <p className="text-slate-500 text-sm mt-2 line-clamp-2">{card.description}</p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`glass-card p-5 rounded-[24px] shadow-sm hover:shadow-md transition-all border-l-4 ${borderCls}
        ${dragDisabled ? "cursor-not-allowed opacity-90" : "cursor-grab active:scale-[0.98] active:ring-2 active:ring-[#F9423A]/20"}
        ${isDragging ? "opacity-40 ring-2 ring-[#F9423A]/30 ring-offset-1" : ""}`}
      onClick={() => !isDragging && onOpen(card)}
      {...attributes}
      {...(dragDisabled ? {} : listeners)}
    >
      {/* Top row: priority badge + drag handle */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-wrap gap-1.5">
          {card.card_number != null && boardPrefix && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400 font-mono">
              {boardPrefix}-{card.card_number}
            </span>
          )}
          {pri && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${pri.badge}`}>
              <span className="material-symbols-outlined text-[11px]">{pri.icon}</span>
              {card.priority!.toUpperCase()}
            </span>
          )}
          {card.sprint_id && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-600">
              <span className="material-symbols-outlined text-[11px]">sprint</span>
              Sprint
            </span>
          )}
          {card.labels?.map((l) => <LabelBadge key={l.id} label={l} />)}
        </div>
        <span
          className={`material-symbols-outlined text-[22px] flex-shrink-0 p-1 -m-1 rounded-lg select-none transition-colors
            ${dragDisabled
              ? "text-slate-200 cursor-not-allowed"
              : "text-slate-300 hover:text-slate-500"}`}
        >
          drag_indicator
        </span>
      </div>

      {/* Title */}
      <h3 className="font-bold text-slate-900 mb-2 font-headline-md leading-tight">
        {card.title}
      </h3>

      {/* Description */}
      {card.description && (
        <p className="text-slate-500 text-sm mb-3 line-clamp-2">{card.description}</p>
      )}

      {/* Due date */}
      {card.due_date && (
        <div className="mb-3">
          <DueDateBadge dueDate={card.due_date} />
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="material-symbols-outlined text-[16px]">chat_bubble_outline</span>
          <span className="text-xs">{commentCount}</span>
        </div>
        {card.assignee_email ? (
          <AssigneeAvatar email={card.assignee_email} />
        ) : (
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-slate-300 text-[14px]">person</span>
          </div>
        )}
      </div>
    </div>
  );
}
