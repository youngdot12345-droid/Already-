export type PayoutProvider="opay"|"paypal";
export type FxQuote={sourceCurrency:"USD";targetCurrency:"NGN"|"USD";rate:number;amount:number;quotedAt:string;mode:"demo"};

const DEMO_USD_NGN_RATE=1500;

export function getPayoutQuote(provider:PayoutProvider,amountUsd:number):FxQuote{
  if(!Number.isFinite(amountUsd)||amountUsd<=0) throw new Error("Amount must be greater than zero.");
  const targetCurrency=provider==="opay"?"NGN":"USD";
  const rate=targetCurrency==="NGN"?DEMO_USD_NGN_RATE:1;
  return {sourceCurrency:"USD",targetCurrency,rate,amount:Number((amountUsd*rate).toFixed(2)),quotedAt:new Date().toISOString(),mode:"demo"};
}
