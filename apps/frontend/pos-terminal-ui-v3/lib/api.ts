const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const TOKEN_KEY = 'terminal_jwt';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const callerHeaders: Record<string, string> =
    options.headers instanceof Headers
      ? Object.fromEntries(options.headers.entries())
      : Array.isArray(options.headers)
      ? Object.fromEntries(options.headers as string[][])
      : ((options.headers ?? {}) as Record<string, string>);
  const headers: Record<string, string> = { ...callerHeaders };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let code = 'UNKNOWN_ERROR';
    let message = res.statusText;
    try {
      const body = await res.json();
      code = body.error ?? code;
      message = body.message ?? message;
    } catch {
      // non-JSON error body — keep defaults
    }
    throw new ApiError(res.status, code, message);
  }

  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}
