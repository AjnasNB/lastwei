import fs from "node:fs";
import ganache from "ganache";
import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  decodeEventLog,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { compile } from "./compile.mjs";
const server = ganache.server({
  chain: { chainId: 84532, hardfork: "shanghai" },
  wallet: { totalAccounts: 4, defaultBalance: 100 },
  logging: { quiet: true },
});
await server.listen(18546, "127.0.0.1");
const chain = defineChain({
  id: 84532,
  name: "Local Base test fixture",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:18546"] } },
});
const keys = Object.values(server.provider.getInitialAccounts());
const wallet = createWalletClient({
  chain,
  account: privateKeyToAccount(keys[0].secretKey),
  transport: http("http://127.0.0.1:18546"),
});
const client = createPublicClient({
  chain,
  transport: http("http://127.0.0.1:18546"),
  cacheTime: 0,
});
const contracts = compile();
async function deploy(name) {
  const h = await wallet.deployContract({
    abi: contracts[name].abi,
    bytecode: contracts[name].bytecode,
    nonce: await client.getTransactionCount({
      address: wallet.account.address,
      blockTag: "pending",
    }),
  });
  return (await client.waitForTransactionReceipt({ hash: h })).contractAddress;
}
const factory = await deploy("LastWeiFactory"),
  checkout = await deploy("DemoCheckout");
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync(
  "artifacts/local-evm.json",
  JSON.stringify({
    factory,
    checkout,
    chainId: 84532,
    ready: true,
    rpc: "http://127.0.0.1:18546",
    explorer: "https://sepolia.basescan.org",
    remaining: 20,
    owners: Object.keys(server.provider.getInitialAccounts()),
    demoAccount: null,
    demoOwner: null,
  }),
);
console.log(
  "Local EVM ready on http://127.0.0.1:18546; fixture uses disposable generated accounts.",
);
process.on("SIGINT", async () => {
  await server.close();
  process.exit();
});
