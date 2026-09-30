import type { Account, Order } from "@/lib/trading/types";

export type TradingRepository = {
  getAccount(accountId: string): Promise<Account | null>;
  listOrders(accountId: string): Promise<Order[]>;
  saveOrder(accountId: string, order: Order): Promise<Order>;
};

export function createRepository(): TradingRepository {
  throw new Error(
    "Production repository is not wired yet. Configure the PostgreSQL adapter before enabling persistent trading."
  );
}
