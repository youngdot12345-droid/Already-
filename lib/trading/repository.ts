import { query } from "@/lib/trading/postgres";
import type { Account, Order } from "@/lib/trading/types";

export type TradingRepository = {
  getAccount(accountId:string):Promise<Account|null>;
  listOrders(accountId:string):Promise<Order[]>;
  saveOrder(accountId:string,order:Order):Promise<Order>;
};

export function createRepository():TradingRepository {
  return {
    async getAccount(accountId) {
      const r=await query<any>(`SELECT id,currency,balance,equity,margin,free_margin FROM trading_accounts WHERE id=$1 LIMIT 1`,[accountId]);
      const x=r.rows[0];
      return x ? {id:x.id,currency:x.currency,balance:Number(x.balance),equity:Number(x.equity),margin:Number(x.margin),freeMargin:Number(x.free_margin)} : null;
    },
    async listOrders(accountId) {
      const r=await query<any>(`SELECT id,symbol,side,type,volume,price,stop_loss,take_profit,status,created_at FROM orders WHERE account_id=$1 ORDER BY created_at DESC`,[accountId]);
      return r.rows.map((x:any)=>({id:x.id,symbol:x.symbol,side:x.side,type:x.type,volume:Number(x.volume),price:x.price==null?undefined:Number(x.price),stopLoss:x.stop_loss==null?undefined:Number(x.stop_loss),takeProfit:x.take_profit==null?undefined:Number(x.take_profit),status:x.status,createdAt:x.created_at}));
    },
    async saveOrder(accountId,order) {
      const r=await query<any>(`INSERT INTO orders(id,account_id,symbol,side,type,volume,price,stop_loss,take_profit,status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id,symbol,side,type,volume,price,stop_loss,take_profit,status,created_at`,[order.id,accountId,order.symbol,order.side,order.type,order.volume,order.price??null,order.stopLoss??null,order.takeProfit??null,order.status,order.createdAt]);
      const x=r.rows[0];
      return {id:x.id,symbol:x.symbol,side:x.side,type:x.type,volume:Number(x.volume),price:x.price==null?undefined:Number(x.price),stopLoss:x.stop_loss==null?undefined:Number(x.stop_loss),takeProfit:x.take_profit==null?undefined:Number(x.take_profit),status:x.status,createdAt:x.created_at};
    }
  };
}
