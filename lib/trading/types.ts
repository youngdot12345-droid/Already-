export type Side="buy"|"sell";
export type OrderType="market"|"limit"|"stop";
export type OrderStatus="pending"|"filled"|"cancelled";
export type AiPermission="market.read"|"account.read"|"analysis.read"|"orders.place"|"orders.modify"|"positions.close";
export type Order={id:string,symbol:string,side:Side,type:OrderType,volume:number,price?:number,stopLoss?:number,takeProfit?:number,status:OrderStatus,createdAt:string};
export type Account={id:string,currency:string,balance:number,equity:number,margin:number,freeMargin:number};
