import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/trading/session";
import { getPool } from "@/lib/trading/postgres";

export async function GET(){
  const session=await getServerSession();
  if(!session)return NextResponse.json({error:"Authentication required."},{status:401});
  try{
    const result=await getPool().query(
      `SELECT o.id,o.account_id,o.symbol,o.side,o.type,o.volume,o.price,o.stop_loss,o.take_profit,o.status,o.created_at
       FROM orders o JOIN trading_accounts a ON a.id=o.account_id JOIN users u ON u.id=a.user_id
       WHERE lower(u.email)=lower($1)
       ORDER BY o.created_at DESC LIMIT 200`,
      [session.email]
    );
    return NextResponse.json({orders:result.rows});
  }catch{return NextResponse.json({error:"Database unavailable."},{status:503})}
}