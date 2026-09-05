import axios from "axios";

const TOKEN_KEY = "access_token";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    // Free-tier ngrok shows an HTML "you are about to visit..." interstitial
    // to any client that hasn't clicked through it before, which breaks JSON
    // parsing here. This header skips it. Harmless against a non-ngrok URL.
    "ngrok-skip-browser-warning": "true",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized = null;

/**
 * Registered once by AuthProvider. Fires on any 401 from any request —
 * "Not authenticated" (no header) and "Invalid or expired token" (bad
 * header) are both treated the same: clear the session, bounce to login.
 */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);
