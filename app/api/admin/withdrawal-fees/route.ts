import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/trading/session";
import { getPool } from "@/lib/trading/postgres";

async function authorized(request:Request){
  const token=request.headers.get("x-admin-token");
  if(!process.env.ADMIN_REVENUE_TOKEN || token!==process.env.ADMIN_REVENUE_TOKEN)return false;
  return !!(await getServerSession());
}

export async function GET(request:Request){
  if(!(await authorized(request)))return NextResponse.json({error:"Admin authorization required."},{status:403});
  try{
    const result=await getPool().query(
      `SELECT id,provider,fee_type,fixed_fee,percentage_fee,active,created_at
       FROM withdrawal_fee_rules ORDER BY provider,id`
    );
    return NextResponse.json({rules:result.rows,aiAccess:false});
  }catch{
    return NextResponse.json({error:"Database unavailable."},{status:503});
  }
}