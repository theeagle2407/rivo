"use client";
import { PollarProvider } from "@pollar/react";
import type { ReactNode } from "react";
export function PollarShell({ children }: { children: ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_POLLAR_API_KEY;
  if (!apiKey) return <>{children}</>;
  return <PollarProvider client={{ apiKey, stellarNetwork: "testnet", requestTimeoutMs: 10_000, submitTimeoutMs: 30_000, logLevel: "warn" }}>{children}</PollarProvider>;
}
