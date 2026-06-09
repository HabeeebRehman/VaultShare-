import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeader()),
    ...((options.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createSecret: (payload: {
    ciphertext: string;
    expiry: string;
    label?: string;
    maxViews: number;
    passwordProtected: boolean;
  }) => request<{ id: string; expiry: string }>("/api/secrets", {
    method: "POST",
    body: JSON.stringify(payload),
  }),

  secretStatus: (id: string) =>
    request<{ exists: boolean }>(`/api/secrets/${id}/status`),

  consumeSecret: (id: string) =>
    request<{
      ciphertext: string;
      passwordProtected: boolean;
      viewsLeft: number;
      burned: boolean;
    }>(`/api/secrets/${id}/consume`, { method: "POST" }),

  dashboardSecrets: () =>
    request<{ secrets: Array<Record<string, unknown>> }>("/api/dashboard/secrets"),

  contact: (payload: { name: string; email: string; message: string }) =>
    request<{ ok: boolean }>("/api/contact", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  sendWelcome: () => request<{ ok: boolean }>("/api/auth/welcome", { method: "POST" }),
};
