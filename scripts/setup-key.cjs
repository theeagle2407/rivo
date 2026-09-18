/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(process.argv[2] || process.cwd());
process.stdout.write("Paste your Pollar public testnet key (hidden): ");
process.stdin.setRawMode?.(true);
let key = "";
process.stdin.on("data", (chunk) => {
  const text = chunk.toString();
  if (text === "\u0003") process.exit(130);
  if (text.includes("\n") || text.includes("\r")) {
    process.stdin.setRawMode?.(false); process.stdout.write("\n"); key += text.replace(/[\r\n]/g, "");
    const clean = key.trim();
    if (!/^pub_testnet_[A-Za-z0-9._-]{8,300}$/.test(clean)) { console.error("Key format not recognised. Nothing was saved."); process.exit(1); }
    fs.writeFileSync(path.join(root, ".env.local"), `NEXT_PUBLIC_POLLAR_API_KEY=${clean}\n`, { mode: 0o600 });
    console.log("Pollar key saved locally in .env.local."); process.exit(0);
  }
  key += text;
});
