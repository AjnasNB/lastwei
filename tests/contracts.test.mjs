import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import ganache from "ganache";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  encodeFunctionData,
  hashTypedData,
  keccak256,
  parseEther,
  zeroAddress,
  decodeErrorResult,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { compile } from "../scripts/compile.mjs";

const chain = defineChain({
  id: 31337,
  name: "Local test EVM",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://localhost"] } },
});
const types = {
  Intent: [
    { name: "target", type: "address" },
    { name: "value", type: "uint256" },
    { name: "dataHash", type: "bytes32" },
    { name: "contribution", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};
let provider, client, wallets, contracts;
before(() => {
  contracts = compile();
  provider = ganache.provider({
    chain: { chainId: 31337, hardfork: "shanghai" },
    logging: { quiet: true },
    wallet: { totalAccounts: 5, defaultBalance: 100 },
  });
  client = createPublicClient({
    chain,
    transport: custom(provider),
    pollingInterval: 10,
    cacheTime: 0,
  });
  wallets = Object.values(provider.getInitialAccounts()).map((w) =>
    createWalletClient({
      chain,
      account: privateKeyToAccount(w.secretKey),
      transport: custom(provider),
    }),
  );
});
after(async () => {
  if (provider) await provider.disconnect();
});
async function deploy(name, args = []) {
  const hash = await wallets[0].deployContract({
    ...contracts[name],
    args,
    gas: 10_000_000n,
  });
  const r = await client.waitForTransactionReceipt({ hash });
  assert.equal(r.status, "success");
  return r.contractAddress;
}
async function write(w, address, name, fn, args = [], value = 0n) {
  const hash = await w.writeContract({
    address,
    abi: contracts[name].abi,
    functionName: fn,
    args,
    value,
    gas: 3_000_000n,
  });
  const r = await client.waitForTransactionReceipt({ hash });
  assert.equal(r.status, "success");
  return r;
}
async function read(address, fn, args = []) {
  return client.readContract({
    address,
    abi: contracts.LastWeiAccount.abi,
    functionName: fn,
    args,
  });
}
async function fixture({ targetName = "DemoCheckout", expiry = 3600n } = {}) {
  const account = await deploy("LastWeiAccount", [wallets[0].account.address]);
  const target = await deploy(targetName);
  await client.waitForTransactionReceipt({
    hash: await wallets[0].sendTransaction({
      to: account,
      value: parseEther("0.0007"),
      gas: 100_000n,
    }),
  });
  const data =
    targetName === "DemoCheckout"
      ? encodeFunctionData({
          abi: contracts.DemoCheckout.abi,
          functionName: "purchase",
          args: [wallets[0].account.address],
        })
      : "0x1234";
  const block = await client.getBlock();
  const intent = {
    target,
    value: parseEther("0.001"),
    dataHash: keccak256(data),
    contribution: parseEther("0.0007"),
    nonce: 1n,
    deadline: block.timestamp + expiry,
  };
  const typed = {
    domain: {
      name: "LastWei",
      version: "1",
      chainId: chain.id,
      verifyingContract: account,
    },
    types,
    primaryType: "Intent",
    message: intent,
  };
  const signature = await wallets[0].signTypedData(typed);
  return {
    account,
    target,
    data,
    intent,
    typed,
    signature,
    id: hashTypedData(typed),
  };
}
async function fund(f) {
  await write(
    wallets[1],
    f.account,
    "LastWeiAccount",
    "fund",
    [f.intent, f.signature],
    parseEther("0.0003"),
  );
}
async function rejected(f, fn, args, who = wallets[1], value = 0n, error) {
  const data = encodeFunctionData({
    abi: contracts.LastWeiAccount.abi,
    functionName: fn,
    args,
  });
  await assert.rejects(
    provider.request({
      method: "eth_call",
      params: [
        { to: f.account, from: who.account.address, data, value: toHex(value) },
        "latest",
      ],
    }),
    (e) => {
      assert.equal(e.code, -32000, "Must be an actual EVM revert");
      if (error)
        assert.equal(
          decodeErrorResult({ abi: contracts.LastWeiAccount.abi, data: e.data })
            .errorName,
          error,
        );
      return true;
    },
  );
}
async function invariant(f) {
  const tracked =
    (await read(f.account, "ownerBalance")) +
    (await read(f.account, "totalLocked")) +
    (await read(f.account, "totalRefunds"));
  assert.equal(
    await client.getBalance({ address: f.account }),
    tracked,
    "All ETH belongs to available contribution, locked value, or refund credit",
  );
}

test("EIP-712 digest matches on-chain hash", async () => {
  const f = await fixture();
  assert.equal(await read(f.account, "hashIntent", [f.intent]), f.id);
});
test("exact shortfall and contribution execute atomically through a relayer", async () => {
  const f = await fixture();
  await fund(f);
  assert.equal(await read(f.account, "ownerBalance"), 0n);
  await invariant(f);
  const before = await client.getBalance({ address: f.target });
  await write(wallets[2], f.account, "LastWeiAccount", "execute", [
    f.id,
    f.data,
  ]);
  assert.equal(
    (await client.getBalance({ address: f.target })) - before,
    f.intent.value,
  );
  assert.equal(
    await client.readContract({
      address: f.target,
      abi: contracts.DemoCheckout.abi,
      functionName: "receipts",
      args: [wallets[0].account.address],
    }),
    1n,
  );
  assert.equal((await read(f.account, "sponsorships", [f.id]))[6], 2);
  await invariant(f);
});
test("owner cannot withdraw locked sponsor money or reserved contribution", async () => {
  const f = await fixture();
  await fund(f);
  await rejected(
    f,
    "withdraw",
    [1n, wallets[0].account.address],
    wallets[0],
    0n,
    "InvalidIntent",
  );
  await invariant(f);
});
test("underfunding and overfunding both fail", async () => {
  const f = await fixture();
  for (const amount of [1n, parseEther("0.00031")])
    await rejected(
      f,
      "fund",
      [f.intent, f.signature],
      wallets[1],
      amount,
      "WrongFunding",
    );
});
test("a forged owner signature fails", async () => {
  const f = await fixture();
  const signature = await wallets[2].signTypedData(f.typed);
  await rejected(
    f,
    "fund",
    [f.intent, signature],
    wallets[1],
    parseEther("0.0003"),
    "InvalidSignature",
  );
});
test("changing destination, calldata hash, value, nonce or deadline invalidates the signature", async () => {
  const f = await fixture();
  const another = await deploy("DemoCheckout");
  for (const patch of [
    { target: another },
    { dataHash: keccak256("0xff") },
    { value: f.intent.value + 1n },
    { nonce: 2n },
    { deadline: f.intent.deadline + 1n },
  ]) {
    const mutated = { ...f.intent, ...patch };
    await rejected(
      f,
      "fund",
      [mutated, f.signature],
      wallets[1],
      mutated.value - mutated.contribution,
      "InvalidSignature",
    );
  }
});
test("signatures are bound to the account and chain", async () => {
  const f = await fixture();
  const other = await deploy("LastWeiAccount", [wallets[0].account.address]);
  for (const domain of [
    { ...f.typed.domain, chainId: 1 },
    { ...f.typed.domain, verifyingContract: other },
  ]) {
    const signature = await wallets[0].signTypedData({ ...f.typed, domain });
    await rejected(
      f,
      "fund",
      [f.intent, signature],
      wallets[1],
      parseEther("0.0003"),
      "InvalidSignature",
    );
  }
});
test("funding nonce cannot be reused even with another signature", async () => {
  const f = await fixture();
  await fund(f);
  await rejected(
    f,
    "fund",
    [f.intent, f.signature],
    wallets[1],
    parseEther("0.0003"),
    "NonceUsed",
  );
});
test("execution replay fails", async () => {
  const f = await fixture();
  await fund(f);
  await write(wallets[2], f.account, "LastWeiAccount", "execute", [
    f.id,
    f.data,
  ]);
  await rejected(f, "execute", [f.id, f.data], wallets[2], 0n, "NotFunded");
});
test("changed execution calldata cannot redirect the purchase", async () => {
  const f = await fixture();
  await fund(f);
  const data = encodeFunctionData({
    abi: contracts.DemoCheckout.abi,
    functionName: "purchase",
    args: [wallets[2].account.address],
  });
  await rejected(
    f,
    "execute",
    [f.id, data],
    wallets[2],
    0n,
    "CalldataMismatch",
  );
  await invariant(f);
});
test("a mined failing target call retains funds and the funded status", async () => {
  const f = await fixture({ targetName: "RevertingTarget" });
  await fund(f);
  const hash = await wallets[2].writeContract({
    address: f.account,
    abi: contracts.LastWeiAccount.abi,
    functionName: "execute",
    args: [f.id, f.data],
    gas: 500_000n,
  });
  assert.equal(
    (await client.waitForTransactionReceipt({ hash })).status,
    "reverted",
  );
  assert.equal((await read(f.account, "sponsorships", [f.id]))[6], 1);
  await invariant(f);
});
test("only the owner can cancel; sponsor receives a pull refund", async () => {
  const f = await fixture();
  await fund(f);
  await rejected(f, "cancel", [f.id], wallets[2], 0n, "Unauthorized");
  await write(wallets[0], f.account, "LastWeiAccount", "cancel", [f.id]);
  assert.equal(await read(f.account, "ownerBalance"), f.intent.contribution);
  assert.equal(
    await read(f.account, "refunds", [wallets[1].account.address]),
    parseEther("0.0003"),
  );
  await invariant(f);
  const before = await client.getBalance({
    address: wallets[3].account.address,
  });
  await write(wallets[1], f.account, "LastWeiAccount", "withdrawRefund", [
    wallets[3].account.address,
  ]);
  assert.equal(
    (await client.getBalance({ address: wallets[3].account.address })) - before,
    parseEther("0.0003"),
  );
  await invariant(f);
});
test("refund cannot be stolen or withdrawn twice", async () => {
  const f = await fixture();
  await fund(f);
  await write(wallets[0], f.account, "LastWeiAccount", "cancel", [f.id]);
  await rejected(
    f,
    "withdrawRefund",
    [wallets[2].account.address],
    wallets[2],
    0n,
    "InvalidIntent",
  );
  await write(wallets[1], f.account, "LastWeiAccount", "withdrawRefund", [
    wallets[1].account.address,
  ]);
  await rejected(
    f,
    "withdrawRefund",
    [wallets[1].account.address],
    wallets[1],
    0n,
    "InvalidIntent",
  );
});
test("expiry disallows execution and permissionless reclaim restores both parties", async () => {
  const f = await fixture({ expiry: 30n });
  await fund(f);
  await rejected(f, "reclaim", [f.id], wallets[2], 0n, "NotExpired");
  await provider.request({ method: "evm_increaseTime", params: [31] });
  await provider.request({ method: "evm_mine", params: [] });
  await rejected(f, "execute", [f.id, f.data], wallets[2], 0n, "Expired");
  await write(wallets[2], f.account, "LastWeiAccount", "reclaim", [f.id]);
  assert.equal(await read(f.account, "ownerBalance"), f.intent.contribution);
  assert.equal(
    await read(f.account, "refunds", [wallets[1].account.address]),
    parseEther("0.0003"),
  );
  await invariant(f);
});
test("a revoked unfunded nonce cannot be sponsored", async () => {
  const f = await fixture();
  await rejected(f, "cancelNonce", [1n], wallets[2], 0n, "Unauthorized");
  await write(wallets[0], f.account, "LastWeiAccount", "cancelNonce", [1n]);
  await rejected(
    f,
    "fund",
    [f.intent, f.signature],
    wallets[1],
    parseEther("0.0003"),
    "NonceUsed",
  );
});
test("insufficient owner balance cannot be sponsored", async () => {
  const f = await fixture();
  await write(wallets[0], f.account, "LastWeiAccount", "withdraw", [
    f.intent.contribution,
    wallets[0].account.address,
  ]);
  await rejected(
    f,
    "fund",
    [f.intent, f.signature],
    wallets[1],
    parseEther("0.0003"),
    "InsufficientContribution",
  );
});
test("EOA, self target, zero value and non-shortfall intents are rejected", async () => {
  const f = await fixture();
  for (const patch of [
    { target: zeroAddress },
    { target: f.account },
    { value: 0n },
    { contribution: f.intent.value },
  ])
    await rejected(
      f,
      "fund",
      [{ ...f.intent, ...patch }, f.signature],
      wallets[1],
      0n,
      "InvalidIntent",
    );
});
test("expired and excessive-duration signatures cannot be funded", async () => {
  const f = await fixture();
  const b = await client.getBlock();
  await rejected(
    f,
    "fund",
    [{ ...f.intent, deadline: b.timestamp }, f.signature],
    wallets[1],
    parseEther("0.0003"),
    "Expired",
  );
  await rejected(
    f,
    "fund",
    [{ ...f.intent, deadline: b.timestamp + 8n * 86400n }, f.signature],
    wallets[1],
    parseEther("0.0003"),
    "InvalidIntent",
  );
});
test("reentrant target is blocked and legitimate outer action succeeds", async () => {
  const f = await fixture({ targetName: "ReentrantTarget" });
  f.data = encodeFunctionData({
    abi: contracts.ReentrantTarget.abi,
    functionName: "attack",
  });
  f.intent.dataHash = keccak256(f.data);
  f.signature = await wallets[0].signTypedData(f.typed);
  f.id = hashTypedData(f.typed);
  await write(wallets[0], f.target, "ReentrantTarget", "arm", [
    f.account,
    f.id,
  ]);
  await fund(f);
  await write(wallets[2], f.account, "LastWeiAccount", "execute", [
    f.id,
    f.data,
  ]);
  assert.equal(
    await client.readContract({
      address: f.target,
      abi: contracts.ReentrantTarget.abi,
      functionName: "blocked",
    }),
    true,
  );
  await invariant(f);
});
test("rejecting sponsor recipient cannot block expiry release and may choose another recipient", async () => {
  const f = await fixture({ expiry: 20n });
  const sponsor = await deploy("RejectRefund");
  await write(
    wallets[1],
    sponsor,
    "RejectRefund",
    "fund",
    [f.account, f.intent, f.signature],
    parseEther("0.0003"),
  );
  await provider.request({ method: "evm_increaseTime", params: [21] });
  await provider.request({ method: "evm_mine", params: [] });
  await write(wallets[2], f.account, "LastWeiAccount", "reclaim", [f.id]);
  const hash = await wallets[1].writeContract({
    address: sponsor,
    abi: contracts.RejectRefund.abi,
    functionName: "claim",
    args: [f.account, sponsor],
    gas: 500_000n,
  });
  assert.equal(
    (await client.waitForTransactionReceipt({ hash })).status,
    "reverted",
  );
  assert.equal(
    await read(f.account, "refunds", [sponsor]),
    parseEther("0.0003"),
  );
  await write(wallets[1], sponsor, "RejectRefund", "claim", [
    f.account,
    wallets[1].account.address,
  ]);
  await invariant(f);
});
test("factory creates exactly one account per owner", async () => {
  const factory = await deploy("LastWeiFactory");
  await write(wallets[2], factory, "LastWeiFactory", "createAccount", [
    wallets[0].account.address,
  ]);
  const a = await client.readContract({
    address: factory,
    abi: contracts.LastWeiFactory.abi,
    functionName: "accounts",
    args: [wallets[0].account.address],
  });
  assert.equal(
    (await read(a, "owner")).toLowerCase(),
    wallets[0].account.address.toLowerCase(),
  );
  await write(wallets[2], factory, "LastWeiFactory", "createAccount", [
    wallets[0].account.address,
  ]);
  assert.equal(
    await client.readContract({
      address: factory,
      abi: contracts.LastWeiFactory.abi,
      functionName: "accounts",
      args: [wallets[0].account.address],
    }),
    a,
  );
});
