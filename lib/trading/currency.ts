export const PLATFORM_CURRENCY = "USD" as const;

export function formatUsd(amount:number){
  if(!Number.isFinite(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(amount);
}

export function assertPlatformCurrency(currency:string){
  if(currency.toUpperCase() !== PLATFORM_CURRENCY) throw new Error("Already accounts and platform ledger use USD.");
  return PLATFORM_CURRENCY;
}
