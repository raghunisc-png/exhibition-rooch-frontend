import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { agent, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Loading…</div>
    );
  }

  if (!agent) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
