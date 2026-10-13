import type { Address, Hex } from "viem";
export type NetworkConfig = {
  chainId: number;
  factory: Address | null;
  checkout: Address | null;
  demoAccount: Address | null;
  demoOwner: Address | null;
  explorer: string;
  ready: boolean;
  remaining: number;
  rpc: string;
};
export type DemoRun = {
  id: string;
  kind: "complete" | "refund";
  status: string;
  created_at: number;
  deadline: number | null;
  intent_id: Hex | null;
  fund_tx: Hex | null;
  execute_tx: Hex | null;
  reclaim_tx: Hex | null;
  refund_tx: Hex | null;
  error: string | null;
};
const apiBase = import.meta.env.VITE_API_BASE ?? "";
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${apiBase}/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data: unknown = await res.json();
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String(data.error)
        : "Request failed. Please try again.";
    throw new Error(message);
  }
  return data as T;
}
