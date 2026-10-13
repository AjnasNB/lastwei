import fs from "node:fs";
import path from "node:path";
import solc from "solc";

export function compile() {
  const files = [
    "LastWeiAccount.sol",
    "LastWeiFactory.sol",
    "DemoCheckout.sol",
    "test/Adversaries.sol",
  ];
  const sources = Object.fromEntries(
    files.map((f) => [
      `contracts/${f}`,
      { content: fs.readFileSync(`contracts/${f}`, "utf8") },
    ]),
  );
  const input = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "shanghai",
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
        },
      },
    },
  };
  const allSources={...sources};
  const output = JSON.parse(
    solc.compile(JSON.stringify(input), {
      import: (file) => {
        try {
          const contents=fs.readFileSync(path.join("node_modules", file), "utf8");
          allSources[file]={content:contents};
          return {contents};
        } catch {
          return { error: `Import missing: ${file}` };
        }
      },
    }),
  );
  const errors = (output.errors ?? []).filter((e) => e.severity === "error");
  if (errors.length)
    throw new Error(errors.map((e) => e.formattedMessage).join("\n"));
  fs.mkdirSync('artifacts',{recursive:true});
  fs.writeFileSync('artifacts/standard-input.json',JSON.stringify({...input,sources:allSources},null,2));
  return Object.fromEntries(
    Object.values(output.contracts).flatMap((group) =>
      Object.entries(group)
        .filter(([, c]) => c.evm.bytecode.object)
        .map(([name, c]) => [
          name,
          {
            abi: c.abi,
            bytecode: `0x${c.evm.bytecode.object}`,
            runtime: `0x${c.evm.deployedBytecode.object}`,
          },
        ]),
    ),
  );
}

if (process.argv[1]?.endsWith("compile.mjs")) {
  const contracts = compile();
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync(
    "artifacts/contracts.json",
    JSON.stringify(contracts, null, 2),
  );
  fs.mkdirSync("src/generated", { recursive: true });
  fs.writeFileSync(
    "src/generated/abi.ts",
    Object.entries(contracts)
      .filter(([n]) =>
        ["LastWeiAccount", "LastWeiFactory", "DemoCheckout"].includes(n),
      )
      .map(
        ([n, c]) => `export const ${n}Abi = ${JSON.stringify(c.abi)} as const;`,
      )
      .join("\n"),
  );
  console.log(
    `Compiled ${Object.keys(contracts).length} contracts with ${solc.version()}`,
  );
}
