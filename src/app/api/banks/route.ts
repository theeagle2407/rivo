import { NextResponse } from "next/server";

const fallbackBanks = [
  ["Access Bank", "044"], ["Citibank Nigeria", "023"], ["Ecobank Nigeria", "050"],
  ["Fidelity Bank", "070"], ["First Bank of Nigeria", "011"], ["First City Monument Bank", "214"],
  ["Guaranty Trust Bank", "058"], ["Keystone Bank", "082"], ["Polaris Bank", "076"],
  ["Stanbic IBTC Bank", "221"], ["Standard Chartered Bank", "068"], ["Sterling Bank", "232"],
  ["Union Bank of Nigeria", "032"], ["United Bank for Africa", "033"], ["Wema Bank", "035"],
  ["Zenith Bank", "057"],
].map(([name, code]) => ({ name, code }));

export async function GET() {
  return NextResponse.json({ banks: fallbackBanks, source: "sandbox" });
}
