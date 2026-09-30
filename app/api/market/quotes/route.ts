import { NextResponse } from "next/server";
import { demoQuotes } from "@/lib/trading/store";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const symbol = new URL(request.url).searchParams.get("symbol")?.toUpperCase();
  if (symbol) {
    const quote = demoQuotes[symbol];
    if (!quote) return NextResponse.json({ error: "Symbol not supported." }, { status: 404 });
    return NextResponse.json({ symbol, quote, source: "demo" });
  }
  return NextResponse.json({ source: "demo", quotes: demoQuotes });
}
