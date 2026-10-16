import { useState, useEffect } from "react";

// Decodes a JWT's payload WITHOUT verifying the signature — fine for reading
// your own token's claims on the client (the backend still verifies it
// properly on every request). Don't use this to trust data from someone else.
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function getCurrentUserId() {
  const token = localStorage.getItem("access_token");
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return payload?.sub ? parseInt(payload.sub, 10) : null;
}

export function isLoggedIn() {
  return !!localStorage.getItem("access_token");
}

// Call this instead of localStorage.setItem directly after a successful login —
// it also notifies the rest of the app (Navbar, Home, etc.) that auth state changed.
export function setToken(token) {
  localStorage.setItem("access_token", token);
  window.dispatchEvent(new Event("authchange"));
}

export function logout() {
  localStorage.removeItem("access_token");
  window.dispatchEvent(new Event("authchange"));
}

// React hook: gives components a live-updating logged-in status instead of a
// one-time check. Re-renders automatically whenever setToken()/logout() runs,
// anywhere in the app — no page refresh needed.
export function useAuthStatus() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());

  useEffect(() => {
    const handler = () => setLoggedIn(isLoggedIn());
    window.addEventListener("authchange", handler);
    return () => window.removeEventListener("authchange", handler);
  }, []);

  return loggedIn;
}