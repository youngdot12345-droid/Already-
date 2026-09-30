import { NextResponse } from "next/server";
import { getPool } from "@/lib/trading/postgres";
import { validateOrderRisk } from "@/lib/trading/risk";
import { demoQuotes } from "@/lib/trading/store";
import type { Side } from "@/lib/trading/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const accountId = typeof body.accountId === "string" ? body.accountId : "";
  const symbol = typeof body.symbol === "string" ? body.symbol.toUpperCase() : "";
  const side = body.side as Side;
  const volume = Number(body.volume);

  if (!accountId || !symbol || !["buy","sell"].includes(side))
    return NextResponse.json({ error:"accountId, symbol and side are required." },{status:400});

  const quote = demoQuotes[symbol];
  if (!quote) return NextResponse.json({ error:"Symbol not supported." },{status:400});

  const entryPrice = side === "buy" ? quote.ask : quote.bid;
  const stopLoss = body.stopLoss === undefined ? undefined : Number(body.stopLoss);
  const takeProfit = body.takeProfit === undefined ? undefined : Number(body.takeProfit);
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const account = await client.query(
      "SELECT id, balance, margin, free_margin FROM trading_accounts WHERE id=$1 FOR UPDATE",
      [accountId]
    );
    if (!account.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error:"Trading account not found." },{status:404});
    }

    const open = await client.query(
      "SELECT COUNT(*)::int AS count FROM positions WHERE account_id=$1 AND status='open'",
      [accountId]
    );

    const errors = validateOrderRisk({
      entryPrice,
      openPositions: Number(open.rows[0].count),
      limits:{maxVolume:10,maxOpenPositions:5},
      side, volume, stopLoss, takeProfit
    });
    if (errors.length) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"Risk validation failed.",details:errors},{status:422});
    }

    const result = await client.query(
      `INSERT INTO orders(id,account_id,symbol,side,type,volume,price,stop_loss,take_profit,status)
       VALUES(gen_random_uuid(),$1,$2,$3,'market',$4,$5,$6,$7,'filled')
       RETURNING id,symbol,side,type,volume,price,stop_loss,take_profit,status,created_at`,
      [accountId,symbol,side,volume,entryPrice,stopLoss??null,takeProfit??null]
    );
    const order=result.rows[0];

    await client.query(
      `INSERT INTO positions(id,account_id,order_id,symbol,side,volume,entry_price,stop_loss,take_profit,status)
       VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,'open')`,
      [accountId,order.id,symbol,side,volume,entryPrice,stopLoss??null,takeProfit??null]
    );

    // Demo margin reservation: keeps account state internally consistent until live pricing is connected.
    const marginRequired = volume * entryPrice;
    const balance = Number(account.rows[0].balance);
    const currentMargin = Number(account.rows[0].margin);
    const newMargin = currentMargin + marginRequired;
    const newFreeMargin = balance - newMargin;
    if (newFreeMargin < 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({error:"Insufficient free margin."},{status:422});
    }

    await client.query(
      "UPDATE trading_accounts SET margin=$1, free_margin=$2, equity=balance WHERE id=$3",
      [newMargin,newFreeMargin,accountId]
    );

    await client.query("COMMIT");
    return NextResponse.json({ok:true,order,mode:"demo-persistent",account:{margin:newMargin,freeMargin:newFreeMargin}});
  } catch {
    await client.query("ROLLBACK").catch(()=>{});
    return NextResponse.json({error:"Database transaction failed."},{status:503});
  } finally {
    client.release();
  }
}
