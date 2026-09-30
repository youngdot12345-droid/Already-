import { NextResponse } from "next/server";
export function GET(){return NextResponse.json({ok:true,service:"already-trading",version:"0.1.0"});}
