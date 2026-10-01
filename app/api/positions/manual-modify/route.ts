import { NextResponse } from "next/server";
import { getPool } from "@/lib/trading/postgres";
import { getServerSession } from "@/lib/trading/session";

export async function POST(request:Request){
  const session=await getServerSession();
  if(!session)return NextResponse.json({error:"Authentication required."},{status:401});
  const body=await request.json().catch(()=>({}));
  const positionId=typeof body.positionId==="string"?body.positionId:"";
  const stopLoss=body.stopLoss==null?null:Number(body.stopLoss);
  const takeProfit=body.takeProfit==null?null:Number(body.takeProfit);
  if(!positionId)return NextResponse.json({error:"positionId is required."},{status:400});
  if(stopLoss!==null&&(!Number.isFinite(stopLoss)||stopLoss<=0))return NextResponse.json({error:"Invalid stop loss."},{status:400});
  if(takeProfit!==null&&(!Number.isFinite(takeProfit)||takeProfit<=0))return NextResponse.json({error:"Invalid take profit."},{status:400});
  try{
    const result=await getPool().query(
      `UPDATE positions p SET stop_loss=$1,take_profit=$2
       FROM trading_accounts a JOIN users u ON u.id=a.user_id
       WHERE p.account_id=a.id AND p.id=$3 AND p.status='open'
       AND a.account_type='demo' AND lower(u.email)=lower($4)
       RETURNING p.id,p.symbol,p.side,p.volume,p.entry_price,p.stop_loss,p.take_profit`,
      [stopLoss,takeProfit,positionId,session.email]
    );
    if(!result.rows[0])return NextResponse.json({error:"Open demo position not found."},{status:404});
    return NextResponse.json({ok:true,position:result.rows[0]});
  }catch{return NextResponse.json({error:"Database update failed."},{status:503})}
}