import { NextResponse } from "next/server";
import { getPayoutQuote, type PayoutProvider } from "@/lib/trading/fx";
import { calculateWithdrawalFee } from "@/lib/trading/withdrawal-fees";

export async function POST(request:Request){
  const body=await request.json().catch(()=>({}));
  const provider=typeof body.provider==="string"?body.provider.toLowerCase():"";
  const amountUsd=Number(body.amountUsd);
  if(provider!=="opay"&&provider!=="paypal") return NextResponse.json({error:"Unsupported payout provider."},{status:400});
  try{
    const quote=getPayoutQuote(provider as PayoutProvider,amountUsd);
    const fee=calculateWithdrawalFee(amountUsd,{feeType:"percentage",fixedFee:0,percentageFee:1});
    return NextResponse.json({ok:true,provider,source:{amount:amountUsd,currency:"USD"},fee:{amount:fee.fee,currency:"USD"},totalDebit:{amount:fee.totalDebit,currency:"USD"},payout:{amount:quote.amount,currency:quote.targetCurrency},exchangeRate:quote.rate,quoteMode:quote.mode,quotedAt:quote.quotedAt});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to create quote."},{status:400});
  }
}
