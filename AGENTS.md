# LastWei

Use Base Sepolia only for public contract deployments (the user approved this chain after funding it). Never commit wallet keys,
RPC credentials, wallet exports, .dev.vars, or .qarinah. Keep simulations explicitly
labeled. Every change to the funding protocol needs adversarial contract tests.
The public demo must not expose a general-purpose signing or transaction relay.
Run npm run check and npm test before publishing changes.
