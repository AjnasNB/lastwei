import { useEffect, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseEther,
  formatEther,
  encodeFunctionData,
  keccak256,
  verifyTypedData,
  zeroAddress,
  type Address,
  type Hex,
  type EIP1193Provider,
} from "viem";
import { baseSepolia as sepolia } from "viem/chains";
import { Wallet, Copy, ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import {
  LastWeiFactoryAbi,
  LastWeiAccountAbi,
  DemoCheckoutAbi,
} from "./generated/abi";
import {
  typedIntent,
  intentId,
  serializeIntent,
  type Intent,
} from "./protocol";
import type { NetworkConfig } from "./api";
declare global {
  interface Window {
    ethereum?: EIP1193Provider & {
      on?: (event: string, listener: () => void) => void;
      removeListener?: (event: string, listener: () => void) => void;
    };
  }
}
type Package = {
  account: Address;
  owner: Address;
  chainId: number;
  intent: Intent;
  signature: Hex;
  data: Hex;
};
function parsePackage(raw: string): Package {
  if (raw.length > 12000) throw new Error("Request is too large.");
  const p = JSON.parse(raw);
  if (
    p.chainId !== sepolia.id ||
    !/^0x[\da-f]{40}$/i.test(p.account) ||
    !/^0x[\da-f]{40}$/i.test(p.owner) ||
    !/^0x[\da-f]{130}$/i.test(p.signature) ||
    !/^0x[\da-f]*$/i.test(p.data)
  )
    throw new Error("Invalid Sepolia request package.");
  const i = p.intent;
  if (
    !i ||
    !/^0x[\da-f]{40}$/i.test(i.target) ||
    !/^0x[\da-f]{64}$/i.test(i.dataHash)
  )
    throw new Error("Invalid intent fields.");
  for (const k of ["value", "contribution", "nonce", "deadline"])
    if (typeof i[k] !== "string" || !/^\d{1,78}$/.test(i[k]))
      throw new Error(`Invalid ${k}.`);
  const intent = {
    ...i,
    value: BigInt(i.value),
    contribution: BigInt(i.contribution),
    nonce: BigInt(i.nonce),
    deadline: BigInt(i.deadline),
  } as Intent;
  if (
    intent.value !== parseEther("0.001") ||
    intent.contribution < 0n ||
    intent.contribution >= intent.value
  )
    throw new Error("Only the 0.001 ETH sample checkout is supported.");
  return { ...p, intent } as Package;
}
const clip = (s: string) => `${s.slice(0, 6)}…${s.slice(-4)}`;
export function WalletPanel({ config }: { config: NetworkConfig | null }) {
  const [address, setAddress] = useState<Address | null>(null),
    [account, setAccount] = useState<Address | null>(null),
    [balance, setBalance] = useState(0n);
  const [deposit, setDeposit] = useState("0.0007"),
    [raw, setRaw] = useState(""),
    [imported, setImported] = useState(""),
    [pkg, setPkg] = useState<Package | null>(null);
  const [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [tx, setTx] = useState<Hex | null>(null);
  const [onchainStatus, setOnchainStatus] = useState<number | null>(null);
  const client = createPublicClient({
    chain: sepolia,
    transport: http(config?.rpc ?? "https://base-sepolia-rpc.publicnode.com"),
    cacheTime: 0,
  });
  useEffect(() => {
    const reset = () => {
      setAddress(null);
      setAccount(null);
      setPkg(null);
      setRaw("");
      setImported("");
      setOnchainStatus(null);
      setStatus("Wallet changed. Connect again.");
    };
    window.ethereum?.on?.("accountsChanged", reset);
    window.ethereum?.on?.("chainChanged", reset);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", reset);
      window.ethereum?.removeListener?.("chainChanged", reset);
    };
  }, []);
  function wallet() {
    if (!window.ethereum || !address)
      throw new Error("Connect your wallet first.");
    return createWalletClient({
      chain: sepolia,
      account: address,
      transport: custom(window.ethereum),
    });
  }
  async function refresh(owner: Address) {
    if (!config?.factory) return;
    const a = await client.readContract({
      address: config.factory,
      abi: LastWeiFactoryAbi,
      functionName: "accounts",
      args: [owner],
    });
    if (a === zeroAddress) {
      setAccount(null);
      setBalance(0n);
    } else {
      setAccount(a);
      setBalance(
        await client.readContract({
          address: a,
          abi: LastWeiAccountAbi,
          functionName: "ownerBalance",
        }),
      );
    }
  }
  async function task(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Wallet action failed.";
      setError(
        msg.includes("rejected")
          ? "The wallet request was declined. You can try again."
          : msg.split("\n")[0],
      );
    } finally {
      setBusy(false);
    }
  }
  async function confirm(hash: Hex) {
    setTx(hash);
    setStatus("Waiting for Sepolia confirmation…");
    const r = await client.waitForTransactionReceipt({ hash, timeout: 180000 });
    if (r.status !== "success")
      throw new Error(
        "Transaction reverted. Your intent funds remain protected.",
      );
    setStatus("Transaction confirmed.");
  }
  async function connect() {
    await task(async () => {
      if (!window.ethereum)
        throw new Error("Install or open an Ethereum wallet such as MetaMask.");
      const w = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum),
      });
      const chain = await w.getChainId();
      if (chain !== sepolia.id) {
        await w.switchChain({ id: sepolia.id });
      }
      const [owner] = await w.requestAddresses();
      if (!owner) throw new Error("No wallet selected.");
      setAddress(owner);
      await refresh(owner);
      setStatus("Connected to Base Sepolia.");
    });
  }
  async function sign() {
    await task(async () => {
      if (!account || !address || !config?.checkout)
        throw new Error("Create an account first.");
      const available = await client.readContract({
        address: account,
        abi: LastWeiAccountAbi,
        functionName: "ownerBalance",
      });
      if (available >= parseEther("0.001"))
        throw new Error(
          "This account already has enough ETH. Sponsorship is unnecessary.",
        );
      const data = encodeFunctionData({
        abi: DemoCheckoutAbi,
        functionName: "purchase",
        args: [address],
      });
      const b = await client.getBlock();
      const random = new Uint8Array(16);
      crypto.getRandomValues(random);
      const nonce = BigInt(
        `0x${Array.from(random, (x) => x.toString(16).padStart(2, "0")).join("")}`,
      );
      const intent: Intent = {
        target: config.checkout,
        value: parseEther("0.001"),
        dataHash: keccak256(data),
        contribution: available,
        nonce,
        deadline: b.timestamp + 1800n,
      };
      const signature = await wallet().signTypedData(
        typedIntent(account, sepolia.id, intent),
      );
      const p: Package = {
        account,
        owner: address,
        chainId: sepolia.id,
        intent,
        signature,
        data,
      };
      setRaw(
        JSON.stringify({ ...p, intent: serializeIntent(intent) }, null, 2),
      );
      setStatus("Signed for 30 minutes. Share this request with a sponsor.");
    });
  }
  async function inspect() {
    await task(async () => {
      if (!config?.factory || !config.checkout)
        throw new Error("Deployment unavailable.");
      const p = parsePackage(imported);
      const canonical = await client.readContract({
        address: config.factory,
        abi: LastWeiFactoryAbi,
        functionName: "accounts",
        args: [p.owner],
      });
      if (
        canonical.toLowerCase() !== p.account.toLowerCase() ||
        p.intent.target.toLowerCase() !== config.checkout.toLowerCase()
      )
        throw new Error(
          "Request is not from the published LastWei factory and checkout.",
        );
      if (
        p.data.toLowerCase() !==
          encodeFunctionData({
            abi: DemoCheckoutAbi,
            functionName: "purchase",
            args: [p.owner],
          }).toLowerCase() ||
        keccak256(p.data) !== p.intent.dataHash
      )
        throw new Error(
          "Checkout calldata does not match the named beneficiary.",
        );
      if (
        !(await verifyTypedData({
          ...typedIntent(p.account, sepolia.id, p.intent),
          address: p.owner,
          signature: p.signature,
        }))
      )
        throw new Error("Owner signature is invalid.");
      setPkg(p);
      const s = await client.readContract({
        address: p.account,
        abi: LastWeiAccountAbi,
        functionName: "sponsorships",
        args: [intentId(p.account, sepolia.id, p.intent)],
      });
      setOnchainStatus(s[6]);
      setStatus(
        "Verified the owner, factory, destination, calldata, and signature.",
      );
    });
  }
  async function operate(
    fn: "fund" | "execute" | "reclaim" | "cancel" | "withdrawRefund",
  ) {
    await task(async () => {
      if (!pkg) throw new Error("Inspect a request first.");
      const id = intentId(pkg.account, sepolia.id, pkg.intent);
      let hash: Hex;
      if (fn === "fund") {
        const b = await client.getBlock();
        if (b.timestamp >= pkg.intent.deadline)
          throw new Error(
            "The intent has expired. Ask the owner to sign another.",
          );
        hash = await wallet().writeContract({
          address: pkg.account,
          abi: LastWeiAccountAbi,
          functionName: "fund",
          args: [pkg.intent, pkg.signature],
          value: pkg.intent.value - pkg.intent.contribution,
        });
      } else if (fn === "execute")
        hash = await wallet().writeContract({
          address: pkg.account,
          abi: LastWeiAccountAbi,
          functionName: "execute",
          args: [id, pkg.data],
        });
      else if (fn === "withdrawRefund")
        hash = await wallet().writeContract({
          address: pkg.account,
          abi: LastWeiAccountAbi,
          functionName: "withdrawRefund",
          args: [address!],
        });
      else
        hash = await wallet().writeContract({
          address: pkg.account,
          abi: LastWeiAccountAbi,
          functionName: fn,
          args: [id],
        });
      await confirm(hash);
      const s = await client.readContract({
        address: pkg.account,
        abi: LastWeiAccountAbi,
        functionName: "sponsorships",
        args: [id],
      });
      setOnchainStatus(s[6]);
      if (address) await refresh(address);
    });
  }
  return (
    <div className="wallet-content">
      <div className="wallet-connect">
        <div>
          <Wallet size={24} />
          <div>
            <strong>{address ? clip(address) : "Your Ethereum wallet"}</strong>
            <p>
              {address
                ? "Connected on Sepolia"
                : "Only test ETH. Every transaction is approved in your wallet."}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="primary"
          onClick={connect}
          disabled={busy || !config?.ready}
        >
          {address ? "Reconnect" : "Connect wallet"}
          <ArrowRight size={16} />
        </button>
      </div>
      <div className="wallet-grid">
        <section className="action-panel">
          <span className="eyebrow">01 / OWNER</span>
          <h2>Create and authorize</h2>
          <p>
            Existing MetaMask ETH must first be deposited in your dedicated
            account. Account creation and deposits require wallet gas.
          </p>
          {account ? (
            <div className="account-info">
              <span>
                Intent account{" "}
                <a
                  href={`https://sepolia.basescan.org/address/${account}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {clip(account)}
                  <ArrowUpRight size={12} />
                </a>
              </span>
              <strong>
                {formatEther(balance)} ETH <small>available</small>
              </strong>
            </div>
          ) : (
            <button
              type="button"
              className="secondary wide"
              disabled={!address || busy || !config?.factory}
              onClick={() =>
                task(async () => {
                  await confirm(
                    await wallet().writeContract({
                      address: config!.factory!,
                      abi: LastWeiFactoryAbi,
                      functionName: "createAccount",
                      args: [address!],
                    }),
                  );
                  await refresh(address!);
                })
              }
            >
              Create intent account
            </button>
          )}
          <label className="field-label" htmlFor="deposit">
            Owner deposit (Sepolia ETH)
          </label>
          <div className="input-action">
            <input
              autoComplete="off"
              name="deposit"
              id="deposit"
              inputMode="decimal"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
            />
            <button
              type="button"
              disabled={!account || busy}
              onClick={() =>
                task(async () => {
                  if (
                    !/^0\.\d{1,18}$/.test(deposit) ||
                    parseEther(deposit) <= 0n ||
                    parseEther(deposit) > parseEther("0.01")
                  )
                    throw new Error("Enter between 0 and 0.01 Sepolia ETH.");
                  await confirm(
                    await wallet().sendTransaction({
                      to: account!,
                      value: parseEther(deposit),
                    }),
                  );
                  await refresh(address!);
                })
              }
            >
              Deposit
            </button>
          </div>
          <button
            type="button"
            className="primary wide"
            disabled={!account || busy}
            onClick={sign}
          >
            Sign checkout intent
            <ArrowRight size={16} />
          </button>
          {raw && (
            <>
              <label className="field-label" htmlFor="request">
                Signed request package
              </label>
              <textarea id="request" readOnly value={raw} rows={5} />
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  task(async () => {
                    await navigator.clipboard.writeText(raw);
                    setStatus("Request copied.");
                  })
                }
              >
                <Copy size={16} />
                Copy request
              </button>
              <p className="helper">
                Anyone holding this package can sponsor this exact action until
                expiry. No private key is included.
              </p>
            </>
          )}
          {account && (
            <details>
              <summary>Withdraw available owner ETH</summary>
              <p>Locked contributions cannot be withdrawn.</p>
              <button
                type="button"
                className="secondary"
                disabled={busy || balance === 0n}
                onClick={() =>
                  task(async () => {
                    await confirm(
                      await wallet().writeContract({
                        address: account,
                        abi: LastWeiAccountAbi,
                        functionName: "withdraw",
                        args: [balance, address!],
                      }),
                    );
                    await refresh(address!);
                  })
                }
              >
                Withdraw {formatEther(balance)} ETH
              </button>
            </details>
          )}
        </section>
        <section className="action-panel">
          <span className="eyebrow">02 / SPONSOR OR RELAYER</span>
          <h2>Fund an exact shortfall</h2>
          <p>
            Paste the owner’s request. Review the payment before approving any
            test ETH transaction.
          </p>
          <label className="field-label" htmlFor="import">
            Signed request JSON
          </label>
          <textarea
            id="import"
            value={imported}
            onChange={(e) => {
              setImported(e.target.value);
              setPkg(null);
              setOnchainStatus(null);
            }}
            rows={6}
            placeholder="Paste a LastWei request package"
          />
          <button
            type="button"
            className="secondary wide"
            disabled={!imported || busy}
            onClick={inspect}
          >
            Inspect request
          </button>
          {pkg && (
            <>
              <dl className="amounts compact">
                <div>
                  <dt>Beneficiary</dt>
                  <dd>{clip(pkg.owner)}</dd>
                </div>
                <div>
                  <dt>Exact sponsor value</dt>
                  <dd>
                    {formatEther(pkg.intent.value - pkg.intent.contribution)}{" "}
                    ETH
                  </dd>
                </div>
                <div>
                  <dt>Expires</dt>
                  <dd>
                    {new Date(
                      Number(pkg.intent.deadline) * 1000,
                    ).toLocaleTimeString()}
                  </dd>
                </div>
                <div>
                  <dt>On-chain state</dt>
                  <dd>
                    {
                      [
                        "Not funded",
                        "Funded",
                        "Executed",
                        "Refunded",
                        "Cancelled",
                      ][onchainStatus ?? 0]
                    }
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                className="primary wide"
                disabled={!address || busy || onchainStatus !== 0}
                onClick={() => operate("fund")}
              >
                Fund shortfall
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="secondary wide"
                disabled={!address || busy || onchainStatus !== 1}
                onClick={() => operate("execute")}
              >
                Execute payment
              </button>
              <details>
                <summary>Cancellation and refunds</summary>
                <p>
                  The owner can cancel a funded intent. Anyone can reclaim after
                  expiry. Only the original sponsor can withdraw a refund.
                </p>
                <div className="recovery-buttons">
                  <button
                    type="button"
                    disabled={!address || busy || onchainStatus !== 1}
                    onClick={() => operate("cancel")}
                  >
                    Cancel as owner
                  </button>
                  <button
                    type="button"
                    disabled={!address || busy || onchainStatus !== 1}
                    onClick={() => operate("reclaim")}
                  >
                    Reclaim expired
                  </button>
                  <button
                    type="button"
                    disabled={!address || busy}
                    onClick={() => operate("withdrawRefund")}
                  >
                    Withdraw refund
                  </button>
                </div>
              </details>
            </>
          )}
        </section>
      </div>
      {status && (
        <p className="wallet-status" role="status">
          {status}
        </p>
      )}
      {tx && (
        <a
          className="text-button"
          href={`https://sepolia.basescan.org/tx/${tx}`}
          target="_blank"
          rel="noreferrer"
        >
          View last transaction
          <ArrowUpRight size={14} />
        </a>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
