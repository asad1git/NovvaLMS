import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Frontend-side route guard. This is a UX convenience only — the real
 * security boundary is the backend's RBAC middleware. Even if someone
 * bypassed this component entirely, every API call would still be
 * rejected server-side for the wrong role.
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { auth } = useAuth();

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    return <Navigate to={`/${auth.role}`} replace />;
  }

  return children;
}
