"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePollar } from "@pollar/react";
import { ArrowIcon, CheckIcon, CopyIcon, SwapIcon } from "./icons";
import { RivoLogo } from "./logo";
import { PollarShell } from "./pollar-shell";
import { saveProofRecord } from "./proof-ledger";

type Currency = "NGN" | "GHS" | "KES" | "ZAR";
type Direction = "from-bolivia" | "to-bolivia";
type View = "home" | "dashboard" | "send" | "review" | "settle" | "receipt";
const corridors: Record<Currency, { country: string; flag: string; rate: number; rail: string }> = {
  NGN: { country: "Nigeria", flag: "🇳🇬", rate: 234.65, rail: "Bank transfer" },
  GHS: { country: "Ghana", flag: "🇬🇭", rate: 1.93, rail: "Mobile money" },
  KES: { country: "Kenya", flag: "🇰🇪", rate: 18.84, rail: "M-Pesa" },
  ZAR: { country: "South Africa", flag: "🇿🇦", rate: 2.61, rail: "Bank transfer" },
};
const STELLAR_TESTNET_USDC = {
  type: "credit_alphanum4" as const,
  code: "USDC",
  issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
};
const BOB_PER_USDC = 6.9;
const transferFeeRate = 0.012;
const newReference = () => `RVO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const usdcFromBob = (bob: number) => Math.max(0.01, (bob * (1 - transferFeeRate)) / BOB_PER_USDC).toFixed(2);
const bobValue = (amount: number, currency: Currency, direction: Direction) => direction === "from-bolivia" ? amount : amount / corridors[currency].rate;
const receiveValue = (amount: number, currency: Currency, direction: Direction) => direction === "from-bolivia" ? amount * corridors[currency].rate : amount / corridors[currency].rate;
const number = (value: number, digits = 2) => new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);

function useStoredProfile() {
  const [name, setName] = useState("");
  useEffect(() => { queueMicrotask(() => setName(localStorage.getItem("rivo-profile-name") ?? "")); }, []);
  return { name, save(value: string) { const clean = value.trim(); localStorage.setItem("rivo-profile-name", clean); setName(clean); } };
}

function AppContent() {
  const pollar = usePollar();
  const refreshWalletBalance = pollar.refreshWalletBalance;
  const profile = useStoredProfile();
  const [view, setView] = useState<View>("home");
  const [amount, setAmount] = useState("50");
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [direction, setDirection] = useState<Direction>("from-bolivia");
  const [recipient, setRecipient] = useState("");
  const [account, setAccount] = useState("");
  const [institution, setInstitution] = useState("");
  const [institutionCode, setInstitutionCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bobFunded, setBobFunded] = useState(false);
  const [paymentReference, setPaymentReference] = useState(newReference);
  const profileMenu = useRef<HTMLDivElement>(null);
  const authenticated = pollar.isAuthenticated;
  const walletAddress = pollar.wallet?.address ?? "";
  const txHash = pollar.tx.step === "success" || pollar.tx.step === "submitted" ? pollar.tx.hash : "";
  const settlementAddress = process.env.NEXT_PUBLIC_RIVO_SETTLEMENT_ADDRESS ?? "";
  const txBusy = ["building", "signing", "submitting", "signing-submitting", "building-signing-submitting"].includes(pollar.tx.step);
  const txError = pollar.tx.step === "error" ? (pollar.tx.message || pollar.tx.details || "Transaction failed. Try again.") : "";
  const currentView: View = authenticated && view === "home" ? "dashboard" : view;
  const shortAddress = useMemo(() => walletAddress ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}` : "Wallet", [walletAddress]);
  const connect = () => pollar.openLoginModal();
  const usdcBalance = pollar.walletBalance.step === "loaded"
    ? pollar.walletBalance.data.balances.find((item) => item.code === "USDC")?.available ?? pollar.walletBalance.data.balances.find((item) => item.code === "USDC")?.balance ?? "0"
    : "0";
  const balanceLoading = pollar.walletBalance.step === "idle" || pollar.walletBalance.step === "loading";
  const sendSettlement = async () => {
    if (!/^G[A-Z2-7]{55}$/.test(settlementAddress)) return;
    if (txHash) { pollar.openTxModal(); return; }
    await pollar.sendPayment({
      destination: settlementAddress,
      amount: usdcFromBob(bobValue(Math.max(0, Number(amount) || 0), currency, direction)),
      asset: STELLAR_TESTNET_USDC,
    });
  };
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (profileMenu.current && !profileMenu.current.contains(event.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => {
    if (authenticated) void refreshWalletBalance();
  }, [authenticated, txHash, refreshWalletBalance]);

  if (currentView === "home" && !authenticated) return <Landing amount={amount} setAmount={setAmount} currency={currency} setCurrency={setCurrency} direction={direction} setDirection={setDirection} connect={connect} hasKey/>;

  const copyAddress = async () => { if (walletAddress) { await navigator.clipboard.writeText(walletAddress); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } };
  const signOut = () => { setProfileOpen(false); pollar.logout(); setView("home"); };
  const resetPayment = () => {
    pollar.getClient().resetTransactionState();
    setBobFunded(false);
    setRecipient("");
    setAccount("");
    setInstitution("");
    setInstitutionCode("");
    setPaymentReference(newReference());
  };
  const startPayment = () => { resetPayment(); setView("send"); };
  const finishPayment = () => { resetPayment(); setView("dashboard"); };
  const nav = <header className="app-nav"><button className="logo-button" onClick={() => setView("dashboard")}><RivoLogo/></button><div className="nav-actions"><button className="text-button" onClick={() => pollar.openTxHistoryModal()}>Activity</button><div className="profile-menu" ref={profileMenu}><button className="wallet-pill" aria-expanded={profileOpen} onClick={() => setProfileOpen((value) => !value)}>{pollar.verified && <span className="online-dot"/>}{shortAddress}<span className="chevron">⌄</span></button>{profileOpen && <div className="profile-popover"><div className="profile-heading"><span className="profile-avatar">{profile.name?.charAt(0).toUpperCase() || "R"}</span><span><b>{profile.name || "Rivo account"}</b><small>Stellar wallet</small></span></div><button onClick={copyAddress}><CopyIcon/><span>{copied ? "Address copied" : "Copy address"}</span></button><button onClick={() => { setProfileOpen(false); pollar.openWalletBalanceModal(); }}><span className="menu-icon">◫</span><span>Wallet</span></button><button onClick={() => { setProfileOpen(false); pollar.openEnabledAssetsModal(); }}><span className="menu-icon">◎</span><span>Assets</span></button><button onClick={() => { setProfileOpen(false); pollar.openReceiveModal(); }}><span className="menu-icon">↓</span><span>Receive</span></button><button className="sign-out" onClick={signOut}><span className="menu-icon">↗</span><span>Sign out</span></button></div>}</div></div></header>;
  if (!profile.name) return <Onboarding nav={nav} save={profile.save}/>;
  if (currentView === "dashboard") return <Dashboard nav={nav} name={profile.name} balance={usdcBalance} balanceLoading={balanceLoading} direction={direction} setDirection={setDirection} currency={currency} setCurrency={setCurrency} onSend={startPayment} onReceive={() => pollar.openReceiveModal()} onWallet={() => pollar.openWalletBalanceModal()}/>;
  if (currentView === "send") return <SendFlow nav={nav} amount={amount} setAmount={setAmount} currency={currency} setCurrency={setCurrency} direction={direction} setDirection={setDirection} recipient={recipient} setRecipient={setRecipient} account={account} setAccount={setAccount} institution={institution} setInstitution={setInstitution} institutionCode={institutionCode} setInstitutionCode={setInstitutionCode} onBack={() => setView("dashboard")} onContinue={() => setView("review")}/>;
  const value = Math.max(0, Number(amount) || 0), receive = receiveValue(value, currency, direction);
  const settlementAmount = usdcFromBob(bobValue(value, currency, direction));
  if (currentView === "review") return <Review nav={nav} amount={value} currency={currency} direction={direction} receive={receive} recipient={recipient} account={account} institution={institution} settlementAmount={settlementAmount} onBack={() => setView("send")} onContinue={() => setView("settle")}/>;
  if (currentView === "settle") return <Settle nav={nav} direction={direction} currency={currency} txHash={txHash} txBusy={txBusy} txError={txError} settlementAmount={settlementAmount} settlementReady={/^G[A-Z2-7]{55}$/.test(settlementAddress)} sourceFunded={bobFunded} reference={paymentReference} onBack={() => setView("review")} onFund={() => setBobFunded(true)} onPay={sendSettlement} onComplete={() => setView("receipt")}/>;
  return <Receipt nav={nav} amount={value} currency={currency} direction={direction} receive={receive} recipient={recipient} txHash={txHash} reference={paymentReference} copied={copied} onCopy={() => { navigator.clipboard.writeText(txHash); setCopied(true); }} onDone={finishPayment}/>;
}

function PreviewApp() {
  const [amount, setAmount] = useState("50");
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [direction, setDirection] = useState<Direction>("from-bolivia");
  return <Landing amount={amount} setAmount={setAmount} currency={currency} setCurrency={setCurrency} direction={direction} setDirection={setDirection} connect={() => alert("Add your Pollar public testnet key to continue.")} hasKey={false}/>;
}

export function RivoApp() {
  if (!process.env.NEXT_PUBLIC_POLLAR_API_KEY) return <PreviewApp/>;
  return <PollarShell><AppContent/></PollarShell>;
}

function Landing({ amount, setAmount, currency, setCurrency, direction, setDirection, connect, hasKey }: { amount: string; setAmount(v:string):void; currency:Currency; setCurrency(v:Currency):void; direction:Direction; setDirection(v:Direction):void; connect():void; hasKey:boolean }) {
  const route = corridors[currency], receive = receiveValue(Number(amount) || 0, currency, direction);
  const swap = () => setDirection(direction === "from-bolivia" ? "to-bolivia" : "from-bolivia");
  return <main className="landing"><header className="landing-nav"><RivoLogo/><div className="landing-actions"><a href="#how">How it works</a><button className="text-button" onClick={connect}>Log in</button><button className="primary small" onClick={connect}>Create account</button></div></header><section className="hero"><div className="hero-copy"><p className="eyebrow">Bolivia ↔ Africa</p><h1>Money moves<br/>closer.</h1><p>Two-way local payments.</p><div className="hero-actions"><button className="primary" onClick={connect}>Get started <ArrowIcon/></button><button className="secondary" onClick={connect}>Log in</button></div><div className="infrastructure"><span>Powered by <b>Pollar</b></span><i/><span>Settled on <b>Stellar</b></span></div>{!hasKey && <span className="setup-note">Setup required</span>}</div><div className="quote-card"><label>You send</label><div className="money-field"><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Send amount"/>{direction === "from-bolivia" ? <span>🇧🇴 BOB</span> : <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>{Object.entries(corridors).map(([code,item]) => <option key={code} value={code}>{item.flag} {code}</option>)}</select>}</div><button className="swap" onClick={swap} aria-label="Reverse corridor"><SwapIcon/></button><label>They receive</label><div className="money-field"><strong>{number(receive)}</strong>{direction === "from-bolivia" ? <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>{Object.entries(corridors).map(([code,item]) => <option key={code} value={code}>{item.flag} {code}</option>)}</select> : <span>🇧🇴 BOB</span>}</div><div className="rate"><span>1 BOB = {number(route.rate)} {currency}</span><span className="good-rate">Estimate</span></div><button className="primary full" onClick={connect}>Continue <ArrowIcon/></button></div></section><section className="benefits"><div><b>Two-way</b><span>Bolivia and Africa.</span></div><div><b>Clear</b><span>Know every cost.</span></div><div><b>Secure</b><span>Pollar · Stellar.</span></div></section><section id="how" className="how-section"><div className="how-heading"><p className="eyebrow">How it works</p><h2>Local in. Local out.</h2><p>USDC moves quietly in between.</p></div><div className="how-grid"><article><span>01</span><h3>Choose a direction</h3><p>Bolivia to Africa, or Africa to Bolivia.</p></article><article><span>02</span><h3>Pay locally</h3><p>Use BOB, bank transfer or mobile money.</p></article><article><span>03</span><h3>Receive locally</h3><p>Funds arrive in the recipient&apos;s currency.</p></article></div><div className="corridor-proof"><span>BOB</span><i>→</i><b>USDC · Stellar</b><i>→</i><span>NGN · GHS · KES · ZAR</span></div></section></main>;
}

function Onboarding({ nav, save }: { nav:React.ReactNode; save(v:string):void }) { const [name,setName]=useState(""); return <main className="app-shell">{nav}<section className="center-card compact"><span className="step">1 of 1</span><h2>Welcome to Rivo</h2><p>What should we call you?</p><label>Full name<input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your name" autoFocus/></label><button className="primary full" disabled={!name.trim()} onClick={()=>save(name)}>Continue <ArrowIcon/></button></section></main>; }

function Dashboard({ nav,name,balance,balanceLoading,direction,setDirection,currency,setCurrency,onSend,onReceive,onWallet }:{ nav:React.ReactNode;name:string;balance:string;balanceLoading:boolean;direction:Direction;setDirection(v:Direction):void;currency:Currency;setCurrency(v:Currency):void;onSend():void;onReceive():void;onWallet():void }) { const reverse=()=>setDirection(direction==="from-bolivia"?"to-bolivia":"from-bolivia"); return <main className="app-shell">{nav}<section className="dashboard"><div className="welcome"><p>Welcome back</p><h1>{name.split(" ")[0]}</h1></div><div className="balance-card"><span>Available balance</span><strong className={balanceLoading?"balance-loading":""}>{number(Number(balance))} <small>USDC</small></strong><div className="dashboard-actions"><button className="primary" onClick={onSend}>Send money <ArrowIcon/></button><button className="secondary" onClick={onReceive}>Receive</button><button className="quiet" onClick={onWallet}>Wallet</button></div></div><div className="route-card"><div><small>From</small>{direction === "from-bolivia" ? <strong>🇧🇴 Bolivia · BOB</strong> : <select value={currency} onChange={(e)=>setCurrency(e.target.value as Currency)}>{Object.entries(corridors).map(([code,item])=><option key={code} value={code}>{item.flag} {item.country} · {code}</option>)}</select>}</div><button onClick={reverse} aria-label="Reverse route"><SwapIcon/></button><div><small>To</small>{direction === "from-bolivia" ? <select value={currency} onChange={(e)=>setCurrency(e.target.value as Currency)}>{Object.entries(corridors).map(([code,item])=><option key={code} value={code}>{item.flag} {item.country} · {code}</option>)}</select> : <strong>🇧🇴 Bolivia · BOB</strong>}</div></div></section></main>; }

type Bank = { name: string; code: string };
const operators: Record<"GHS" | "KES", string[]> = { GHS: ["MTN Mobile Money", "Telecel Cash", "AirtelTigo Money"], KES: ["M-Pesa", "Airtel Money"] };

function SendFlow(p:{nav:React.ReactNode;amount:string;setAmount(v:string):void;currency:Currency;setCurrency(v:Currency):void;direction:Direction;setDirection(v:Direction):void;recipient:string;setRecipient(v:string):void;account:string;setAccount(v:string):void;institution:string;setInstitution(v:string):void;institutionCode:string;setInstitutionCode(v:string):void;onBack():void;onContinue():void}) {
  const route = corridors[p.currency];
  const [banks, setBanks] = useState<Bank[]>([]);
  const isBolivia = p.direction === "to-bolivia";
  const isBank = isBolivia || p.currency === "NGN" || p.currency === "ZAR";
  useEffect(() => {
    if (p.currency !== "NGN") return;
    fetch("/api/banks").then((response) => response.json()).then((data) => setBanks(data.banks ?? [])).catch(() => setBanks([]));
  }, [p.currency]);
  const changeCurrency = (value: Currency) => { p.setCurrency(value); p.setInstitution(""); p.setInstitutionCode(""); p.setAccount(""); p.setRecipient(""); };
  const canContinue = Boolean(Number(p.amount) && p.recipient.trim() && p.account.trim() && (!isBank || p.institution));
  return <main className="app-shell">{p.nav}<section className="flow"><button className="back" onClick={p.onBack}>← Back</button><div className="flow-heading"><span>Send money</span><b>1 / 3</b></div><div className="direction-tabs"><button className={p.direction==="from-bolivia"?"active":""} onClick={()=>p.setDirection("from-bolivia")}>Bolivia → Africa</button><button className={p.direction==="to-bolivia"?"active":""} onClick={()=>p.setDirection("to-bolivia")}>Africa → Bolivia</button></div><div className="flow-grid"><div className="form-card"><label>You send<div className="money-field"><input inputMode="decimal" value={p.amount} onChange={(e)=>p.setAmount(e.target.value)}/>{p.direction === "from-bolivia" ? <span>🇧🇴 BOB</span> : <select value={p.currency} onChange={(e)=>changeCurrency(e.target.value as Currency)}>{Object.entries(corridors).map(([code,item])=><option key={code} value={code}>{item.flag} {code}</option>)}</select>}</div></label><label>Destination<div className="destination-field">{isBolivia ? "🇧🇴 Bolivia · BOB" : <select value={p.currency} onChange={(e)=>changeCurrency(e.target.value as Currency)}>{Object.entries(corridors).map(([code,item])=><option key={code} value={code}>{item.flag} {item.country} · {code}</option>)}</select>}</div></label>{isBolivia && <label>Bank<select value={p.institution} onChange={(e)=>p.setInstitution(e.target.value)}><option value="">Select Bolivian bank</option>{["Banco Nacional de Bolivia","Banco Mercantil Santa Cruz","Banco Unión","Banco BISA"].map((bank)=><option key={bank}>{bank}</option>)}</select></label>}{!isBolivia && p.currency === "NGN" && <label>Bank<select value={p.institutionCode} onChange={(e)=>{ const bank=banks.find((item)=>item.code===e.target.value); p.setInstitutionCode(e.target.value); p.setInstitution(bank?.name ?? ""); }}><option value="">Select bank</option>{banks.map((bank)=><option key={bank.code} value={bank.code}>{bank.name}</option>)}</select></label>}{!isBolivia && p.currency === "ZAR" && <label>Bank<select value={p.institution} onChange={(e)=>p.setInstitution(e.target.value)}><option value="">Select bank</option>{["ABSA","Capitec Bank","First National Bank","Nedbank","Standard Bank","TymeBank"].map((bank)=><option key={bank}>{bank}</option>)}</select></label>}{!isBolivia && (p.currency === "GHS" || p.currency === "KES") && <label>Operator<select value={p.institution} onChange={(e)=>p.setInstitution(e.target.value)}><option value="">Select operator</option>{operators[p.currency].map((operator)=><option key={operator}>{operator}</option>)}</select></label>}<label>{isBolivia?"Bank account":route.rail}<input inputMode={isBank?"numeric":"tel"} value={p.account} maxLength={!isBolivia&&p.currency==="NGN"?10:20} onChange={(e)=>p.setAccount(e.target.value.replace(/\s/g,""))} placeholder={!isBolivia&&p.currency==="KES"?"M-Pesa number":!isBolivia&&p.currency==="GHS"?"Mobile money number":"Account number"}/></label><label>Recipient<input value={p.recipient} onChange={(e)=>p.setRecipient(e.target.value)} placeholder="Full name"/></label><button className="primary full" disabled={!canContinue} onClick={p.onContinue}>Review <ArrowIcon/></button></div><Quote amount={Number(p.amount)||0} currency={p.currency} direction={p.direction}/></div></section></main>;
}

function Quote({amount,currency,direction}:{amount:number;currency:Currency;direction:Direction}) { const r=corridors[currency], receive=receiveValue(amount,currency,direction); return <aside className="summary-card"><span>They receive</span><strong>{number(receive)} {direction==="from-bolivia"?currency:"BOB"}</strong><dl><div><dt>Rate</dt><dd>1 BOB = {number(r.rate)} {currency}</dd></div><div><dt>Fee</dt><dd>{number(amount*.012)} {direction==="from-bolivia"?"BOB":currency}</dd></div><div><dt>Delivery</dt><dd>Minutes</dd></div></dl></aside>; }

function Review(p:{nav:React.ReactNode;amount:number;currency:Currency;direction:Direction;receive:number;recipient:string;account:string;institution:string;settlementAmount:string;onBack():void;onContinue():void}) { const r=corridors[p.currency], toBolivia=p.direction==="to-bolivia"; return <main className="app-shell">{p.nav}<section className="center-card"><button className="back" onClick={p.onBack}>← Back</button><div className="flow-heading"><span>Review</span><b>2 / 3</b></div><div className="review-amount"><small>You send</small><strong>{number(p.amount)} {toBolivia?p.currency:"BOB"}</strong><span>↓</span><small>They receive</small><strong>{number(p.receive)} {toBolivia?"BOB":p.currency}</strong></div><dl className="review-list"><div><dt>Recipient</dt><dd>{p.recipient}</dd></div><div><dt>Destination</dt><dd>{toBolivia?"🇧🇴 Bolivia":`${r.flag} ${r.country}`}</dd></div><div><dt>{!toBolivia&&(p.currency==="GHS"||p.currency==="KES")?"Operator":"Bank"}</dt><dd>{p.institution}</dd></div><div><dt>{toBolivia?"Bank account":r.rail}</dt><dd>•••• {p.account.slice(-4)}</dd></div><div><dt>Stellar settlement</dt><dd>{p.settlementAmount} USDC</dd></div><div><dt>Payout</dt><dd className="sandbox-status">Sandbox</dd></div></dl><p className="payment-rail">Wallet by <b>Pollar</b> · USDC on <b>Stellar</b></p><button className="primary full" onClick={p.onContinue}>Confirm <ArrowIcon/></button></section></main>; }

function Settle({nav,direction,currency,txHash,txBusy,txError,settlementAmount,settlementReady,sourceFunded,reference,onBack,onFund,onPay,onComplete}:{nav:React.ReactNode;direction:Direction;currency:Currency;txHash:string;txBusy:boolean;txError:string;settlementAmount:string;settlementReady:boolean;sourceFunded:boolean;reference:string;onBack():void;onFund():void;onPay():Promise<void>;onComplete():void}) { const fromBob=direction==="from-bolivia"; return <main className="app-shell">{nav}<section className="center-card"><button className="back" onClick={onBack}>← Back</button><div className="flow-heading"><span>Pay</span><b>3 / 3</b></div><div className="settlement-ref"><span>Rivo reference</span><b>{reference}</b></div><div className="settle-steps"><div className={sourceFunded?"complete-step":""}><i>{sourceFunded?<CheckIcon/>:"1"}</i><span><b>{sourceFunded?`${fromBob?"BOB":currency} confirmed`:`Confirm ${fromBob?"BOB":currency} payment`}</b><small>{sourceFunded?"Funding reference matched.":fromBob?"Bolivia funding handoff.":"African local-rail handoff."}</small></span><button onClick={onFund} disabled={sourceFunded}>{sourceFunded?"Done":"Confirm"}</button></div><div className={txHash?"complete-step":""}><i>{txHash?<CheckIcon/>:"2"}</i><span><b>Settle {settlementAmount} USDC</b><small>{txHash?"Confirmed on Stellar.":txBusy?"Sending on Stellar…":"Settlement address prefilled."}</small></span><button onClick={() => void onPay()} disabled={!sourceFunded||!settlementReady||txBusy}>{txHash?"View":txBusy?"Sending":"Pay"}</button></div><div><i>3</i><span><b>{fromBob?`${currency} payout`:"BOB payout"}</b><small>Release to the recipient bank.</small></span><button onClick={onComplete} disabled={!txHash}>Complete</button></div></div>{!settlementReady&&<p className="inline-error">Settlement wallet is not configured.</p>}{txError&&<p className="inline-error">{txError}</p>}</section></main>; }

function Receipt(p:{nav:React.ReactNode;amount:number;currency:Currency;direction:Direction;receive:number;recipient:string;txHash:string;reference:string;copied:boolean;onCopy():void;onDone():void}) {
  const toBolivia=p.direction==="to-bolivia";
  const settlementAmount=usdcFromBob(bobValue(p.amount,p.currency,p.direction));
  useEffect(() => {
    if (!p.txHash) return;
    saveProofRecord({
      reference:p.reference,
      direction:p.direction,
      sourceAmount:p.amount,
      sourceCurrency:toBolivia?p.currency:"BOB",
      destinationAmount:p.receive,
      destinationCurrency:toBolivia?"BOB":p.currency,
      settlementAmount,
      txHash:p.txHash,
      createdAt:new Date().toISOString(),
    });
  },[p.txHash,p.reference,p.direction,p.amount,p.currency,p.receive,toBolivia,settlementAmount]);
  return <main className="app-shell">{p.nav}<section className="center-card receipt"><div className="success"><CheckIcon/></div><span>Payment complete</span><h2>{number(p.receive)} {toBolivia?"BOB":p.currency}</h2><p>{p.recipient}</p><dl className="review-list"><div><dt>Paid</dt><dd>{number(p.amount)} {toBolivia?p.currency:"BOB"}</dd></div><div><dt>Reference</dt><dd>{p.reference}</dd></div><div><dt>Settlement</dt><dd>Pollar · Stellar</dd></div><div><dt>Status</dt><dd className="status">Confirmed</dd></div></dl>{p.txHash&&<><small className="proof-label">Stellar transaction</small><button className="hash" onClick={p.onCopy}><span>{p.txHash.slice(0,12)}…{p.txHash.slice(-8)}</span>{p.copied?<CheckIcon/>:<CopyIcon/>}</button><a className="explorer-link" href={`https://stellar.expert/explorer/testnet/tx/${p.txHash}`} target="_blank" rel="noreferrer">View on Stellar Explorer ↗</a><a className="explorer-link" href="/proof">Open settlement proof →</a></>}<button className="primary full" onClick={p.onDone}>Done</button></section></main>;
}
