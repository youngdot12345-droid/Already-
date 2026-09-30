import { NextResponse } from "next/server";
import { listPersistentAudit } from "@/lib/mcp/persistent-audit";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  try{
    const limit=new URL(request.url).searchParams.get("limit")??"100";
    const events=await listPersistentAudit(Number(limit));
    return NextResponse.json({events});
  }catch{
    return NextResponse.json({error:"Database unavailable or audit schema is not initialized."},{status:503});
  }
}
