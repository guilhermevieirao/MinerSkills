const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parse(res: Response) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.message ?? 'Erro na requisição',
      data?.error,
      data?.details,
    );
  }
  return data;
}

type Query = Record<string, string | number | boolean | undefined | null>;

function withQuery(path: string, query?: Query): string {
  if (!query) return `${API_URL}${path}`;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return `${API_URL}${path}${qs ? `?${qs}` : ''}`;
}

export const api = {
  get: <T>(path: string, query?: Query) =>
    fetch(withQuery(path, query), { credentials: 'include' }).then(parse) as Promise<T>,

  post: <T>(path: string, body?: unknown) =>
    fetch(`${API_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then(parse) as Promise<T>,

  put: <T>(path: string, body?: unknown) =>
    fetch(`${API_URL}${path}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then(parse) as Promise<T>,

  patch: <T>(path: string, body?: unknown) =>
    fetch(`${API_URL}${path}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then(parse) as Promise<T>,

  del: <T = void>(path: string) =>
    fetch(`${API_URL}${path}`, { method: 'DELETE', credentials: 'include' }).then(
      parse,
    ) as Promise<T>,

  upload: <T>(path: string, file: File, fields?: Record<string, string>) => {
    const form = new FormData();
    form.append('file', file);
    if (fields) for (const [k, v] of Object.entries(fields)) form.append(k, v);
    return fetch(`${API_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    }).then(parse) as Promise<T>;
  },
};
