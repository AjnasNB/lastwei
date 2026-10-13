import { hashTypedData, keccak256, type Address, type Hex } from "viem";

export const intentTypes = {
  Intent: [
    { name: "target", type: "address" },
    { name: "value", type: "uint256" },
    { name: "dataHash", type: "bytes32" },
    { name: "contribution", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;
export type Intent = {
  target: Address;
  value: bigint;
  dataHash: Hex;
  contribution: bigint;
  nonce: bigint;
  deadline: bigint;
};
export function typedIntent(account: Address, chainId: number, intent: Intent) {
  return {
    domain: {
      name: "LastWei",
      version: "1",
      chainId,
      verifyingContract: account,
    },
    types: intentTypes,
    primaryType: "Intent" as const,
    message: intent,
  };
}
export function intentId(account: Address, chainId: number, intent: Intent) {
  return hashTypedData(typedIntent(account, chainId, intent));
}
export function shortfall(value: bigint, available: bigint) {
  return value > available ? value - available : 0n;
}
export function serializeIntent(intent: Intent) {
  return Object.fromEntries(
    Object.entries(intent).map(([k, v]) => [
      k,
      typeof v === "bigint" ? v.toString() : v,
    ]),
  );
}
export function calldataHash(data: Hex) {
  return keccak256(data);
}
