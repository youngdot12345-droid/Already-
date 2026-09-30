import type { Order, Side } from "@/lib/trading/types";

export type RiskLimits = { maxVolume: number; maxOpenPositions: number };
export type RiskContext = {
  entryPrice: number; openPositions: number; limits: RiskLimits; side: Side;
  volume: number; stopLoss?: number; takeProfit?: number;
};

export function validateOrderRisk(input: RiskContext): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(input.volume) || input.volume <= 0) errors.push("Volume must be greater than zero.");
  if (input.volume > input.limits.maxVolume) errors.push("Order volume exceeds the server risk limit.");
  if (input.openPositions >= input.limits.maxOpenPositions) errors.push("Maximum open positions reached.");
  if (!Number.isFinite(input.entryPrice) || input.entryPrice <= 0) errors.push("Entry price must be positive.");
  if (input.stopLoss !== undefined) {
    const valid = input.side === "buy" ? input.stopLoss < input.entryPrice : input.stopLoss > input.entryPrice;
    if (!valid) errors.push("Stop-loss is on the wrong side of the entry price.");
  }
  if (input.takeProfit !== undefined) {
    const valid = input.side === "buy" ? input.takeProfit > input.entryPrice : input.takeProfit < input.entryPrice;
    if (!valid) errors.push("Take-profit is on the wrong side of the entry price.");
  }
  return errors;
}

export function normalizeOrder(order: Order): Order {
  return { ...order, symbol: order.symbol.trim().toUpperCase(), volume: Number(order.volume),
    price: order.price === undefined ? undefined : Number(order.price),
    stopLoss: order.stopLoss === undefined ? undefined : Number(order.stopLoss),
    takeProfit: order.takeProfit === undefined ? undefined : Number(order.takeProfit) };
}
