import { NextResponse } from "next/server";
import { DEFAULT_AI_PERMISSIONS, NEVER_GRANT, canAi } from "@/lib/mcp/permissions";

export async function GET(){
  return NextResponse.json({
    protocol:"mcp",
    status:"foundation",
    defaultPermissions:DEFAULT_AI_PERMISSIONS,
    protectedPermissions:NEVER_GRANT
  });
}

export async function POST(request:Request){
  const body=await request.json().catch(()=>({}));
  const requested=Array.isArray(body.permissions)?body.permissions.filter((p:string)=>typeof p==="string"):[];
  const granted=requested.filter((p:string)=>canAi(p,requested));
  return NextResponse.json({
    granted,
    denied:requested.filter((p:string)=>!granted.includes(p)),
    note:"Authorization must be enforced again at the execution service."
  });
}
