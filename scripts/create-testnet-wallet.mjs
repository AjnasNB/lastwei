import fs from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
fs.mkdirSync("private", { recursive: true });
const file = "private/testnet-wallet.json";
if (!fs.existsSync(file)) {
  const privateKey = generatePrivateKey();
  fs.writeFileSync(
    file,
    JSON.stringify({
      privateKey,
      address: privateKeyToAccount(privateKey).address,
    }),
    { mode: 0o600 },
  );
}
const { address } = JSON.parse(fs.readFileSync(file, "utf8"));
console.log(`Sepolia test ETH funding address: ${address}`);
