/**
 * The single source of truth for "can this user do X." Mirrors the
 * backend's own check (`require_permission` on every route) — this is UX
 * only, hiding buttons/nav/pages the backend would refuse anyway, never
 * the real security boundary. See API_REFERENCE.md's auth section.
 */
export function hasPermission(user, moduleName, action) {
  if (!user) return false;
  return user.permissions.some((p) => p.module === moduleName && p.action === action);
}

export function hasAnyPermission(user, moduleName) {
  if (!user) return false;
  return user.permissions.some((p) => p.module === moduleName);
}
