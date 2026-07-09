import { Navigate, Outlet } from "react-router-dom";

import { homePathFor, useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/types/database";

export function ProtectedRoute({ role }: { role: Role }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        role="status"
        aria-label="Carregando"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role !== role) return <Navigate to={homePathFor(profile.role)} replace />;

  return <Outlet />;
}
