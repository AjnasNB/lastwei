# Public deployment evidence

Network: **Base Sepolia**, chain ID **84532**. Test ETH only.

| Component           | Address                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Factory             | [`0xd7def713656aee75519a156ee408db77d306f257`](https://sepolia.basescan.org/address/0xd7def713656aee75519a156ee408db77d306f257) |
| Sample checkout     | [`0x0407348ff5372e0a49e92cf364d408a01ee49027`](https://sepolia.basescan.org/address/0x0407348ff5372e0a49e92cf364d408a01ee49027) |
| Demo intent account | [`0x2Ad9e730C902D30Ef267dBcEEFcE859752445193`](https://sepolia.basescan.org/address/0x2Ad9e730C902D30Ef267dBcEEFcE859752445193) |

Deployment hashes are in [`deployments/base-sepolia.json`](../deployments/base-sepolia.json).
The immutable account owner is a separate generated demo EOA. The deployer acts
as demo sponsor and gas payer; both keys are server-controlled test fixtures.

## Completed payment

Intent: `0x6d63fb2fb6e9da5a3a7f094ba10f9b801cb79fdd664d129fb57254ce6225b927`

- [Exact 0.0003 ETH sponsor funding](https://sepolia.basescan.org/tx/0x78476f0f355288b45f734bae5490c9b15680265183768f9f9ac5dcb5b0f3d610)
- [Atomic 0.001 ETH checkout execution](https://sepolia.basescan.org/tx/0x43961b25026edbba7b9632b032fa467f5036e9f1fa44933c2070e142935a5f1f)

The owner contribution was 0.0007 ETH. The checkout receipt is assigned to
`0x3328Bf7790D1035A5d5B36E58c6cd3a20B3836f9`.

## Expiry and refund

Intent: `0x425d5d85c24dba2f9c5b4528986ff6f2aeb7d8c4e6d6817a1fe52911d4985622`

- [Funding](https://sepolia.basescan.org/tx/0x9b0717efd5799925b3940fdb6a2a08ea6f2bbd2c59bc067fa85d516736560417)
- [Post-expiry release of escrow](https://sepolia.basescan.org/tx/0x9439996ff1b2c9dcbfa431779cbe09154a531ca373753d747ab5c4647078f15e)
- [Sponsor-only 0.0003 ETH refund withdrawal](https://sepolia.basescan.org/tx/0x891440d1b8c820b5e0cb79f36f661dae35bbc5ae751e762fa213f6277f5f9272)

These are public-chain transactions, distinct from the UI simulation and local EVM tests.
The L2 transaction receipt is not a claim of immediate Ethereum L1 finality.

## Source verification

Sourcify v2 returned **exact creation and runtime bytecode matches** for all three
deployed contracts on October 13, 2026:

- [Account factory](https://repo.sourcify.dev/84532/0xd7def713656aee75519a156ee408db77d306f257)
- [Sample checkout](https://repo.sourcify.dev/84532/0x0407348ff5372e0a49e92cf364d408a01ee49027)
- [Demo intent account](https://repo.sourcify.dev/84532/0x2Ad9e730C902D30Ef267dBcEEFcE859752445193)

Exact source matching establishes reproducibility; it is not a security audit.

## Hosting

- Cloudflare Worker + static assets + D1: https://lastwei.ajnasnb.workers.dev
- Azure Static Web Apps Free mirror: https://wonderful-meadow-00299ce00.4.azurestaticapps.net
- The mirror uses the Cloudflare API; its exact origin is allowed by the relay's CORS policy.
- Azure Speech F0 provides synthetic narration for the product demo, separately from
  the founder's human-recorded pitch.

The public relay has a global 20-run cap and four starts per hashed IP per day.
Recorded receipts and the user-funded wallet flow remain usable after the cap.
