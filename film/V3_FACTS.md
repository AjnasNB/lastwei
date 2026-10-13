# LastWei v3 facts and rights review

Reviewed 2026-10-13, 11:27 IST. Research scope: source/asset facts, not final-frame visual approval. The founder composition is still being edited; the product v3 composition and final renders require a subsequent check. No private keys were read, no transaction was sent, and no upload occurred.

## Findings requiring the director's attention

- The current founder payment document abbreviates target, data hash and nonce through `short()`. That is readable, but it does not display full values. Include a readable full-field proof view or reference before claiming the video contains full transaction data.
- Failed execution retains escrow. Expiry alone does not send funds: a caller must submit `reclaim(intentId)`, which restores the owner's available contribution and credits the sponsor. The sponsor then calls `withdrawRefund(recipient)` separately. Animation must preserve those distinct states.
- The moving signature document is a protocol illustration, not a captured wallet signature. Real UI captures are the evidence. The captured terminal completion and refund belong to two different historical demo runs; do not imply a single intent both executed and refunded.
- Tests support the listed properties; they do not establish a security audit, universal wallet compatibility, L1 finality, real workshop access, or validated market demand. The public demonstration uses two server-controlled test identities.
- Include the required Pure music credit in each uploaded video's description. Add “trimmed and mixed for this video” to disclose the changes. No Content ID claim is known in catalog metadata; this is not a guarantee against a future claim.

## Verified protocol claims

| Claim | Verdict and evidence |
| --- | --- |
| Owner 0.0007 ETH + sponsor 0.0003 ETH = checkout payment 0.001 ETH | Verified. `contracts/LastWeiAccount.sol:81` enforces exact difference; `:87` reserves the owner's contribution. `public/evidence/chain-proof.json` records funding and Purchased event amounts. |
| Signed action binds target, full value, calldata hash, contribution, nonce, deadline, account and chain | Verified. `contracts/LastWeiAccount.sol:31`, `:62`, `:70`; mutation/domain tests at `tests/contracts.test.mjs:256` and `:277`. The actual public funding input was decoded again read-only and matched every field of `project/assets/intent.json`; `keccak256(purchase(actual beneficiary))` matched its dataHash; on-chain `hashIntent` matched its intentId. |
| An altered execution call cannot redirect the purchase | Verified. `contracts/LastWeiAccount.sol:100`, `tests/contracts.test.mjs:316`. |
| Failed call retains funded state and locked money | Verified. `contracts/LastWeiAccount.sol:104` reverts on target failure; `tests/contracts.test.mjs:334` mines a reverted transaction and checks state/accounting. |
| Reclaim credits sponsor; only sponsor withdraws its credit | Verified. `contracts/LastWeiAccount.sol:109`, `:130`, `:149`; expiry and theft/double-withdraw tests at `tests/contracts.test.mjs:398` and `:374`. |
| Replay and reentrancy protection are tested | Verified. `tests/contracts.test.mjs:295`, `:307`, `:478`; authentic exported excerpts in `project/assets/tests-source.json`. `artifacts/final-tests.txt` records 27 passing tests, zero failures; this includes 21 contract and six relay tests. |
| Base Sepolia, chain 84532, test ETH | Verified. `deployments/base-sepolia.json:2`, `docs/DEPLOYMENT.md:3`. Scope/limitations are explicit in `docs/SECURITY.md`. |
| All three contracts have exact Sourcify source matches | Verified afresh by read-only GET to `https://sourcify.dev/server/v2/contract/84532/<address>`: factory match 56031474, checkout 56031475, account 56031476; every response has `creationMatch=exact_match` and `runtimeMatch=exact_match`. Do not call this an audit or claim Etherscan verification. |

## Genuine public receipts

Read-only RPC recheck confirmed all five receipts successful at their recorded blocks. The full hashes below are in `public/evidence/chain-proof.json`; `scripts/verify-chain.mjs` also verifies exact funding/payment/refund amounts and checkout beneficiary.

- Completion funding: `0x78476f0f355288b45f734bae5490c9b15680265183768f9f9ac5dcb5b0f3d610`; execution: `0x43961b25026edbba7b9632b032fa467f5036e9f1fa44933c2070e142935a5f1f`.
- Refund-path funding: `0x9b0717efd5799925b3940fdb6a2a08ea6f2bbd2c59bc067fa85d516736560417`; reclaim: `0x9439996ff1b2c9dcbfa431779cbe09154a531ca373753d747ab5c4647078f15e`; sponsor withdrawal: `0x891440d1b8c820b5e0cb79f36f661dae35bbc5ae751e762fa213f6277f5f9272`.
- Genuine completion nonce is `277921402055512697045550223521318555419`, not zero. Data hash is `0x8d1f72cce3371ffd23ae529695d7cf1797d5296cdb38fc061c7a34b8c647c465`. Its deadline `1791865966` is historical, not a live pending authorization.
- Updated UI capture provenance: `artifacts/v3-capture-provenance.json` records production GET responses and genuine funding input decoding. No fresh demo budget or wallet write was used for these captures.

## Asset rights

| Asset | Source/license | Result |
| --- | --- | --- |
| Founder footage and original human voice | User-provided WhatsApp video; explicit editing permission | Authorized for requested film. No synthetic replacement voice. |
| Product UI captures and LastWei mark | Project-owned UI; mark generated by `scripts/create-logo.py` | Original project media; no unlicensed third-party stock logo required. |
| Geist 500/700 and Geist Mono 400 WOFF2 | `node_modules/@fontsource/geist/LICENSE` and `geist-mono/LICENSE`: SIL OFL 1.1 | Allowed. Preserve their license text if editable sources redistribute font files. |
| Pure by Of Far Different Nature | Composer's [OpenGameArt album page](https://opengameart.org/content/escape-album-14-tracks-deep-massive), accessed 2026-10-13, lists author, CC-BY 4.0 and track 04 Pure | Allowed with attribution. `audio/mix.report.json` and `audio/credits.txt` agree. |
| Tick sound effects | ShowTime synthesized sounds, report `license=generated` | No sampled stock effect required. |
| Native Canvas diagrams/type | Project-authored drawing and supplied fonts | Original graphics; diagrams must remain factual illustrations. |
| Brag bundled Ende track | Redistribution documentation not established | Excluded; no assertion that it is licensed for this release. |

Required music description line:

> "Pure" by Of Far Different Nature (fardifferent.carrd.co), CC-BY 4.0: https://opengameart.org/content/escape-album-14-tracks-deep-massive — trimmed and mixed for this video.

Mix report: 110.133 s, -16.01 integrated LUFS, -1.6 dBTP, voice-to-music 22.67 dB, zero mixer warnings. This verifies levels, not intelligibility of every spoken word. Final playback and motion/overlap inspection remain the director's responsibility.
