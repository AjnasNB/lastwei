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
