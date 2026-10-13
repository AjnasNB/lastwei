# Security model and boundaries

## Enforced properties

1. **Intent binding.** EIP-712 domain includes chain ID and verifying account.
   Signed fields are target, full value, calldata hash, reserved contribution,
   unordered nonce and deadline.
2. **Exact funding.** Sponsor value equals full value minus owner contribution.
   Zero value, no shortfall, self target, code-free target and excessive duration
   are rejected. The owner must have the contribution available at funding time.
3. **Reservation.** Funding subtracts the contribution from `ownerBalance`.
   Owner withdrawal cannot access locked payments or sponsor refund credits.
4. **Atomic execution.** The account changes state before the external call and
   uses OpenZeppelin ReentrancyGuard. A failing call reverts the whole transaction,
   including execution state. Execution replay and modified calldata are rejected.
5. **Release.** Owner cancellation or permissionless post-expiry reclaim restores
   the owner's contribution and credits only the original sponsor. Withdrawal is
   a separate call to a sponsor-selected recipient. A rejecting recipient does not
   block release and a failed withdrawal preserves the credit.
6. **Accounting.** Without forced ETH, the account ETH balance equals available
   owner ETH + total locked value + sponsor refund credits.

## What sponsorship does not prove

An authorized destination can still misuse value it receives. The protocol proves
that the specified call succeeded; it does not independently prove delivery of a
good, honest beneficiary behavior, or off-chain settlement. Sponsors must inspect
and trust the target and calldata they fund. A malicious target can forward the
payment to the owner after receiving it. There is no claim that LastWei prevents
such collusion. The public demo and wallet UI accept only the published checkout.

The sample checkout creates a testnet receipt; it grants no real workshop access.
It retains received test ETH and has no withdrawal function. This is deliberately
a narrowly scoped demonstration, not a merchant accounting contract.

## Account limitations

- EOA signatures only; no ERC-1271 contract-wallet validation.
- Not ERC-4337, not a paymaster, not EIP-7702 delegation.
- Native ETH only; no ERC-20 custody or refunds.
- No upgradeability, administrator bypass, fiat provider or bridge.
- Unused signatures can be revoked with `cancelNonce`; a funded intent is already
  committed and can be cancelled by the owner. Cancellation never redirects sponsor funds.
- Forced ETH can exceed tracked balances and is not recoverable through the MVP.
- No guarantee of transaction finality beyond the chain's own consensus. The demo
  displays an L2 receipt after one confirmation, not L1 settlement finality.

## Public demo relay

The service controls independent demo owner/sponsor keys, both created for testnet.
These are demonstration roles, not independent commercial parties. It sends only
fixed-value calls to the published account and checkout. User-wallet transactions
are signed by the user's injected wallet, never by the server.

D1 atomically enforces a global 20-run budget, four starts per hashed IP per day,
and one active signing job. A per-job lease serializes advance calls. Exact signed
raw transactions are persisted before broadcast, allowing identical rebroadcast
after an interrupted request. The raw transaction, client hash and lease are not
returned by the public API. A minute cron advances abandoned jobs.

Origin checks and rate limits reduce accidental abuse; they are not identity
verification and do not make the public testnet budget immune to determined
distributed exhaustion. Exhaustion cannot spend more than the capped demo budget.

## Dependency review

OpenZeppelin 5.4.0 is pinned for the same Shanghai-compatible bytecode used by
local tests and public deployment. Ganache 7.9.2 is a development fixture with
upstream bundled-package advisories. Azure publishing tools are development-only.
Neither is imported into the production application or Worker. Inspect `npm audit`
when changing dependencies; do not assume that a build or passing tests is an audit.

## Residual risk

This code is unaudited and must not hold real funds. Key compromise, a malicious
destination, RPC outages, sequencer delays, wallet UX mistakes and deployment
misconfiguration remain risks. The protocol is small enough to inspect; simplicity
is a design choice, not proof of safety.
