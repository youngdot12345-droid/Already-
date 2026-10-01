import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/trading/session";
import { getPool } from "@/lib/trading/postgres";

export async function GET(){
  const session=await getServerSession();
  if(!session)return NextResponse.json({error:"Authentication required."},{status:401});
  try{
    const result=await getPool().query(
      `SELECT w.id,w.account_id,w.payout_method_id,w.amount,w.currency,w.status,w.created_at,
              pm.provider
       FROM withdrawals w
       JOIN users u ON u.id=w.user_id
       LEFT JOIN payout_methods pm ON pm.id=w.payout_method_id
       WHERE lower(u.email)=lower($1)
       ORDER BY w.created_at DESC
       LIMIT 100`,
      [session.email]
    );
    return NextResponse.json({withdrawals:result.rows});
  }catch{
    return NextResponse.json({error:"Database unavailable."},{status:503});
  }
}