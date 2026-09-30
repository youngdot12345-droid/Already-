"use client";

import { useState } from "react";
import { Activity, Bot, CandlestickChart, ShieldCheck, Wallet, Settings, UserRound, Bell, Search, ChevronDown } from "lucide-react";

const markets=[
  {symbol:"EUR/USD",bid:"1.17482",ask:"1.17495",change:"+0.32%"},
  {symbol:"GBP/USD",bid:"1.34321",ask:"1.34339",change:"−0.18%"},
  {symbol:"USD/JPY",bid:"147.821",ask:"147.836",change:"+0.11%"},
  {symbol:"XAU/USD",bid:"3,876.42",ask:"3,876.91",change:"+0.47%"},
  {symbol:"BTC/USD",bid:"119,842.10",ask:"119,910.40",change:"−0.26%"},
  {symbol:"ETH/USD",bid:"4,312.20",ask:"4,315.80",change:"+0.84%"},
  {symbol:"US30",bid:"46,220.4",ask:"46,223.1",change:"+0.21%"},
  {symbol:"USOIL",bid:"64.82",ask:"64.91",change:"−0.37%"}
];

export default function Home(){
  const [market,setMarket]=useState(markets[0]);
  const [timeframe,setTimeframe]=useState("1H");
  const [orderType,setOrderType]=useState("Market");
  const [volume,setVolume]=useState("0.10");
  const [oneClick,setOneClick]=useState(false);
  const [activeTab,setActiveTab]=useState("Positions");
  const [aiAccess,setAiAccess]=useState({market:true,account:true,analysis:true,orders:false});

  const toggle=(key:keyof typeof aiAccess)=>setAiAccess(v=>({...v,[key]:!v}));

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><div className="logo">A</div><span>ALREADY</span><small>TRADING TERMINAL</small></div>
      <div className="top-search"><Search size={16}/><input placeholder="Search markets, symbols..." /></div>
      <div className="topicons"><Bell/><Activity/><Wallet/><Settings/><UserRound/></div>
    </header>

    <section className="workspace">
      <aside className="sidebar">
        <div className="section-label">MARKET WATCH <span>8</span></div>
        {markets.map(item=><button className={item.symbol===market.symbol?"market active":"market"} key={item.symbol} onClick={()=>setMarket(item)}>
          <span><b>{item.symbol}</b><small>{item.bid} / {item.ask}</small></span>
          <small className={item.change.startsWith("+")?"up":"down"}>{item.change}</small>
        </button>)}
        <div className="sidebar-group">
          <div className="section-label">WORKSPACE</div>
          <button>⭐ Favorites</button><button>▦ Economic Calendar</button><button>◉ Price Alerts</button><button>▤ Trade History</button>
        </div>
      </aside>

      <section className="terminal">
        <div className="terminal-head">
          <div><h1>{market.symbol} <span className="live-dot"/> </h1><p>Bid {market.bid} · Ask {market.ask} · Spread 1.3 pips</p></div>
          <div className="timeframes">{["1m","5m","15m","1H","4H","1D","1W","1M"].map(t=><button className={t===timeframe?"selected":""} key={t} onClick={()=>setTimeframe(t)}>{t}</button>)}</div>
        </div>

        <div className="chart-toolbar">
          <button>▥ Candles</button><button>↗ Indicators</button><button>╱ Draw</button><button>⚙ Chart</button><button>▣ Layout</button><button>⛶ Fullscreen</button>
        </div>

        <div className="chart">
          <div className="grid"/>
          <div className="chart-empty"><CandlestickChart size={42}/><strong>Already Chart Engine</strong><span>Professional chart workspace</span><small>Live market-data adapter · indicators · drawing tools · multi-chart layouts</small></div>
          <div className="price-line">{market.bid}</div>
        </div>

        <div className="trade-tabs">
          {["Positions","Pending Orders","History"].map(tab=><button className={activeTab===tab?"selected":""} key={tab} onClick={()=>setActiveTab(tab)}>{tab}</button>)}
          <span className="trade-summary">Balance <b>$10,000.00</b> · Equity <b>$10,000.00</b> · Free Margin <b>$10,000.00</b></span>
        </div>
        <div className="trade-table">
          <div className="table-head"><span>SYMBOL</span><span>TYPE</span><span>VOLUME</span><span>OPEN PRICE</span><span>SL / TP</span><span>P/L</span><span>ACTION</span></div>
          <div className="empty-row">No {activeTab.toLowerCase()} yet. Your persistent trading data will appear here.</div>
        </div>
      </section>

      <aside className="rightbar">
        <div className="card order-card">
          <div className="card-title"><span>NEW ORDER</span><button className={oneClick?"selected-mini":""} onClick={()=>setOneClick(v=>!v)}>⚡ {oneClick?"ONE-CLICK ON":"ONE-CLICK"}</button></div>
          <div className="order-symbol">{market.symbol}<ChevronDown size={15}/></div>
          <div className="order-types">{["Market","Limit","Stop"].map(t=><button className={orderType===t?"selected":""} key={t} onClick={()=>setOrderType(t)}>{t}</button>)}</div>
          <label>Volume (lots)<input value={volume} onChange={e=>setVolume(e.target.value)} inputMode="decimal"/></label>
          <div className="order-grid"><label>Stop Loss<input placeholder="Optional"/></label><label>Take Profit<input placeholder="Optional"/></label></div>
          <div className="order-info"><span>Estimated margin <b>$100.00</b></span><span>Spread <b>1.3 pips</b></span><span>Execution <b>Market</b></span></div>
          <div className="order-buttons"><button className="sell">SELL <small>{market.bid}</small></button><button className="buy">BUY <small>{market.ask}</small></button></div>
        </div>

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
        <div className="security"><ShieldCheck/><div><b>Server-side authorization</b><span>Orders, funds and permissions are enforced by the backend.</span></div></div>
      </aside>
    </section>
  </main>
}

function Permission({label,value,onClick}:{label:string,value:boolean,onClick:()=>void}){
  return <button className="permission" onClick={onClick}><span>{label}</span><span className={value?"switch on":"switch"}><i/></span></button>
}