// Reads the real EXPO_PUBLIC_API_BASE_URL env var (set in `.env.local`, see
// `.env.example`). Falls back to the deployed backend so the app is usable
// out of the box, matching the fallback pattern used by vora-frontend.
//
// Note for local dev on a physical device/emulator: `localhost` does NOT
// resolve to your dev machine — use your LAN IP instead, e.g.
// EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8000
const PROD_FALLBACK_URL = "https://vora-52k9.onrender.com";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || PROD_FALLBACK_URL;

// Web app (vora-frontend) — used to build shareable links to a scan's public
// result page (e.g. `${WEB_FRONTEND_URL}/reconstruct?code=X&phase=result`).
const WEB_FRONTEND_FALLBACK_URL = "https://vora-frontend-six.vercel.app";

export const WEB_FRONTEND_URL =
  process.env.EXPO_PUBLIC_WEB_FRONTEND_URL?.trim() || WEB_FRONTEND_FALLBACK_URL;
