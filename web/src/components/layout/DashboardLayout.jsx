import { useRef, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import Sidebar from "./Sidebar";
import { IconMenu, IconLogOut, IconEdit } from "../icons";

const MOBILE_BREAKPOINT = 900;
const SWIPE_THRESHOLD = 50;

/**
 * Plain touch tracking, no gesture library. Only fires the given callback
 * once, on touchend, if the total horizontal drag past SWIPE_THRESHOLD.
 * Ignored above MOBILE_BREAKPOINT — the sidebar is always visible there, so
 * there's nothing for a swipe to open or close.
 */
function useSwipe(direction, onSwipe) {
  const startX = useRef(null);
  const deltaX = useRef(0);

  function onTouchStart(event) {
    if (window.innerWidth >= MOBILE_BREAKPOINT) return;
    startX.current = event.touches[0].clientX;
    deltaX.current = 0;
  }

  function onTouchMove(event) {
    if (startX.current === null) return;
    deltaX.current = event.touches[0].clientX - startX.current;
  }

  function onTouchEnd() {
    if (startX.current === null) return;
    const passedThreshold =
      direction === "right" ? deltaX.current >= SWIPE_THRESHOLD : deltaX.current <= -SWIPE_THRESHOLD;
    if (passedThreshold) onSwipe();
    startX.current = null;
  }

  return { onTouchStart, onTouchMove, onTouchEnd };
}

/**
 * Avatar in the topbar — pure navigation affordance to /profile now (photo
 * upload/crop/remove lives there). Hover zooms the photo slightly and fades
 * in an edit-pencil overlay so it visibly reads as "click to edit," using
 * Tailwind's group/group-hover — no JS state needed for the hover effect
 * itself.
 */
function ProfileAvatarLink({ user }) {
  const displayName = user?.last_name || user?.username || "";
  const initial = displayName ? displayName.charAt(0).toUpperCase() : "?";

  return (
    <Link
      to="/profile"
      aria-label="View profile"
      className="group relative flex h-[34px] w-[34px] shrink-0 overflow-hidden rounded-full bg-navy text-sm font-semibold text-white"
    >
      <span className="flex h-full w-full items-center justify-center transition-transform duration-200 group-hover:scale-110">
        {user?.photo_url ? (
          <img src={user.photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </span>
      <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100 [&>svg]:h-4 [&>svg]:w-4">
        <IconEdit />
      </span>
    </Link>
  );
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const openSwipeHandlers = useSwipe("right", () => setSidebarOpen(true));
  const closeSwipeHandlers = useSwipe("left", () => setSidebarOpen(false));

  const displayName = user?.last_name || user?.username || "";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      {!sidebarOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-y-0 left-0 z-40 w-5 nav:hidden"
          {...openSwipeHandlers}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} swipeHandlers={closeSwipeHandlers} />

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 cursor-pointer border-none bg-[#0f1126]/40 p-0"
          onClick={() => setSidebarOpen(false)}
          {...closeSwipeHandlers}
        />
      )}

      <div className="flex flex-1 min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-surface px-6">
          <button
            type="button"
            className="flex items-center justify-center rounded-sm p-2 text-foreground hover:bg-background nav:hidden [&>svg]:h-[22px] [&>svg]:w-[22px]"
            aria-label="Toggle navigation"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <IconMenu />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2.5">
            <ProfileAvatarLink user={user} />
            <span className="text-sm font-medium text-foreground">{displayName}</span>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-danger-dark [&>svg]:h-[18px] [&>svg]:w-[18px]"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
            >
              <IconLogOut />
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 nav:px-8 nav:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
