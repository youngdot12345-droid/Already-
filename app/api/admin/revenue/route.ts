import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/trading/session";
import { query } from "@/lib/trading/postgres";

export async function GET(request:Request){
  const token=request.headers.get("x-admin-token");
  if(!process.env.ADMIN_REVENUE_TOKEN || token!==process.env.ADMIN_REVENUE_TOKEN)
    return NextResponse.json({error:"Admin authorization required."},{status:403});
  const session=await getServerSession();
  if(!session)return NextResponse.json({error:"Authentication required."},{status:401});
  try{
    const summary=await query<{source_type:string,total:string}>(
      `SELECT source_type,COALESCE(SUM(amount),0)::text AS total
       FROM platform_revenue_ledger GROUP BY source_type ORDER BY source_type`);
    const total=await query<{total:string}>(`SELECT COALESCE(SUM(amount),0)::text AS total FROM platform_revenue_ledger`);
    return NextResponse.json({currency:"USD",summary:summary.rows,total:total.rows[0]?.total??"0"});
  }catch{return NextResponse.json({error:"Database unavailable."},{status:503})}
}