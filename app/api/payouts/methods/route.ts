import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/trading/session";
import { getPool } from "@/lib/trading/postgres";

const PROVIDERS=["opay","paypal"] as const;
type Provider=typeof PROVIDERS[number];

export async function GET(){
  const session=await getServerSession();
  if(!session)return NextResponse.json({error:"Authentication required."},{status:401});
  try{
    const result=await getPool().query(`SELECT pm.id,pm.provider,pm.account_reference,pm.verified,pm.created_at
      FROM payout_methods pm JOIN users u ON u.id=pm.user_id
      WHERE lower(u.email)=lower($1) ORDER BY pm.created_at DESC`,[session.email]);
    return NextResponse.json({providers:PROVIDERS.map(provider=>({provider,enabled:true,aiAccess:false,status:provider==="opay"?"Nigeria payout method":"International payout method where supported"})),methods:result.rows});
  }catch{return NextResponse.json({error:"Database unavailable."},{status:503})}
}

export async function POST(request:Request){
  const session=await getServerSession();
  if(!session)return NextResponse.json({error:"Authentication required."},{status:401});
  const body=await request.json().catch(()=>({}));
  const provider=typeof body.provider==="string"?body.provider.toLowerCase():"";
  const accountReference=typeof body.accountReference==="string"?body.accountReference.trim():"";
  if(!PROVIDERS.includes(provider as Provider))return NextResponse.json({error:"Unsupported payout provider."},{status:400});
  if(!accountReference)return NextResponse.json({error:"Payout account reference is required."},{status:400});
  try{
    const user=(await getPool().query("SELECT id FROM users WHERE lower(email)=lower($1)",[session.email])).rows[0];
    if(!user)return NextResponse.json({error:"User account not found."},{status:404});
    const result=await getPool().query(`INSERT INTO payout_methods(id,user_id,provider,account_reference,verified)
      VALUES($1,$2,$3,$4,false) RETURNING id,provider,account_reference,verified,created_at`,[crypto.randomUUID(),user.id,provider,accountReference]);
    return NextResponse.json({ok:true,method:result.rows[0],message:"Payout method saved as pending verification."},{status:201});
  }catch{return NextResponse.json({error:"Unable to save payout method."},{status:503})}
}