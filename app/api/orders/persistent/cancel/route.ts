import { NextResponse } from "next/server";
import { getPool } from "@/lib/trading/postgres";
import { getServerSession } from "@/lib/trading/session";

export async function POST(request:Request){
  const session=await getServerSession();
  if(!session)return NextResponse.json({error:"Authentication required."},{status:401});
  const body=await request.json().catch(()=>({}));
  const orderId=typeof body.orderId==="string"?body.orderId:"";
  if(!orderId)return NextResponse.json({error:"orderId is required."},{status:400});
  try{
    const result=await getPool().query(
      `UPDATE orders o SET status='cancelled'
       FROM trading_accounts a JOIN users u ON u.id=a.user_id
       WHERE o.account_id=a.id AND o.id=$1 AND o.status='pending'
       AND a.account_type='demo' AND lower(u.email)=lower($2)
       RETURNING o.id,o.status`,
      [orderId,session.email]
    );
    if(!result.rows[0])return NextResponse.json({error:"Pending demo order not found."},{status:404});
    return NextResponse.json({ok:true,order:result.rows[0]});
  }catch{return NextResponse.json({error:"Database update failed."},{status:503})}
}