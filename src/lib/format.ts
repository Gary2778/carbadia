export const fmtMoney = (n: number | null | undefined) =>
  n == null
    ? "—"
    : n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtQty = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("zh-CN");

export const fmtTime = (iso: string | Date) => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("zh-CN", { hour12: false });
};

/** 带 HTTP 状态码的请求错误：调用方可按状态区分处理（如 401 → 引导登录）；网络层失败无状态码，用 0 表示 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
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
  const json = await res.json().catch(() => ({ ok: false, error: "响应解析失败" }));
  if (!res.ok || !json.ok) {
    throw new ApiError(json.error ?? `请求失败 (${res.status})`, res.status);
  }
  return json.data as T;
}
