const defaultBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export interface RequestConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
}

function buildUrl(path: string, baseUrl: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
}

export async function apiGet<T>(
  path: string,
  config: RequestConfig = {}
): Promise<T> {
  const { baseUrl = defaultBaseUrl, headers = {} } = config;
  const url = buildUrl(path, baseUrl);
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T, B = unknown>(
  path: string,
  body?: B,
  config: RequestConfig = {}
): Promise<T> {
  const { baseUrl = defaultBaseUrl, headers = {} } = config;
  const url = buildUrl(path, baseUrl);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPut<T, B = unknown>(
  path: string,
  body?: B,
  config: RequestConfig = {}
): Promise<T> {
  const { baseUrl = defaultBaseUrl, headers = {} } = config;
  const url = buildUrl(path, baseUrl);
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function apiDelete(
  path: string,
  config: RequestConfig = {}
): Promise<void> {
  const { baseUrl = defaultBaseUrl, headers = {} } = config;
  const url = buildUrl(path, baseUrl);
  const res = await fetch(url, {
    method: "DELETE",
    headers: { ...headers },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
}

export async function apiUpload<T>(
  path: string,
  file: File,
  params?: Record<string, string>,
  config: RequestConfig = {}
): Promise<T> {
  const { baseUrl = defaultBaseUrl, headers = {} } = config;
  let url = buildUrl(path, baseUrl);
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url += `?${qs}`;
  }
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
