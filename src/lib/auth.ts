import { API_BASE_URL } from "./config";

export type User = {
  id: string;
  email: string;
  name: string;
  approved?: boolean;
  isAdmin?: boolean;
};

export async function fetchCurrentUser(): Promise<User | null> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: "include",
  });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`/auth/me failed: ${response.status}`);
  }
  return response.json() as Promise<User>;
}

export function startGoogleLogin(): void {
  window.location.href = `${API_BASE_URL}/auth/google/login`;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}
