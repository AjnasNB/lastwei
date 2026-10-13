import fs from "node:fs";
import { createPublicClient, http, decodeEventLog, parseEther } from "viem";
import { baseSepolia } from "viem/chains";
import assert from "node:assert/strict";
import { compile } from "./compile.mjs";
const deployed = JSON.parse(
  fs.readFileSync("deployments/base-sepolia.json", "utf8"),
);
const contracts = compile();
const client = createPublicClient({
  chain: baseSepolia,
  transport: http(deployed.rpc),
  cacheTime: 0,
});
assert.equal(await client.getChainId(), 84532);
for (const key of ["factory", "checkout", "demoAccount"])
  assert.ok(
    (await client.getCode({ address: deployed[key] }))?.length > 2,
    `${key} has code`,
  );
const accountOwner = await client.readContract({
  address: deployed.demoAccount,
  abi: contracts.LastWeiAccount.abi,
  functionName: "owner",
});
assert.equal(accountOwner.toLowerCase(), deployed.demoOwner.toLowerCase());
const ids = [
  "d115b70c-e493-4709-b1b3-ac2a8575cf1b",
  "c79e67ac-7861-461d-8c35-f5eed53a6ded",
];
const proof = [];
for (const id of ids) {
  const run = await fetch(
    `https://lastwei.ajnasnb.workers.dev/api/demo/${id}`,
  ).then((r) => r.json());
  assert.ok(["executed", "refunded"].includes(run.status));
  const receipts = [];
  for (const field of ["fund_tx", "execute_tx", "reclaim_tx", "refund_tx"])
    if (run[field]) {
      const r = await client.getTransactionReceipt({ hash: run[field] });
      assert.equal(r.status, "success");
      const events = r.logs.flatMap((l) => {
        try {
          const abi =
            l.address.toLowerCase() === deployed.checkout.toLowerCase()
              ? contracts.DemoCheckout.abi
              : contracts.LastWeiAccount.abi;
          const e = decodeEventLog({ abi, data: l.data, topics: l.topics });
          return [{ name: e.eventName, args: e.args }];
        } catch {
          return [];
        }
      });
      if (field === "fund_tx") {
        const t = await client.getTransaction({ hash: run[field] });
        assert.equal(t.value, parseEther("0.0003"));
        assert.ok(events.some((e) => e.name === "Funded"));
      }
      if (field === "execute_tx") {
        assert.ok(events.some((e) => e.name === "Executed"));
        const purchase = events.find((e) => e.name === "Purchased");
        assert.ok(purchase);
        assert.equal(purchase.args.value, parseEther("0.001"));
        assert.equal(
          purchase.args.beneficiary.toLowerCase(),
          deployed.demoOwner.toLowerCase(),
        );
      }
      if (field === "reclaim_tx")
        assert.ok(events.some((e) => e.name === "Released"));
      if (field === "refund_tx") {
        const refund = events.find((e) => e.name === "RefundWithdrawn");
        assert.ok(refund);
        assert.equal(refund.args.amount, parseEther("0.0003"));
      }
      receipts.push({
        step: field,
        hash: r.transactionHash,
        block: r.blockNumber.toString(),
        status: r.status,
        events,
      });
    }
  proof.push({ run, receipts });
}
fs.mkdirSync("public/evidence", { recursive: true });
fs.writeFileSync(
  "public/evidence/chain-proof.json",
  JSON.stringify(
    { verifiedAt: new Date().toISOString(), chainId: 84532, proof },
    (_k, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  ),
);
console.log(
  "Verified deployed bytecode presence, immutable owner, exact funding, checkout payment and beneficiary, expiry release and refund amounts against public Base Sepolia receipts.",
);
