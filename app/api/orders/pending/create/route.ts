import { NextResponse } from "next/server";
import { getPool } from "@/lib/trading/postgres";
import { demoQuotes } from "@/lib/trading/store";
import { validateOrderRisk } from "@/lib/trading/risk";
import { getServerSession } from "@/lib/trading/session";
import type { Side } from "@/lib/trading/types";

export async function POST(request:Request){
  const session=await getServerSession();
  if(!session)return NextResponse.json({error:"Authentication required."},{status:401});
  const body=await request.json().catch(()=>({}));
  const accountId=typeof body.accountId==="string"?body.accountId:"";
  const symbol=typeof body.symbol==="string"?body.symbol.toUpperCase():"";
  const side=body.side as Side;
  const type=typeof body.type==="string"?body.type.toLowerCase():"";
  const volume=Number(body.volume), price=Number(body.price);
  if(!accountId||!symbol||!["buy","sell"].includes(side)||!["limit","stop"].includes(type)||!Number.isFinite(price))return NextResponse.json({error:"Invalid pending order fields."},{status:400});
  const quote=demoQuotes[symbol];
  if(!quote)return NextResponse.json({error:"Symbol not supported."},{status:400});
  if(type==="limit"&&((side==="buy"&&price>=quote.ask)||(side==="sell"&&price<=quote.bid)))return NextResponse.json({error:"Limit price would execute immediately; use a market order."},{status:422});
  if(type==="stop"&&((side==="buy"&&price<=quote.ask)||(side==="sell"&&price>=quote.bid)))return NextResponse.json({error:"Stop price would execute immediately; use a market order."},{status:422});
  const stopLoss=body.stopLoss==null?undefined:Number(body.stopLoss),takeProfit=body.takeProfit==null?undefined:Number(body.takeProfit);
  const client=await getPool().connect();
  try{await client.query("BEGIN");
    const a=await client.query(`SELECT a.id,a.account_type FROM trading_accounts a JOIN users u ON u.id=a.user_id WHERE a.id=$1 AND lower(u.email)=lower($2) FOR UPDATE`,[accountId,session.email]);
    if(!a.rows[0]){await client.query("ROLLBACK");return NextResponse.json({error:"Trading account not found."},{status:404});}
    if(a.rows[0].account_type!=="demo"){await client.query("ROLLBACK");return NextResponse.json({error:"Real-money execution is disabled.",code:"LIVE_EXECUTION_DISABLED"},{status:403});}
    const open=await client.query("SELECT COUNT(*)::int count FROM positions WHERE account_id=$1 AND status='open'",[accountId]);
    const errors=validateOrderRisk({entryPrice:price,openPositions:Number(open.rows[0].count),limits:{maxVolume:10,maxOpenPositions:5},side,volume,stopLoss,takeProfit});
    if(errors.length){await client.query("ROLLBACK");return NextResponse.json({error:"Risk validation failed.",details:errors},{status:422});}
    const result=await client.query(`INSERT INTO orders(id,account_id,symbol,side,type,volume,price,stop_loss,take_profit,status) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING id,symbol,side,type,volume,price,stop_loss,take_profit,status,created_at`,[accountId,symbol,side,type,volume,price,stopLoss??null,takeProfit??null]);
    await client.query("COMMIT");return NextResponse.json({ok:true,order:result.rows[0],mode:"demo-persistent"},{status:201});
  }catch{await client.query("ROLLBACK").catch(()=>{});return NextResponse.json({error:"Database transaction failed."},{status:503});}finally{client.release();}
}