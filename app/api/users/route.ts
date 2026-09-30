import { NextResponse } from "next/server";
import { query } from "@/lib/trading/postgres";
import { getServerSession } from "@/lib/trading/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error:"Authentication required." },{status:401});

  try {
    const user = await query<{ id:string; email:string; name:string; created_at:string }>(
      `INSERT INTO users (id,email,name)
       VALUES (gen_random_uuid(),$1,$2)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
       RETURNING id,email,name,created_at`,
      [session.email,session.email.split("@")[0]]
    );

    const userId=user.rows[0].id;

    await query(
      `INSERT INTO trading_accounts (id,user_id,account_type,currency,balance,equity,free_margin)
       SELECT gen_random_uuid(),$1,'demo','USD',10000,10000,10000
       WHERE NOT EXISTS (SELECT 1 FROM trading_accounts WHERE user_id=$1 AND account_type='demo')`,
      [userId]
    );

    await query(
      `INSERT INTO trading_accounts (id,user_id,account_type,currency,balance,equity,free_margin)
       SELECT gen_random_uuid(),$1,'real','USD',0,0,0
       WHERE NOT EXISTS (SELECT 1 FROM trading_accounts WHERE user_id=$1 AND account_type='real')`,
      [userId]
    );

    const accounts=await query(
      `SELECT id,account_type,currency,balance,equity,margin,free_margin
       FROM trading_accounts WHERE user_id=$1
       ORDER BY CASE account_type WHEN 'demo' THEN 0 ELSE 1 END`,
      [userId]
    );

    return NextResponse.json({
      user:user.rows[0],
      accounts:accounts.rows,
      demoAccount:accounts.rows.find((x:any)=>x.account_type==="demo")??null,
      realAccount:accounts.rows.find((x:any)=>x.account_type==="real")??null,
      liveExecutionEnabled:false,
      message:"Authenticated account records are ready. Real-money execution remains disabled until a verified broker/execution connection is configured."
    });
  } catch {
    return NextResponse.json({error:"Database unavailable or schema is not initialized."},{status:503});
  }
}
