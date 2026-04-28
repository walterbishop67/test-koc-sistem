import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import AuthPage from "./components/AuthPage";
import BoardList from "./components/BoardList";
import ProjectsOverview from "./components/ProjectsOverview";
import ProjectDetail from "./components/ProjectDetail";
import BoardView from "./components/BoardView";
import BoardSettings from "./components/BoardSettings";
import TeamPage from "./components/TeamPage";
import AnalyticsPage from "./components/AnalyticsPage";
import ArchivePage from "./components/ArchivePage";
import ProfilePage from "./components/ProfilePage";
import AppLayout from "./components/AppLayout";
import { useBoardStore } from "./store/useBoardStore";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("taskflow_token");
    setAuthed(!!token);
    setChecked(true);
  }, []);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  return authed ? <>{children}</> : <Navigate to="/login" replace />;
}

function DashboardRedirect() {
  const navigate = useNavigate();
  const fetchBoards = useBoardStore((s) => s.fetchBoards);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const boards = await fetchBoards();
        if (cancelled) return;
        if (boards.length > 0) {
          navigate(`/board/${boards[0].id}`, { replace: true });
        } else {
          navigate("/projects", { replace: true });
        }
      } catch {
        if (!cancelled) navigate("/projects", { replace: true });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [fetchBoards, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
    </div>
  );
}

function BoardViewKeyed() {
  const { boardId } = useParams<{ boardId: string }>();
  return <BoardView key={boardId} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />

      {/* All authenticated pages share the persistent AppLayout */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardRedirect />} />
        <Route path="/projects" element={<ProjectsOverview />} />
        <Route path="/projects/:projectId" element={<ProjectDetail />} />
        <Route path="/board/:boardId" element={<BoardViewKeyed />} />
        <Route path="/board/:boardId/list" element={<BoardList />} />
        <Route path="/board/:boardId/settings" element={<BoardSettings />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
