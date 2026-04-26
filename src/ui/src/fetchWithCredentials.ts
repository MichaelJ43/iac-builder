/** Shared `fetch` options for same-site API calls (enables session cookies when hosted with shared auth). */
export const withCredentials: RequestInit = { credentials: "include" as RequestCredentials };
