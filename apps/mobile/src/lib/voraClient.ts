import { createVoraClient } from "@vora/api-client";
import { API_BASE_URL } from "./config";

// Single shared client instance for the whole app. Screens/contexts should
// import `client` from here rather than constructing their own — auth state
// (the Bearer token) lives on this one instance via `client.setBearerToken()`.
//
// `onUnauthorized` is wired up by AuthContext after it mounts (see
// `registerUnauthorizedHandler`), since the client is created before React
// context exists.
let unauthorizedHandler: (() => void) | null = null;

export const client = createVoraClient({
  baseUrl: API_BASE_URL,
  bearerToken: null,
  onUnauthorized: () => unauthorizedHandler?.(),
});

export function registerUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}
