export const fmtMoney = (n: number | null | undefined) =>
  n == null
    ? "—"
    : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtQty = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("en-US");

export const fmtTime = (iso: string | Date, locale = "en") => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString(locale, { hour12: false });
};

/** 带 HTTP 状态码的请求错误：调用方可按状态区分处理（如 401 → 引导登录）；网络层失败无状态码，用 0 表示 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** 登录/注册后的站内回跳目标;只接受站内相对路径,防 open-redirect */
export function safeReturnTo(raw: string | null | undefined): string {
  if (raw && /^\/(?![/\\])/.test(raw)) return raw;
  return "/portfolio";
}

export async function api<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    });
  } catch (e) {
    throw new ApiError((e as Error).message, 0);
  }
  const json = await res.json().catch(() => ({ ok: false, error: "Failed to parse response" }));
  if (!res.ok || !json.ok) {
    throw new ApiError(json.error ?? `Request failed (${res.status})`, res.status);
  }
  return json.data as T;
}
