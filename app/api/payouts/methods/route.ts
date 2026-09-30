import { NextResponse } from "next/server";

const PROVIDERS = ["opay","paypal"] as const;
type Provider = typeof PROVIDERS[number];

export async function GET(){
  return NextResponse.json({
    providers: PROVIDERS.map((provider:Provider)=>({
      provider,
      enabled:true,
      aiAccess:false,
      status: provider==="opay" ? "Nigeria payout method" : "International payout method where supported"
    }))
  });
}

export async function POST(request:Request){
  const body=await request.json().catch(()=>({}));
  const provider=typeof body.provider==="string"?body.provider.toLowerCase():"";
  const accountReference=typeof body.accountReference==="string"?body.accountReference.trim():"";
  if(!PROVIDERS.includes(provider as Provider))
    return NextResponse.json({error:"Unsupported payout provider."},{status:400});
  if(!accountReference)
    return NextResponse.json({error:"Payout account reference is required."},{status:400});

  return NextResponse.json({
    ok:true,
    provider,
    accountReference,
    verified:false,
    message:"Payout method saved as pending verification. Provider verification must occur server-side before withdrawals are enabled."
  },{status:201});
}
