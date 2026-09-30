import type { Side } from "@/lib/trading/types";

export type Position = {
  id: string;
  accountId: string;
  orderId: string;
  symbol: string;
  side: Side;
  volume: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: string;
};

export function positionFromOrder(order: {
  id: string; symbol: string; side: Side; volume: number; price?: number;
  stopLoss?: number; takeProfit?: number;
}, accountId: string): Position {
  if (order.price === undefined) throw new Error("Filled orders require an execution price.");
  return {
    id: crypto.randomUUID(), accountId, orderId: order.id, symbol: order.symbol,
    side: order.side, volume: order.volume, entryPrice: order.price,
    stopLoss: order.stopLoss, takeProfit: order.takeProfit, openedAt: new Date().toISOString()
  };
}
