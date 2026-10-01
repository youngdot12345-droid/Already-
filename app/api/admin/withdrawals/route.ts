import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/trading/session";
import { getPool } from "@/lib/trading/postgres";

async function authorize(request:Request){
  const token=request.headers.get("x-admin-token");
  if(!process.env.ADMIN_REVENUE_TOKEN || token!==process.env.ADMIN_REVENUE_TOKEN)return false;
  return !!(await getServerSession());
}

export async function GET(request:Request){
  if(!(await authorize(request)))return NextResponse.json({error:"Admin authorization required."},{status:403});
  try{
    const result=await getPool().query(
      `SELECT w.id,w.amount,w.currency,w.status,w.created_at,
              u.email,pm.provider,pm.account_reference
       FROM withdrawals w
       JOIN users u ON u.id=w.user_id
       LEFT JOIN payout_methods pm ON pm.id=w.payout_method_id
       ORDER BY w.created_at DESC
       LIMIT 200`
    );
    return NextResponse.json({withdrawals:result.rows,aiAccess:false});
  }catch{
    return NextResponse.json({error:"Database unavailable."},{status:503});
  }
}