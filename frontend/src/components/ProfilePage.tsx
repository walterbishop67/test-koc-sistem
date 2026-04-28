import { useEffect, useState } from "react";
import { api } from "../api/client";
import { emailInitial } from "../utils/auth";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    api
      .get<Profile>("/users/me")
      .then((res) => {
        setProfile(res.data);
        setFullName(res.data.full_name ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!fullName.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.patch<Profile>("/users/me", { full_name: fullName.trim() });
      setProfile(res.data);
      setMessage({ type: "success", text: "Profile updated" });
    } catch {
      setMessage({ type: "error", text: "Update failed, try again" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-lg mx-auto">
      <h1 className="font-headline-md text-xl font-bold text-slate-900 mb-6">Profil</h1>

      <div className="glass-row rounded-[24px] p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {emailInitial(profile?.email ?? null)}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{profile?.full_name || "—"}</p>
            <p className="text-xs text-slate-400 mt-0.5">{profile?.email}</p>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* E-posta (salt okunur) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            E-posta
          </label>
          <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100/60 rounded-xl text-sm text-slate-500 select-none">
            <span className="material-symbols-outlined text-[16px] text-slate-400">mail</span>
            {profile?.email}
          </div>
        </div>

        {/* Ad Soyad */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Ad Soyad
          </label>
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              className="flex-1 text-sm text-slate-800 bg-transparent outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
        </div>

        {/* Mesaj */}
        {message && (
          <div
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${
              message.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {message.type === "success" ? "check_circle" : "error"}
            </span>
            {message.text}
          </div>
        )}

        {/* Kaydet */}
        <button
          onClick={handleSave}
          disabled={saving || !fullName.trim()}
          className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-sm">save</span>
          )}
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
