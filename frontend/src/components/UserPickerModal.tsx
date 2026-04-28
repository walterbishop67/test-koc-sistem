import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import type { PagedUsers } from "../types";

interface Props {
  existingEmails: string[];
  onSelect: (email: string) => Promise<void>;
  onClose: () => void;
}

const PAGE_SIZE = 10;

export default function UserPickerModal({ existingEmails, onSelect, onClose }: Props) {
  const [data, setData] = useState<PagedUsers | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetch = useCallback(async (p: number, search: string) => {
    setLoading(true);
    try {
      const { data: res } = await api.get<PagedUsers>("/users", {
        params: { page: p, limit: PAGE_SIZE, q: search },
      });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch(1, "");
    inputRef.current?.focus();
  }, [fetch]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const handleSearch = (value: string) => {
    setQ(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetch(1, value), 300);
  };

  const handlePage = (next: number) => {
    setPage(next);
    fetch(next, q);
  };

  const handleSelect = async (email: string) => {
    setAdding(email);
    try {
      await onSelect(email);
      onClose();
    } finally {
      setAdding(null);
    }
  };

  const initial = (u: { full_name?: string | null; email: string }) =>
    (u.full_name?.charAt(0) ?? u.email.charAt(0)).toUpperCase();

  const modal = (
    <div
      className="fixed inset-0 bg-slate-900/45 backdrop-blur-md z-[90] flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-3xl bg-white rounded-t-[28px] sm:rounded-[28px] border border-slate-200 shadow-[0_30px_80px_rgba(15,23,42,0.22)] flex flex-col max-h-[88vh] overflow-hidden"
        style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 sm:px-7 pt-5 sm:pt-6 pb-3 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[19px]">person_add</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-headline-md text-base font-bold text-slate-900">Add People to Team</h2>
            <p className="text-xs text-slate-500 mt-0.5">Search, select, and add in one click</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 sm:px-7 pt-4 pb-3 sticky top-0 bg-white/95 backdrop-blur z-10">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-primary/15 focus-within:border-primary/30 transition-all">
            <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by email..."
              className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"
            />
            {q && (
              <button onClick={() => handleSearch("")} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-1.5 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <span className="material-symbols-outlined animate-spin text-[28px]">progress_activity</span>
            </div>
          ) : data?.items.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No users found</p>
          ) : (
            <ul className="space-y-2 py-1.5">
              {data?.items.map((u) => {
                const already = existingEmails.includes(u.email);
                const isAdding = adding === u.email;
                return (
                  <li key={u.id}>
                    <button
                      disabled={already || !!adding}
                      onClick={() => handleSelect(u.email)}
                      className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border text-left transition-all ${
                        already
                          ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                          : "bg-white border-slate-200 hover:border-primary/30 hover:bg-primary/[0.04] active:bg-primary/[0.07] cursor-pointer"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {isAdding ? (
                          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                        ) : (
                          initial(u)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-semibold text-slate-800 truncate">{u.email}</div>
                        {u.full_name && (
                          <div className="text-sm text-slate-500 truncate">{u.full_name}</div>
                        )}
                      </div>
                      {already ? (
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 bg-slate-200/70 px-3 py-1.5 rounded-xl">
                          Ekli
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm">
                          <span className="material-symbols-outlined text-[15px]">add</span>
                          Ekle
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 border-t border-slate-100 bg-slate-50/70">
            <button
              disabled={page <= 1 || loading}
              onClick={() => handlePage(page - 1)}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              Previous
            </button>
            <span className="text-xs text-slate-400">
              {page} / {data.total_pages}
              <span className="ml-1 text-slate-300">({data.total} users)</span>
            </span>
            <button
              disabled={page >= data.total_pages || loading}
              onClick={() => handlePage(page + 1)}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Sonraki
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
