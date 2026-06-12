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

export async function api<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({ ok: false, error: "响应解析失败" }));
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? `请求失败 (${res.status})`);
  }
  return json.data as T;
}
