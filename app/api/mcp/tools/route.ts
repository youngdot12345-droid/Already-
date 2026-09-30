import { NextResponse } from "next/server";
import { findMcpTool, MCP_TOOLS } from "@/lib/mcp/tools";
import { recordAudit } from "@/lib/mcp/audit";

export async function GET() {
  return NextResponse.json({ protocol:"mcp", tools:MCP_TOOLS, protectedCapabilities:["funds.withdraw","security.change","account.delete","ai.permissions.change"] });
}
export async function POST(request:Request) {
  const body=await request.json().catch(()=>({}));
  const name=typeof body.tool==="string"?body.tool:"";
  const granted=Array.isArray(body.permissions)?body.permissions:[];
  const tool=findMcpTool(name);
  if(!tool){recordAudit({actor:"ai",action:name||"unknown-tool",allowed:false});return NextResponse.json({allowed:false,error:"Unknown or protected tool."},{status:404});}
  if(!granted.includes(tool.permission)){recordAudit({actor:"ai",action:tool.name,allowed:false});return NextResponse.json({allowed:false,error:"Required AI permission is not granted."},{status:403});}
  recordAudit({actor:"ai",action:tool.name,allowed:true});
  return NextResponse.json({allowed:true,tool:tool.name,permission:tool.permission});
}
