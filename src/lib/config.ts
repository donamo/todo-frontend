export const API_BASE_URL = (
  window.__ENV__?.API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

export const GRAPHQL_URL = `${API_BASE_URL}/graphql`;

export const LOG_LEVEL = window.__ENV__?.LOG_LEVEL || import.meta.env.VITE_LOG_LEVEL || "DEBUG";
