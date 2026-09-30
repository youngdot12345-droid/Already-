import { NextResponse } from "next/server";
import { getPool } from "@/lib/trading/postgres";
import { demoQuotes } from "@/lib/trading/store";
import { canAi } from "@/lib/mcp/permissions";
import { recordAudit } from "@/lib/mcp/audit";

export async function POST(request:Request){
  const body=await request.json().catch(()=>({}));
  const positionId=typeof body.positionId==="string"?body.positionId:"";
  const permissions=Array.isArray(body.permissions)?body.permissions:[];
  if(!canAi("positions.close",permissions)){
    recordAudit({actor:"ai",action:"positions.close",allowed:false});
    return NextResponse.json({error:"Position-close permission is not granted."},{status:403});
  }
  if(!positionId)return NextResponse.json({error:"positionId is required."},{status:400});

  const client=await getPool().connect();
  try{
    await client.query("BEGIN");
    const r=await client.query(
      `SELECT id,account_id,symbol,side,volume,entry_price
       FROM positions WHERE id=$1 AND status='open' FOR UPDATE`,[positionId]);
    const p=r.rows[0];
    if(!p){await client.query("ROLLBACK");return NextResponse.json({error:"Open position not found."},{status:404});}

    const quote=demoQuotes[p.symbol];
    if(!quote){await client.query("ROLLBACK");return NextResponse.json({error:"No close price available for symbol."},{status:422});}
    const closePrice=p.side==="buy"?quote.bid:quote.ask;
    const pnl=(p.side==="buy"?closePrice-Number(p.entry_price):Number(p.entry_price)-closePrice)*Number(p.volume);

    const account=await client.query(
      "SELECT balance,margin FROM trading_accounts WHERE id=$1 FOR UPDATE",[p.account_id]);
    if(!account.rows[0]){await client.query("ROLLBACK");return NextResponse.json({error:"Trading account not found."},{status:404});}

    const releasedMargin=Number(p.volume)*Number(p.entry_price);
    const newBalance=Number(account.rows[0].balance)+pnl;
    const newMargin=Math.max(0,Number(account.rows[0].margin)-releasedMargin);
    const newFreeMargin=newBalance-newMargin;

    const closed=await client.query(
      `UPDATE positions SET status='closed',closed_at=NOW()
       WHERE id=$1 AND status='open'
       RETURNING id,account_id,symbol,side,volume,entry_price,closed_at`,[positionId]);

    await client.query(
      "UPDATE trading_accounts SET balance=$1,equity=$2,margin=$3,free_margin=$4 WHERE id=$5",
      [newBalance,newBalance,newMargin,newFreeMargin,p.account_id]);

    await client.query("COMMIT");
    recordAudit({actor:"ai",action:"positions.close",allowed:true,metadata:{positionId,symbol:p.symbol,realizedPnl:pnl.toString()}});
    return NextResponse.json({ok:true,position:closed.rows[0],closePrice,realizedPnl:pnl,account:{balance:newBalance,equity:newBalance,margin:newMargin,freeMargin:newFreeMargin},mode:"demo"});
  }catch{
    await client.query("ROLLBACK").catch(()=>{});
    return NextResponse.json({error:"Database transaction failed."},{status:503});
  }finally{client.release();}
}
