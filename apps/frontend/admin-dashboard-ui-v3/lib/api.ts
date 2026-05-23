const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"

let token: string | null = null

export function setToken(t: string) { token = t; if (typeof localStorage !== "undefined") localStorage.setItem("dash_token", t) }
export function clearToken() { token = null; if (typeof localStorage !== "undefined") localStorage.removeItem("dash_token") }
export function loadToken() { if (typeof localStorage !== "undefined") { token = localStorage.getItem("dash_token") } }
export function getToken() { return token }

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "ApiError" }
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  if (!token && typeof localStorage !== "undefined") token = localStorage.getItem("dash_token")
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init.headers as Record<string, string> ?? {}) }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    let msg = res.statusText
    try { const j = await res.json(); msg = j.message ?? j.error ?? msg } catch {}
    throw new ApiError(res.status, msg)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}
