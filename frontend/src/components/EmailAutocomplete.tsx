import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";

interface UserResult {
  id: string;
  email: string;
  full_name?: string | null;
}

interface Props {
  value: string;
  onChange: (email: string) => void;
  onSelect?: (email: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
}

export default function EmailAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "ornek@sirket.com",
  inputClassName = "",
  autoFocus = false,
}: Props) {
  const [results, setResults] = useState<UserResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    try {
      const { data } = await api.get<UserResult[]>("/users/search", { params: { q, limit: 8 } });
      setResults(data);
      setOpen(data.length > 0);
      setActiveIdx(-1);
    } catch {
      setResults([]);
      setOpen(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 250);
  };

  const handleSelect = (email: string) => {
    onChange(email);
    setOpen(false);
    setResults([]);
    if (onSelect) onSelect(email);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(results[activeIdx].email);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const initial = (u: UserResult) =>
    (u.full_name?.charAt(0) ?? u.email.charAt(0)).toUpperCase();

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        type="email"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClassName}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-[200] left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {results.map((u, i) => (
            <li
              key={u.id}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(u.email); }}
              onMouseEnter={() => setActiveIdx(i)}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                i === activeIdx ? "bg-primary/10" : "hover:bg-slate-50"
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                {initial(u)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{u.email}</div>
                {u.full_name && (
                  <div className="text-xs text-slate-400 truncate">{u.full_name}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
