import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { hasPermission } from "./permissions";

export default function RequirePermission({ module, action, children }) {
  const { user } = useAuth();

  if (!hasPermission(user, module, action)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
