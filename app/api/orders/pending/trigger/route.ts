import { NextResponse } from "next/server";
import { getPool } from "@/lib/trading/postgres";
import { demoQuotes } from "@/lib/trading/store";
import { validateOrderRisk } from "@/lib/trading/risk";
import { getServerSession } from "@/lib/trading/session";

export const dynamic = "force-dynamic";

function triggered(type:string,side:string,target:number,bid:number,ask:number){
  if(type==="limit") return side==="buy" ? ask<=target : bid>=target;
  if(type==="stop") return side==="buy" ? ask>=target : bid<=target;
  return false;
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
    const account=(await client.query(`SELECT a.id,a.account_type,a.balance,a.margin,a.free_margin FROM trading_accounts a JOIN users u ON u.id=a.user_id WHERE a.id=$1 AND lower(u.email)=lower($2) FOR UPDATE`,[accountId,session.email])).rows[0];
    if(!account){await client.query("ROLLBACK");return NextResponse.json({error:"Trading account not found."},{status:404});}
    if(account.account_type!=="demo"){await client.query("ROLLBACK");return NextResponse.json({error:"Real-money execution is disabled.",code:"LIVE_EXECUTION_DISABLED"},{status:403});}
    const pending=(await client.query(`SELECT id,symbol,side,type,volume,price,stop_loss,take_profit FROM orders WHERE account_id=$1 AND status='pending' ORDER BY created_at FOR UPDATE`,[accountId])).rows;
    const openCount=Number((await client.query("SELECT COUNT(*)::int AS count FROM positions WHERE account_id=$1 AND status='open'",[accountId])).rows[0].count);
    const filled:any[]=[]; let margin=Number(account.margin);
    for(const order of pending){
      const quote=demoQuotes[order.symbol]; if(!quote||!triggered(order.type,order.side,Number(order.price),quote.bid,quote.ask))continue;
      const entry=order.side==="buy"?quote.ask:quote.bid;
      const errors=validateOrderRisk({entryPrice:entry,openPositions:openCount+filled.length,limits:{maxVolume:10,maxOpenPositions:5},side:order.side,volume:Number(order.volume),stopLoss:order.stop_loss==null?undefined:Number(order.stop_loss),takeProfit:order.take_profit==null?undefined:Number(order.take_profit)});
      if(errors.length)continue;
      const required=Number(order.volume)*entry; const nextMargin=margin+required; const free=Number(account.balance)-nextMargin;
      if(free<0)continue;
      await client.query(`UPDATE orders SET status='filled',price=$1 WHERE id=$2`,[entry,order.id]);
      await client.query(`INSERT INTO positions(id,account_id,order_id,symbol,side,volume,entry_price,stop_loss,take_profit,status) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,'open')`,[accountId,order.id,order.symbol,order.side,order.volume,entry,order.stop_loss,order.take_profit]);
      margin=nextMargin; filled.push({id:order.id,symbol:order.symbol,side:order.side,entryPrice:entry});
    }
    await client.query("UPDATE trading_accounts SET margin=$1,free_margin=$2,equity=balance WHERE id=$3",[margin,Number(account.balance)-margin,accountId]);
    await client.query("COMMIT");
    return NextResponse.json({ok:true,filled,checked:pending.length});
  }catch{await client.query("ROLLBACK").catch(()=>{});return NextResponse.json({error:"Pending-order transaction failed."},{status:503});}
  finally{client.release();}
}