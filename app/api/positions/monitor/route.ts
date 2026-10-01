import { NextResponse } from "next/server";
import { getPool } from "@/lib/trading/postgres";
import { demoQuotes } from "@/lib/trading/store";
import { recordAdminTradeLoss } from "@/lib/trading/admin-ledger";
import { getServerSession } from "@/lib/trading/session";

export const dynamic = "force-dynamic";

function hit(side:string, stopLoss:number|null, takeProfit:number|null, bid:number, ask:number){
  const close=side==="buy"?bid:ask;
  const sl=stopLoss!=null && (side==="buy"?close<=stopLoss:close>=stopLoss);
  const tp=takeProfit!=null && (side==="buy"?close>=takeProfit:close<=takeProfit);
  return {close,sl,tp};
}

export async function POST(request:Request){
  const session=await getServerSession();
  if(!session)return NextResponse.json({error:"Authentication required."},{status:401});
  const body=await request.json().catch(()=>({}));
  const accountId=typeof body.accountId==="string"?body.accountId:"";
  if(!accountId)return NextResponse.json({error:"accountId is required."},{status:400});
  const client=await getPool().connect();
  try{
    await client.query("BEGIN");
    const account=(await client.query(`SELECT a.id,a.account_type,a.balance,a.margin FROM trading_accounts a JOIN users u ON u.id=a.user_id WHERE a.id=$1 AND lower(u.email)=lower($2) FOR UPDATE`,[accountId,session.email])).rows[0];
    if(!account){await client.query("ROLLBACK");return NextResponse.json({error:"Trading account not found."},{status:404});}
    if(account.account_type!=="demo"){await client.query("ROLLBACK");return NextResponse.json({error:"Real-money execution is disabled.",code:"LIVE_EXECUTION_DISABLED"},{status:403});}
    const positions=(await client.query(`SELECT id,symbol,side,volume,entry_price,stop_loss,take_profit FROM positions WHERE account_id=$1 AND status='open' FOR UPDATE`,[accountId])).rows;
    let realized=0; const closed:any[]=[]; const floating:any[]=[];
    for(const p of positions){
      const q=demoQuotes[p.symbol]; if(!q)continue;
      const close=hit(p.side,p.stop_loss==null?null:Number(p.stop_loss),p.take_profit==null?null:Number(p.take_profit),q.bid,q.ask);
      const pnl=(p.side==="buy"?close.close-Number(p.entry_price):Number(p.entry_price)-close.close)*Number(p.volume);
      if(close.sl||close.tp){
        realized+=pnl;
        await client.query("UPDATE positions SET status='closed',closed_at=NOW() WHERE id=$1",[p.id]);
        if(pnl<0)await recordAdminTradeLoss(client,p.id,accountId,Math.abs(pnl));
        closed.push({id:p.id,symbol:p.symbol,reason:close.sl?"stop_loss":"take_profit",closePrice:close.close,realizedPnl:pnl});
      }else floating.push({id:p.id,symbol:p.symbol,side:p.side,volume:Number(p.volume),currentPrice:close.close,floatingPnl:pnl});
    }
    const newBalance=Number(account.balance)+realized;
    const newMargin=Math.max(0,Number(account.margin)-closed.reduce((s,p)=>s+Number(positions.find(x=>x.id===p.id)?.volume||0)*Number(positions.find(x=>x.id===p.id)?.entry_price||0),0));
    const floatingPnl=floating.reduce((s,p)=>s+Number(p.floatingPnl),0);
    await client.query("UPDATE trading_accounts SET balance=$1,equity=$2,margin=$3,free_margin=$4 WHERE id=$5",[newBalance,newBalance+floatingPnl,newMargin,newBalance+floatingPnl-newMargin,accountId]);
    await client.query("COMMIT");
    return NextResponse.json({ok:true,closed,floatingPnl,realizedPnl:realized});
  }catch{await client.query("ROLLBACK").catch(()=>{});return NextResponse.json({error:"Position monitoring transaction failed."},{status:503});}
  finally{client.release();}
}