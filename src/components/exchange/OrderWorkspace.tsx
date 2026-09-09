"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { api, ApiError, fmtMoney, fmtQty, fmtTime } from "@/lib/format";
import { usePolling } from "@/lib/usePolling";
import { useLang } from "@/lib/i18n";
import { tName } from "@/lib/data-i18n";
import { useToast } from "@/components/anim/Toast";
import { useExchangeText } from "./useExchange";
import { AccountGate } from "./AccountData";
import { ExchangeIcon } from "./ExchangeIcon";
import { TableViewport } from "./TableViewport";

type Order = {
  id: string;
  side: string;
  type: string;
  price: number | null;
  quantity: number;
  filledQuantity: number;
  status: string;
  avgFillPrice: number | null;
  createdAt: string;
  asset: { symbol: string; name: string };
};
type Result = { orders: Order[]; page: number; pages: number; total: number };
type QueryResult = { key: string; value: Result };
type QueryError = { key: string; message: string };
const ORDER_STATUSES = ["ACTIVE", "ALL", "FILLED", "CANCELLED"] as const;
type OrderStatusFilter = (typeof ORDER_STATUSES)[number];

export function OrderWorkspace() {
  const c = useExchangeText();
  const { lang } = useLang();
  const toast = useToast();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requestedStatus = searchParams.get("status");
  const status: OrderStatusFilter = ORDER_STATUSES.includes(
    requestedStatus as OrderStatusFilter,
  )
    ? (requestedStatus as OrderStatusFilter)
    : "ACTIVE";
  // The API uses an absent/empty status for all orders; ALL is the public URL value.
  const filter = status === "ALL" ? "" : status;
  const [side, setSide] = useState("");
  const [pagination, setPagination] = useState<{
    filter: string;
    page: number;
  }>({ filter, page: 1 });
  // Direct links and browser navigation start the newly selected status at page one.
  const page = pagination.filter === filter ? pagination.page : 1;
  const returnTo = `${pathname}?status=${status}`;
  const [result, setResult] = useState<QueryResult | null>(null);
  const [failure, setFailure] = useState<QueryError | null>(null);
  const [completedKey, setCompletedKey] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [cancelId, setCancelId] = useState("");
  const [busy, setBusy] = useState(false);
  const ticket = useRef(0);
  const cancelGuard = useRef(false);
  const workspace = useRef<HTMLElement>(null);
  const queryKey = `${filter}:${side}:${page}`;
  // Keep a previous snapshot only when it belongs to the selected criteria.
  const data = result?.key === queryKey ? result.value : null;
  const error = failure?.key === queryKey ? failure.message : "";
  const loading = completedKey !== queryKey;

  const load = useCallback(async () => {
    const request = ++ticket.current;
    try {
      const value = await api<Result>(
        `/api/orders?page=${page}&status=${filter}&side=${side}`,
      );
      if (ticket.current !== request) return;
      setResult({ key: queryKey, value });
      setFailure(null);
      setUnauthorized(false);
    } catch (e) {
      if (ticket.current === request) {
        setFailure({ key: queryKey, message: (e as Error).message });
        if (e instanceof ApiError && e.status === 401) {
          setResult(null);
          setCancelId("");
          setUnauthorized(true);
        }
      }
      throw e;
    } finally {
      if (ticket.current === request) setCompletedKey(queryKey);
    }
  }, [filter, side, page, queryKey]);
  usePolling(load, 5000, queryKey);

  function changeFilter(value: string) {
    if (value === filter && page === 1) return;
    ticket.current += 1;
    const nextStatus = value || "ALL";
    if (!ORDER_STATUSES.includes(nextStatus as OrderStatusFilter)) return;
    setPagination({ filter: value, page: 1 });
    setCancelId("");
    const next = new URLSearchParams(searchParams.toString());
    if (nextStatus === "ACTIVE") next.delete("status");
    else next.set("status", nextStatus);
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ""}`, {
      scroll: false,
    });
  }

  function changeSide(value: string) {
    if (value === side && page === 1) return;
    ticket.current += 1;
    setSide(value);
    setPagination({ filter, page: 1 });
    setCancelId("");
  }

  function changePage(value: number) {
    if (value === page) return;
    ticket.current += 1;
    setPagination({ filter, page: value });
    setCancelId("");
  }

  async function cancel() {
    if (!cancelId || cancelGuard.current) return;
    cancelGuard.current = true;
    setBusy(true);
    try {
      await api(`/api/orders/${cancelId}`, { method: "DELETE" });
      setCancelId("");
      toast(
        "ok",
        c(
          "Order cancelled. Unfilled funds or credits have been released.",
          "訂單已取消，未成交資金或信用已釋放。",
        ),
      );
      // A refresh failure must not turn a successful cancellation into an error receipt.
      await load().catch(() => {});
      workspace.current?.focus();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        ticket.current += 1;
        setResult(null);
        setCancelId("");
        setUnauthorized(true);
      }
      toast("err", (e as Error).message);
    } finally {
      setBusy(false);
      cancelGuard.current = false;
    }
  }

  const statusLabel = (status: string) =>
    status === "OPEN"
      ? c("Open", "待成交")
      : status === "PARTIAL"
        ? c("Partially filled", "部分成交")
        : status === "FILLED"
          ? c("Filled", "全部成交")
          : status === "CANCELLED"
            ? c("Cancelled", "已取消")
            : c("Unknown status", "狀態不明");

  return (
    <>
      <div className="ex-page-heading">
        <div>
          <h1>{c("Orders", "訂單")}</h1>
          <p>
            {c(
              "Follow each order from submission to settlement. Cancel any unfilled remainder.",
              "追蹤從委託到結算的狀態，並可取消尚未成交的部分。",
            )}
          </p>
        </div>
        <Link href="/exchange" className="ex-button primary">
          <ExchangeIcon name="plus" size={14} />
          {c("New trade", "新增交易")}
        </Link>
      </div>
      {unauthorized ? (
        <AccountGate
          error=""
          loading={false}
          unauthorized
          retry={load}
          returnTo={returnTo}
        />
      ) : (
        <>
          <section
            ref={workspace}
            tabIndex={-1}
            className="ex-market-body focus-visible:outline-2 focus-visible:outline-accent"
            aria-label={c("Orders workspace", "訂單工作區")}
            aria-busy={loading}
          >
            <div
              className="ex-market-tabs"
              role="group"
              aria-label={c("Filter order status", "依訂單狀態篩選")}
            >
              {[
                ["ACTIVE", "Open orders", "未完成訂單"],
                ["", "All orders", "全部訂單"],
                ["FILLED", "Filled", "已成交"],
                ["CANCELLED", "Cancelled", "已取消"],
              ].map(([value, en, zh]) => (
                <button
                  key={value}
                  disabled={busy}
                  aria-pressed={filter === value}
                  onClick={() => changeFilter(value)}
                >
                  {c(en, zh)}
                </button>
              ))}
              <span className="ex-market-count">
                {data
                  ? `${data.total} ${c("orders", "筆訂單")}`
                  : loading
                    ? c("Loading…", "載入中…")
                    : "—"}
              </span>
            </div>
            <div className="ex-market-toolbar">
              <select
                className="ex-select"
                value={side}
                disabled={busy}
                aria-label={c("Order direction", "買賣方向")}
                onChange={(e) => changeSide(e.target.value)}
              >
                <option value="">{c("Buy & sell", "買入及賣出")}</option>
                <option value="BUY">{c("Buy", "買入")}</option>
                <option value="SELL">{c("Sell", "賣出")}</option>
              </select>
              <span className="ex-muted">
                {c(
                  "Market-order remainders are cancelled automatically if liquidity runs out.",
                  "市價單若流動性不足，未成交部分會自動取消。",
                )}
              </span>
            </div>
            {data && error && (
              <div role="alert" className="ex-error">
                {c(
                  "Order refresh failed. Showing the last result for these filters. Check the latest state before cancelling.",
                  "訂單更新失敗，顯示此篩選條件最近的資料。取消前請先重新確認狀態。",
                )}
                <button onClick={() => void load().catch(() => {})}>
                  {c("Retry", "重試")}
                </button>
              </div>
            )}
            {!data ? (
              <AccountGate
                error={error}
                loading={loading}
                unauthorized={false}
                retry={load}
                returnTo={returnTo}
              />
            ) : (
              <>
                {data.orders.length === 0 ? (
                  <div className="ex-empty">
                    <ExchangeIcon name="orders" size={31} />
                    <h2>{c("No orders in this view", "此分類尚無訂單")}</h2>
                    <p>
                      {c(
                        "Your submitted orders and their fill status will appear here.",
                        "已提交的訂單及成交狀態會顯示於此。",
                      )}
                    </p>
                    <Link className="ex-button" href="/exchange">
                      {c("Explore credits", "探索信用")}
                    </Link>
                  </div>
                ) : (
                  <TableViewport
                    label={c("Order history table", "訂單紀錄表格")}
                  >
                    <table className="ex-table">
                      <thead>
                        <tr>
                          {[
                            c("Credit / time", "信用／時間"),
                            c("Side / type", "方向／類型"),
                            c("Limit price", "限價"),
                            c("Filled / ordered", "已成交／委託"),
                            c("Average fill", "成交均價"),
                            c("Status", "狀態"),
                            c("Action", "操作"),
                          ].map((label) => (
                            <th key={label} scope="col">
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.orders.map((order) => (
                          <tr key={order.id}>
                            <td>
                              <Link
                                href={`/exchange/market/${order.asset.symbol}`}
                              >
                                {tName(
                                  order.asset.symbol,
                                  order.asset.name,
                                  lang,
                                )}
                              </Link>
                              <span className="ex-subline">
                                {fmtTime(order.createdAt)}
                              </span>
                              <span className="ex-subline" title={order.id}>
                                {order.id.slice(-12)}
                              </span>
                            </td>
                            <td>
                              <span
                                className={
                                  order.side === "BUY"
                                    ? "ex-positive"
                                    : "ex-negative"
                                }
                              >
                                {order.side === "BUY"
                                  ? c("Buy", "買入")
                                  : c("Sell", "賣出")}
                              </span>
                              <span className="ex-subline">
                                {order.type === "MARKET"
                                  ? c("Market", "市價")
                                  : c("Limit", "限價")}
                              </span>
                            </td>
                            <td>
                              {order.price == null
                                ? "—"
                                : `$${fmtMoney(order.price)}`}
                            </td>
                            <td>
                              {fmtQty(order.filledQuantity)} /{" "}
                              {fmtQty(order.quantity)}
                            </td>
                            <td>
                              {order.avgFillPrice == null
                                ? "—"
                                : `$${fmtMoney(order.avgFillPrice)}`}
                            </td>
                            <td>
                              <span
                                className={`ex-status-tag ${order.status === "FILLED" ? "filled" : ["OPEN", "PARTIAL"].includes(order.status) ? "open" : ""}`}
                              >
                                {statusLabel(order.status)}
                              </span>
                              {order.status === "CANCELLED" &&
                                order.filledQuantity > 0 && (
                                  <span className="ex-subline">
                                    {c(
                                      "Partial fill; remainder cancelled",
                                      "部分成交，其餘取消",
                                    )}
                                  </span>
                                )}
                            </td>
                            <td>
                              {["OPEN", "PARTIAL"].includes(order.status) && (
                                <div
                                  className="ex-actions"
                                  role="group"
                                  aria-label={c(
                                    `Cancellation actions for ${order.asset.symbol}`,
                                    `${order.asset.symbol} 取消操作`,
                                  )}
                                  onKeyDown={(event) => {
                                    if (
                                      event.key !== "Escape" ||
                                      busy ||
                                      cancelId !== order.id
                                    )
                                      return;
                                    event.preventDefault();
                                    setCancelId("");
                                    event.currentTarget
                                      .querySelector("button")
                                      ?.focus();
                                  }}
                                >
                                  <button
                                    className={
                                      cancelId === order.id
                                        ? "ex-button"
                                        : "ex-learn-link"
                                    }
                                    onClick={
                                      cancelId === order.id
                                        ? cancel
                                        : () => setCancelId(order.id)
                                    }
                                    disabled={busy}
                                    aria-expanded={cancelId === order.id}
                                    aria-label={
                                      cancelId === order.id
                                        ? c(
                                            `Confirm cancellation of ${order.asset.symbol} order`,
                                            `確認取消 ${order.asset.symbol} 訂單`,
                                          )
                                        : c(
                                            `Cancel ${order.asset.symbol} order`,
                                            `取消 ${order.asset.symbol} 訂單`,
                                          )
                                    }
                                  >
                                    {cancelId !== order.id
                                      ? c("Cancel order", "取消訂單")
                                      : busy
                                        ? c("Cancelling…", "取消中…")
                                        : c("Confirm cancel", "確認取消")}
                                  </button>
                                  {cancelId === order.id && (
                                    <button
                                      className="ex-icon-button"
                                      disabled={busy}
                                      onClick={(event) => {
                                        event.currentTarget.parentElement
                                          ?.querySelector("button")
                                          ?.focus();
                                        setCancelId("");
                                      }}
                                      aria-label={c("Keep order", "保留訂單")}
                                    >
                                      <ExchangeIcon name="close" size={14} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableViewport>
                )}
                <div className="ex-table-note">
                  <span>
                    {c(
                      `Page ${data.page} of ${data.pages}`,
                      `第 ${data.page}／${data.pages} 頁`,
                    )}
                  </span>
                  <div className="ex-actions">
                    <button
                      className="ex-button"
                      disabled={busy || page <= 1}
                      onClick={() => changePage(page - 1)}
                    >
                      {c("Previous", "上一頁")}
                    </button>
                    <button
                      className="ex-button"
                      disabled={busy || page >= data.pages}
                      onClick={() => changePage(page + 1)}
                    >
                      {c("Next", "下一頁")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
          <div className="ex-info-strip">
            <ExchangeIcon name="info" />
            <div>
              <strong>
                {c(
                  "A submitted order is not a completed purchase.",
                  "已提交訂單不等於已完成買入。",
                )}
              </strong>
              <p>
                {c(
                  "Only filled quantities change ownership. Unfilled limit orders reserve cash or credits until execution or cancellation.",
                  "只有成交數量會變更持有權。未成交的限價單會保留資金或信用，直至成交或取消。",
                )}
              </p>
            </div>
            <Link href="/exchange/portfolio">
              {c("View holdings", "查看持倉")}
            </Link>
          </div>
        </>
      )}
    </>
  );
}
