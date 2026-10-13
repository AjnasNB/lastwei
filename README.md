# LastWei

**Fund the missing value of one signed action.** LastWei is an open-source,
testnet-only prototype for merchants and communities sponsoring users who are
slightly short of a native ETH payment.

- [Live product](https://lastwei.ajnasnb.workers.dev)
- [Azure mirror](https://wonderful-meadow-00299ce00.4.azurestaticapps.net)
- [Colosseum project](https://colosseum.com/arena/projects/lastwei)
- [Security and limitations](docs/SECURITY.md)
- [Verified deployment and receipts](docs/DEPLOYMENT.md)

## What works

The Solidity account accepts an EOA owner's EIP-712 intent. A sponsor sends exactly
`value - contribution`. Funding reserves the owner's contribution and locks the
whole payment. Anyone can relay execution, but the destination, calldata and value
are fixed by that signature. A reverting destination leaves the escrow untouched.
The owner can cancel; after expiry anyone can reclaim. Refunds use sponsor-only
pull withdrawal, so a rejecting recipient cannot block release.

The React app includes a clearly labeled simulation, a public Base Sepolia demo
with actual receipts, and an injected-wallet flow to create an account, deposit,
sign, inspect a request, sponsor, execute, cancel, reclaim and withdraw.

**This is a minimal dedicated intent account, not an ERC-4337 smart account.** Gas
is paid by a relayer or the transaction-sending wallet. Owner deposits and account
creation still need gas. Existing EOA ETH does not automatically become account
ETH. ERC-1271, fiat, swaps, bridges and mainnet are outside this MVP.

## Example

```text
Sample checkout value      0.0010 ETH
Owner contribution         0.0007 ETH
Sponsor pays exactly       0.0003 ETH
Checkout receives          0.0010 ETH
Gas                        paid separately by the executor
```

The sample checkout creates a non-transferable workshop receipt. It is a test
application, with no redeemable workshop entitlement or monetary value.

## Architecture

```mermaid
sequenceDiagram
    participant Owner
    participant Account as LastWeiAccount
    participant Sponsor
    participant Relayer
    participant Checkout
    Owner->>Account: Deposit contribution
    Owner->>Owner: Sign EIP-712 intent
    Sponsor->>Account: fund(intent, signature) + exact shortfall
    Account->>Account: Reserve contribution; consume nonce
    Relayer->>Account: execute(intentId, calldata), pay gas
    Account->>Checkout: Atomic signed call + full value
    Checkout-->>Owner: Beneficiary receipt
    Note over Account,Sponsor: If expired: reclaim, then sponsor withdrawRefund
```

- `contracts/`: immutable accounts, factory, checkout, adversarial targets.
- `src/`: React/TypeScript frontend and viem wallet integration.
- `worker/`: fixed-purpose testnet relay; cannot accept arbitrary targets or amounts.
- `migrations/`: D1 global budget, job leases and persisted signed-transaction recovery.
- `deployments/base-sepolia.json`: public addresses and deployment hashes, no secrets.
- `scripts/`: reproducible compile/deploy, local EVM, logo and video tooling.

## Run locally

Requires Node 22+ and npm. The lockfile pins the submitted dependency graph.

```sh
npm ci
npm run compile
npm run check
npm test
npm run dev
```

Run the Worker API in another terminal after creating a local `.dev.vars` from
`.dev.vars.example` and configuring your own test-only deployed accounts:

```sh
npx wrangler d1 migrations apply lastwei-demo --local
npm run build
npx wrangler dev --port 8787
```

The simulation works without blockchain credentials. The wallet flow requires the
published Base Sepolia deployment, or the local EVM test fixture.

## Browser integration tests

```sh
npx playwright install chromium
node scripts/local-evm.mjs
```

Keep that disposable EVM running, run `npm run dev -- --port 4173` in another
terminal, then `npm run test:ui`. The tests exercise two independently selected
wallets through actual local-EVM transactions, in addition to desktop/mobile axe
checks. The local EVM is a test fixture; it is not evidence of public-chain deployment.

## Deployment

Cloudflare serves the primary app and D1-backed relay. Azure Static Web Apps serves
a static mirror built with `VITE_API_BASE=https://lastwei.ajnasnb.workers.dev`.
The public network is **Base Sepolia, chain ID 84532**. The user approved Base after
the deployment wallet was funded there. No Ethereum L1 or Arbitrum integration is claimed.

Test-only secret files are gitignored. Never reuse these test accounts on mainnet,
commit keys, or upload wallet exports. Configure your own Cloudflare and Azure
resources before deploying a fork.

## Why this hypothesis

Gas sponsorship and payment-value sponsorship solve different parts of checkout.
Our initial hypothesis is a merchant-funded SDK whose metric is completed paid
actions. LastWei is not presented as the first intent protocol or a proven startup.
See [product hypothesis and prior art](docs/PRODUCT.md).

## Validation

21 adversarial contract tests cover exact funding, signatures, chain/account
binding, replay, mutated calldata, failure rollback, reservation, cancellation,
expiry, rejecting refund recipients and reentrancy. Relay policy tests cover
origins, fixed request shapes, private-field redaction and bounded request bodies.
The public chain has successful completion and expiry/refund receipts.

The test-only Ganache dependency has upstream bundled-package advisories and uses
a JS fallback under Node 24. It is never included in the frontend or Worker bundle.
The prototype has not received an independent security audit.

MIT license. AI-assisted implementation with OpenAI Codex; human founder Ajnas N B.
