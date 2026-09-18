import type { Metadata } from "next";
import { ProofLedger } from "@/components/proof-ledger";

export const metadata: Metadata = {
  title: "Settlement proof — Rivo",
  description: "Verifiable Rivo USDC settlements on Stellar testnet.",
};

export default function ProofPage() {
  return <ProofLedger />;
}
