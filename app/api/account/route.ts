import { NextResponse } from "next/server";
import { demoAccount } from "@/lib/trading/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    account: demoAccount,
    mode: "demo",
    note: "Production account data will come from the authenticated database record.",
  });
}
