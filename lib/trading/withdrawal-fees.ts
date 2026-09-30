export type FeeRule={feeType:"fixed"|"percentage"|"fixed_plus_percentage";fixedFee:number;percentageFee:number};

export function calculateWithdrawalFee(amount:number,rule:FeeRule){
  if(!Number.isFinite(amount)||amount<=0) throw new Error("Withdrawal amount must be greater than zero.");
  const fixed=rule.feeType==="percentage"?0:Math.max(0,rule.fixedFee);
  const percentage=rule.feeType==="fixed"?0:amount*Math.max(0,rule.percentageFee)/100;
  const fee=Number((fixed+percentage).toFixed(8));
  return {amount,fee,totalDebit:Number((amount+fee).toFixed(8)),netPayout:amount};
}
