import { Navigate, Outlet } from "react-router-dom";

import { AppBoot } from "@/components/shared/AppBoot";
import { homePathFor, useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/types/database";

export function ProtectedRoute({ roles }: { roles: Role[] }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <AppBoot />;

  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/login" replace />;
  if (!roles.includes(profile.role))
    return <Navigate to={homePathFor(profile.role)} replace />;

  return <Outlet />;
}
