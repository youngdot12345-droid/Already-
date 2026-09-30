import type { Account, Order } from "@/lib/trading/types";

export const demoAccount: Account = { id: "demo-account", currency: "USD", balance: 10000, equity: 10000, margin: 0, freeMargin: 10000 };
export const demoQuotes: Record<string, { bid: number; ask: number; updatedAt: string }> = {
  "EUR/USD": { bid: 1.0824, ask: 1.0826, updatedAt: new Date().toISOString() },
  "GBP/USD": { bid: 1.2931, ask: 1.2934, updatedAt: new Date().toISOString() },
  "USD/JPY": { bid: 148.42, ask: 148.45, updatedAt: new Date().toISOString() },
  "XAU/USD": { bid: 2651.2, ask: 2651.8, updatedAt: new Date().toISOString() },
  "BTC/USD": { bid: 64120, ask: 64145, updatedAt: new Date().toISOString() },
};
let orders: Order[] = [];
export function listOrders() { return orders; }
export function addOrder(order: Order) { orders = [order, ...orders]; return order; }
export function getOpenPositionCount() { return orders.filter((order) => order.status === "filled").length; }
