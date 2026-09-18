"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RivoLogo } from "./logo";

export type ProofRecord = {
  reference: string;
  direction: "from-bolivia" | "to-bolivia";
  sourceAmount: number;
  sourceCurrency: string;
  destinationAmount: number;
  destinationCurrency: string;
  settlementAmount: string;
  txHash: string;
  createdAt: string;
};

export const PROOF_STORAGE_KEY = "rivo-payment-proofs";

export function saveProofRecord(record: ProofRecord) {
  const existing = JSON.parse(localStorage.getItem(PROOF_STORAGE_KEY) ?? "[]") as ProofRecord[];
  const next = [record, ...existing.filter((item) => item.txHash !== record.txHash)].slice(0, 12);
  localStorage.setItem(PROOF_STORAGE_KEY, JSON.stringify(next));
}

function shortHash(hash: string) {
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

export function ProofLedger() {
  const [records, setRecords] = useState<ProofRecord[]>([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(PROOF_STORAGE_KEY) ?? "[]") as ProofRecord[];
    const timer = window.setTimeout(() => setRecords(saved), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="proof-page">
      <header className="proof-nav">
        <Link href="/" aria-label="Rivo home"><RivoLogo /></Link>
        <Link href="/">Back to Rivo</Link>
      </header>
      <section className="proof-wrap">
        <div className="proof-intro">
          <p className="eyebrow">Settlement proof</p>
          <h1>Verified on Stellar.</h1>
          <p>Local funding and payout are sandbox handoffs. USDC settlement is signed through Pollar and independently visible on Stellar testnet.</p>
        </div>

        <div className="proof-boundary" aria-label="Demo boundary">
          <div><span>Local funding</span><b>Sandbox-confirmed</b></div>
          <i>→</i>
          <div><span>USDC settlement</span><b className="verified">Verified on Stellar</b></div>
          <i>→</i>
          <div><span>Local payout</span><b>Sandbox-completed</b></div>
        </div>

        <div className="proof-list-heading">
          <h2>Completed settlements</h2>
          <span>{records.length} recorded</span>
        </div>

        {records.length === 0 ? (
          <div className="proof-empty">
            <h3>No settlement recorded yet.</h3>
            <p>Complete a Rivo payment in this browser. Its transaction proof will appear here automatically.</p>
            <Link className="primary" href="/">Start a payment</Link>
          </div>
        ) : (
          <div className="proof-list">
            {records.map((record) => (
              <article className="proof-card" key={record.txHash}>
                <div className="proof-card-top">
                  <div><span>Rivo reference</span><b>{record.reference}</b></div>
                  <strong>Confirmed</strong>
                </div>
                <div className="proof-route">
                  <div><span>From</span><b>{record.sourceAmount.toLocaleString()} {record.sourceCurrency}</b></div>
                  <i>→</i>
                  <div><span>To</span><b>{record.destinationAmount.toLocaleString()} {record.destinationCurrency}</b></div>
                </div>
                <dl>
                  <div><dt>Settlement</dt><dd>{record.settlementAmount} USDC</dd></div>
                  <div><dt>Network</dt><dd>Stellar testnet</dd></div>
                  <div><dt>Transaction</dt><dd>{shortHash(record.txHash)}</dd></div>
                  <div><dt>Recorded</dt><dd>{new Date(record.createdAt).toLocaleString()}</dd></div>
                </dl>
                <a href={`https://stellar.expert/explorer/testnet/tx/${record.txHash}`} target="_blank" rel="noreferrer">View on Stellar Explorer ↗</a>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
