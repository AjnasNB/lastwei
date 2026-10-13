# Product hypothesis and criticism

The problem is action abandonment over a tiny missing payment value. The first
customer hypothesis is a dApp/merchant/community sponsoring a user's first paid
action. The proposed business is a checkout SDK funded from onboarding budgets;
pricing and conversion lift have not been validated.

## Prior art

- [Circle Paymaster](https://www.circle.com/paymaster): paying gas with USDC.
- [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337): account abstraction and paymasters.
- [OpenZeppelin account utilities](https://docs.openzeppelin.com/contracts/5.x):
  established authorization and cryptographic primitives.
- [Peer / ZKP2P](https://github.com/zkp2p): verified off-chain P2P payment infrastructure.

LastWei's tested scope is native payment-value shortfall escrow with an owner-signed
action and separate gas payer. That is narrower than a fiat on-ramp or a universal
transaction intent solver. No patent, invention, exclusive novelty or competitor-free
claim is made. Colosseum Copilot was not used because no personal access token was supplied.

## Why this MVP

We rejected a rush-built fiat exchange: payment verification, liquidity and customer
obligations would dominate the build. We rejected a universal existing-wallet adapter:
it would need a much larger permission and smart-account integration surface.
We built one checkout action that can be tested for exact funding and recoverability.

## Criticisms and next experiments

| Weakness                                         | Current consequence                                     | Next useful experiment                                                          |
| ------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Dedicated account requires setup and deposit gas | It does not rescue every already-stuck MetaMask payment | Evaluate audited smart-account/7702 adapters with a real merchant               |
| Sponsor must trust the target                    | Call success does not prove economic fairness           | Restrict an SDK to reviewed merchant adapters and visible beneficiary semantics |
| Two transactions from funding to execution       | Funds may sit until expiry if the relayer stops         | Measure reliability; explore a reviewed fund-and-execute path                   |
| No customer validation                           | Conversion lift and willingness to pay are unknown      | Interview five merchants; instrument a controlled checkout experiment           |
| Public demo budget is small                      | Judges may find the relay cap reached                   | Keep recorded real receipts and a self-funded wallet flow available             |
| Not audited                                      | Mainnet deployment would be inappropriate               | Independent review, fuzzing and invariant testing before any real funds         |

Success criterion for a pilot: improved completed-action rate at a bounded subsidy
cost, with clear sponsor controls and no increase in fund loss. Token issuance is
unnecessary for the current hypothesis.

## Implemented review fixes

The interface review identified several concrete problems and repaired them:

- The owner's reserved/spent contribution was described as available. It now reads
  "Owner contribution" and the percentage reads "from owner".
- Simulation could display the same settlement badge as a real transaction. Its
  terminal badge now explicitly reads "Simulated".
- The sponsor review hid key payment semantics. It now shows the total value,
  owner contribution, exact sponsor value, destination, account, beneficiary and
  a dated expiry, with explorer links for the addresses.
- Released escrow was called refunded before withdrawal. The wallet now calls it
  "Escrow released"; sponsor-only withdrawal remains a separate operation.
- Sponsors could attempt an owner-only cancellation. The UI now disables that
  action for the sponsor.
- The skip link changed the wallet route instead of focusing content. It now
  preserves the route and focuses the main region. Small state animations honor
  reduced-motion preferences.
- Budget exhaustion could leave judges without evidence. Verified deployment and
  recorded live receipts are accessible even when a demo cannot start.

These changes passed the 27 contract/relay tests and six browser tests, including
actual two-wallet local-EVM checkout, desktop/mobile accessibility, route/focus,
reduced motion and external-relayer settlement reconciliation. This validation
does not establish production security or customer demand.
