import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { login as loginRequest, getMe } from "../api/auth";
import { setUnauthorizedHandler } from "../api/client";

const AuthContext = createContext(null);

const TOKEN_KEY = "access_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  useEffect(() => {
    async function restoreSession() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setStatus("unauthenticated");
        return;
      }
      try {
        const me = await getMe();
        setUser(me);
        setStatus("authenticated");
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setStatus("unauthenticated");
      }
    }
    restoreSession();
  }, []);

  async function login(username, password) {
    const result = await loginRequest(username, password);
    localStorage.setItem(TOKEN_KEY, result.access_token);
    const me = await getMe();
    setUser(me);
    setStatus("authenticated");
    return me;
  }

  async function refreshUser() {
    const me = await getMe();
    setUser(me);
    return me;
  }

  // Patches just photo_url in place after PUT/DELETE /me/photo — both
  // already hand back everything needed (the new URL, or nothing on
  // delete), so a full /auth/me refetch would be redundant.
  function updatePhotoUrl(photoUrl) {
    setUser((prev) => (prev ? { ...prev, photo_url: photoUrl } : prev));
  }

  return (
    <AuthContext.Provider
      value={{ user, status, login, logout, refreshUser, updatePhotoUrl }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
