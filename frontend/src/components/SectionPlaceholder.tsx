import { useNavigate } from "react-router-dom";

type Props = {
  title: string;
  description: string;
};

export default function SectionPlaceholder({ title, description }: Props) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-64px)] text-on-background flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white/80 backdrop-blur p-8 text-center shadow-sm">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">
          Koc Sistem Kanban
        </p>
        <h1 className="text-3xl font-display text-slate-900 mb-3">{title}</h1>
        <p className="text-slate-600 mb-8">{description}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-lg bg-primary text-white font-semibold"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate("/projects")}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold bg-white"
          >
            Projects
          </button>
        </div>
      </div>
    </div>
  );
}
