import { NextResponse } from "next/server";
import { getPool } from "@/lib/trading/postgres";
import { demoQuotes } from "@/lib/trading/store";
import { recordAudit } from "@/lib/mcp/audit";
import { recordAdminTradeLoss } from "@/lib/trading/admin-ledger";
import { getServerAiPermissions, hasServerAiPermission } from "@/lib/mcp/server-permissions";

export async function POST(request:Request){
  const { session, permissions } = await getServerAiPermissions();
  if(!session)return NextResponse.json({error:"Authentication required."},{status:401});
  if(!hasServerAiPermission("positions.close",permissions)){
    recordAudit({actor:"ai",action:"positions.close",allowed:false});
    return NextResponse.json({error:"AI position-close permission is not enabled for this server."},{status:403});
  }

  const body=await request.json().catch(()=>({}));
  const positionId=typeof body.positionId==="string"?body.positionId:"";
  if(!positionId)return NextResponse.json({error:"positionId is required."},{status:400});

  const client=await getPool().connect();
  try{
    await client.query("BEGIN");
    const r=await client.query(
      `SELECT p.id,p.account_id,p.symbol,p.side,p.volume,p.entry_price,a.account_type
       FROM positions p
       JOIN trading_accounts a ON a.id=p.account_id
       JOIN users u ON u.id=a.user_id
       WHERE p.id=$1 AND p.status='open' AND lower(u.email)=lower($2)
       FOR UPDATE`,[positionId,session.email]);
    const p=r.rows[0];
    if(!p){await client.query("ROLLBACK");return NextResponse.json({error:"Open position not found."},{status:404});}
    if(p.account_type!=="demo"){
      await client.query("ROLLBACK");
      return NextResponse.json({error:"Real-money execution is disabled until a verified broker/execution connection is configured.",code:"LIVE_EXECUTION_DISABLED"},{status:403});
    }

    const quote=demoQuotes[p.symbol];
    if(!quote){await client.query("ROLLBACK");return NextResponse.json({error:"No close price available for symbol."},{status:422});}
    const closePrice=p.side==="buy"?quote.bid:quote.ask;
    const pnl=(p.side==="buy"?closePrice-Number(p.entry_price):Number(p.entry_price)-closePrice)*Number(p.volume);

    const account=await client.query("SELECT balance,margin FROM trading_accounts WHERE id=$1 FOR UPDATE",[p.account_id]);
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

    if(pnl<0)await recordAdminTradeLoss(client,positionId,p.account_id,Math.abs(pnl));

    await client.query("COMMIT");
    recordAudit({actor:"ai",action:"positions.close",allowed:true,metadata:{positionId,symbol:p.symbol,realizedPnl:pnl.toString(),adminTradeLoss:pnl<0?Math.abs(pnl).toString():"0"}});
    return NextResponse.json({ok:true,position:closed.rows[0],closePrice,realizedPnl:pnl,adminRevenue:pnl<0?Math.abs(pnl):0,account:{balance:newBalance,equity:newBalance,margin:newMargin,freeMargin:newFreeMargin},mode:"demo"});
  }catch{
    await client.query("ROLLBACK").catch(()=>{});
    return NextResponse.json({error:"Database transaction failed."},{status:503});
  }finally{client.release();}
}
