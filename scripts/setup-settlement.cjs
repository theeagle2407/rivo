/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(process.argv[2] || process.cwd());
const envPath = path.join(root, ".env.local");
process.stdout.write("Paste the second Pollar testnet wallet address: ");

process.stdin.once("data", (chunk) => {
  const address = chunk.toString().trim();
  if (!/^G[A-Z2-7]{55}$/.test(address)) {
    console.error("That is not a valid Stellar public address. Nothing was saved.");
    process.exit(1);
  }
  const current = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const line = `NEXT_PUBLIC_RIVO_SETTLEMENT_ADDRESS=${address}`;
  const next = /^NEXT_PUBLIC_RIVO_SETTLEMENT_ADDRESS=.*$/m.test(current)
    ? current.replace(/^NEXT_PUBLIC_RIVO_SETTLEMENT_ADDRESS=.*$/m, line)
    : `${current.trimEnd()}${current.trim() ? "\n" : ""}${line}\n`;
  fs.writeFileSync(envPath, next, { mode: 0o600 });
  console.log("Rivo settlement wallet saved locally.");
  console.log("Restart npm run dev for the change to take effect.");
});
