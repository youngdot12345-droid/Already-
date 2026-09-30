import { NextResponse } from "next/server";
import { query } from "@/lib/trading/postgres";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!email || !name) return NextResponse.json({ error: "Name and email are required." }, { status: 400 });

  try {
    const user = await query<{ id: string; email: string; name: string; created_at: string }>(
      `INSERT INTO users (id, email, name) VALUES (gen_random_uuid(), $1, $2)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, email, name, created_at`,
      [email, name]
    );
    const account = await query(
      `INSERT INTO trading_accounts (id, user_id, currency)
       VALUES (gen_random_uuid(), $1, 'USD')
       ON CONFLICT DO NOTHING
       RETURNING id, currency`,
      [user.rows[0].id]
    );
    return NextResponse.json({ user: user.rows[0], account: account.rows[0] ?? null }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Database unavailable or schema is not initialized." }, { status: 503 });
  }
}
