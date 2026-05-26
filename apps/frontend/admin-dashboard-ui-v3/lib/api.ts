const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"

let token: string | null = null
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

export function setToken(t: string) { token = t; if (typeof localStorage !== "undefined") localStorage.setItem("dash_token", t) }
export function setRefreshToken(t: string) { if (typeof localStorage !== "undefined") localStorage.setItem("dash_refresh_token", t) }
export function clearToken() {
  token = null
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("dash_token")
    localStorage.removeItem("dash_refresh_token")
  }
}
export function loadToken() { if (typeof localStorage !== "undefined") { token = localStorage.getItem("dash_token") } }
export function getToken() { return token }

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "ApiError" }
}

async function doRefresh(): Promise<string | null> {
  if (typeof localStorage === "undefined") return null
  const refreshToken = localStorage.getItem("dash_refresh_token")
  if (!refreshToken) return null
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) { clearToken(); return null }
    const data = await res.json()
    if (data.access_token) {
      setToken(data.access_token)
      if (data.refresh_token) setRefreshToken(data.refresh_token)
      return data.access_token
    }
    return null
  } catch {
    clearToken()
    return null
  }
}

function buildHeaders(t: string | null, extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", ...extra }
  if (t) h["Authorization"] = `Bearer ${t}`
  return h
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  if (!token && typeof localStorage !== "undefined") token = localStorage.getItem("dash_token")
  const extraHeaders = init.headers as Record<string, string> | undefined
  const res = await fetch(`${BASE}${path}`, { ...init, headers: buildHeaders(token, extraHeaders) })

  if (res.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = doRefresh().finally(() => { isRefreshing = false; refreshPromise = null })
    }
    const newToken = await refreshPromise
    if (!newToken) throw new ApiError(401, "Session expired. Please log in again.")
    const retryRes = await fetch(`${BASE}${path}`, { ...init, headers: buildHeaders(newToken, extraHeaders) })
    if (!retryRes.ok) {
      let msg = retryRes.statusText
      try { const j = await retryRes.json(); msg = j.message ?? j.error ?? msg } catch {}
      throw new ApiError(retryRes.status, msg)
    }
    if (retryRes.status === 204) return undefined as T
    return retryRes.json()
  }

  if (!res.ok) {
    let msg = res.statusText
    try { const j = await res.json(); msg = j.message ?? j.error ?? msg } catch {}
    throw new ApiError(res.status, msg)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}
