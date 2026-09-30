"use client";

import { useState } from "react";
import { Activity, Bot, CandlestickChart, ShieldCheck, Wallet, Settings, UserRound } from "lucide-react";

const markets=["EUR/USD","GBP/USD","USD/JPY","XAU/USD","BTC/USD"];

export default function Home(){
  const [market,setMarket]=useState("EUR/USD");
  const [aiAccess,setAiAccess]=useState({market:true,account:true,analysis:true,orders:false,withdraw:false,settings:false});

  const toggle=(key:keyof typeof aiAccess)=>setAiAccess(v=>({...v,[key]:!v}));

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><div className="logo">A</div><span>ALREADY</span></div>
      <div className="topicons"><Activity/><Wallet/><Settings/><UserRound/></div>
    </header>

    <section className="workspace">
      <aside className="sidebar">
        <div className="section-label">MARKETS</div>
        {markets.map((item,i)=><button className={item===market?"market active":"market"} key={item} onClick={()=>setMarket(item)}>
          <span>{item}</span><small className={i%2?"down":"up"}>{i%2?"−0.18%":"+0.32%"}</small>
        </button>)}
      </aside>

      <section className="terminal">
        <div className="terminal-head">
          <div><h1>{market}</h1><p>Demo market · 1H</p></div>
          <div className="timeframes">{["1m","5m","15m","1H","4H","1D"].map(t=><button className={t==="1H"?"selected":""} key={t}>{t}</button>)}</div>
        </div>
        <div className="chart">
          <div className="grid"/>
          <div className="chart-empty"><CandlestickChart size={34}/><span>Market chart engine</span><small>Data adapter will be connected in the next build stage.</small></div>
        </div>
        <div className="statusbar"><span>ACCOUNT <b>Demo</b></span><span>BALANCE <b>$10,000.00</b></span><span>FREE MARGIN <b>$10,000.00</b></span><span>OPEN P/L <b className="up">+$0.00</b></span></div>
      </section>

      <aside className="rightbar">
        <div className="card">
          <div className="card-title"><span>AI CONTROL</span><Bot/></div>
          <p>Connect compatible AI clients through MCP and grant only the permissions the account owner chooses.</p>
          <Permission label="Read market data" value={aiAccess.market} onClick={()=>toggle("market")}/>
          <Permission label="Read account" value={aiAccess.account} onClick={()=>toggle("account")}/>
          <Permission label="Market analysis" value={aiAccess.analysis} onClick={()=>toggle("analysis")}/>
          <Permission label="Trading actions" value={aiAccess.orders} onClick={()=>toggle("orders")}/>
          <div className="locked">🔒 Withdrawals — never exposed to AI</div>
          <div className="locked">🔒 Security/settings — never exposed to AI</div>
        </div>
        <div className="security"><ShieldCheck/><div><b>Server-side authorization</b><span>AI permissions will be enforced by the backend and recorded in an audit log.</span></div></div>
      </aside>
    </section>
  </main>
}

function Permission({label,value,onClick}:{label:string,value:boolean,onClick:()=>void}){
  return <button className="permission" onClick={onClick}><span>{label}</span><span className={value?"switch on":"switch"}><i/></span></button>
}