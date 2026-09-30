import { NextResponse } from "next/server";
import { getPayoutQuote, type PayoutProvider } from "@/lib/trading/fx";
import { calculateWithdrawalFee } from "@/lib/trading/withdrawal-fees";
import { query } from "@/lib/trading/postgres";

export async function POST(request:Request){
  const body=await request.json().catch(()=>({}));
  const userId=typeof body.userId==="string"?body.userId:"";
  const accountId=typeof body.accountId==="string"?body.accountId:"";
  const payoutMethodId=typeof body.payoutMethodId==="string"?body.payoutMethodId:"";
  const provider=typeof body.provider==="string"?body.provider.toLowerCase():"";
  const amountUsd=Number(body.amountUsd);
  if(!userId||!accountId||!payoutMethodId) return NextResponse.json({error:"Authenticated user, account and payout method are required."},{status:401});
  if(provider!=="opay"&&provider!=="paypal") return NextResponse.json({error:"Unsupported payout provider."},{status:400});
  try{
    const quote=getPayoutQuote(provider as PayoutProvider,amountUsd);
    const fee=calculateWithdrawalFee(amountUsd,{feeType:"percentage",fixedFee:0,percentageFee:1});
    const client=await (await import("@/lib/trading/postgres")).getPool().connect();
    try{
      await client.query("BEGIN");
      const account=(await client.query("SELECT balance FROM trading_accounts WHERE id=$1 AND user_id=$2 FOR UPDATE",[accountId,userId])).rows[0];
      if(!account) throw new Error("Account not found.");
      if(Number(account.balance)<fee.totalDebit) throw new Error("Insufficient USD balance for withdrawal and fee.");
      const method=(await client.query("SELECT id,provider,verified FROM payout_methods WHERE id=$1 AND user_id=$2 FOR UPDATE",[payoutMethodId,userId])).rows[0];
      if(!method||method.provider!==provider) throw new Error("Payout method does not belong to this account.");
      if(!method.verified) throw new Error("Payout method must be verified before withdrawal.");
      const id=crypto.randomUUID();
      await client.query("UPDATE trading_accounts SET balance=balance-$1,equity=equity-$1,free_margin=free_margin-$1 WHERE id=$2",[fee.totalDebit,accountId]);
      await client.query("INSERT INTO withdrawals(id,user_id,account_id,payout_method_id,amount,currency,status) VALUES($1,$2,$3,$4,$5,'USD','pending')",[id,userId,accountId,payoutMethodId,amountUsd]);
      await client.query("INSERT INTO withdrawal_ledger(id,withdrawal_id,entry_type,amount,currency) VALUES($1,$2,'withdrawal',$3,'USD'),($4,$2,'fee',$5,'USD')",[crypto.randomUUID(),id,amountUsd,crypto.randomUUID(),fee.fee]);
      await client.query("INSERT INTO platform_revenue_ledger(id,source_type,source_id,amount,currency) VALUES($1,'withdrawal_fee',$2,$3,'USD')",[crypto.randomUUID(),id,fee.fee]);
      await client.query("COMMIT");
      return NextResponse.json({ok:true,withdrawalId:id,status:"pending",debited:{amount:fee.totalDebit,currency:"USD"},payout:{amount:quote.amount,currency:quote.targetCurrency},fee:{amount:fee.fee,currency:"USD"},exchangeRate:quote.rate,mode:"demo"},{status:201});
    }catch(error){ await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }catch(error){ return NextResponse.json({error:error instanceof Error?error.message:"Withdrawal failed."},{status:400}); }
}
