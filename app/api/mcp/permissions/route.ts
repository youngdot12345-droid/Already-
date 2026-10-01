import { NextResponse } from "next/server";
import { DEFAULT_AI_PERMISSIONS, NEVER_GRANT } from "@/lib/mcp/permissions";
import { getServerAiPermissions } from "@/lib/mcp/server-permissions";

export async function GET(){
  const {session,permissions}=await getServerAiPermissions();
  return NextResponse.json({protocol:"mcp",authenticated:!!session,defaultPermissions:DEFAULT_AI_PERMISSIONS,grantedPermissions:permissions,protectedPermissions:NEVER_GRANT});
}
export async function POST(){
  const {session,permissions}=await getServerAiPermissions();
  if(!session)return NextResponse.json({error:"Authentication required."},{status:401});
  return NextResponse.json({granted:permissions,denied:NEVER_GRANT,note:"Permissions are server-controlled; client requests cannot grant additional capabilities."});
}