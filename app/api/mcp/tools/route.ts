import { NextResponse } from "next/server";
import { findMcpTool, MCP_TOOLS } from "@/lib/mcp/tools";
import { recordAudit } from "@/lib/mcp/audit";
import { getServerAiPermissions, hasServerAiPermission } from "@/lib/mcp/server-permissions";

export async function GET() {
  const { session, permissions } = await getServerAiPermissions();
  return NextResponse.json({ protocol:"mcp", authenticated:!!session, tools:MCP_TOOLS, grantedPermissions:permissions, protectedCapabilities:["funds.withdraw","security.change","account.delete","ai.permissions.change"] });
}
export async function POST(request:Request) {
  const { session, permissions } = await getServerAiPermissions();
  if (!session) return NextResponse.json({allowed:false,error:"Authentication required."},{status:401});
  const body=await request.json().catch(()=>({}));
  const name=typeof body.tool==="string"?body.tool:"";
  const tool=findMcpTool(name);
  if(!tool){recordAudit({actor:"ai",action:name||"unknown-tool",allowed:false});return NextResponse.json({allowed:false,error:"Unknown or protected tool."},{status:404});}
  if(!hasServerAiPermission(tool.permission,permissions)){recordAudit({actor:"ai",action:tool.name,allowed:false});return NextResponse.json({allowed:false,error:"AI permission is not enabled on the server."},{status:403});}
  recordAudit({actor:"ai",action:tool.name,allowed:true});
  return NextResponse.json({allowed:true,tool:tool.name,permission:tool.permission});
}