/** Chamadas à API REST do app (mesma origem, cookie de sessão). */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
    ...init,
  });
  if (res.status === 204) {
    return undefined as T;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Sessão expirada: recarrega em /entrar para descartar todo o estado do cliente.
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.assign("/entrar");
    }
    throw new ApiError(
      res.status,
      (data as { error?: string }).error ??
        "Não foi possível salvar. Tente de novo."
    );
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body ?? {}),
  put: <T>(url: string, body: unknown) => request<T>("PUT", url, body),
  patch: <T>(url: string, body: unknown, init?: RequestInit) =>
    request<T>("PATCH", url, body, init),
  del: (url: string) => request<void>("DELETE", url),
};
