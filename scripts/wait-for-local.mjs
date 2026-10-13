import fs from "node:fs";
const until = Date.now() + 60000;
while (Date.now() < until) {
  try {
    if (
      fs.existsSync("artifacts/local-evm.json") &&
      (await fetch("http://127.0.0.1:4173")).ok
    ) {
      console.log("UI test fixtures ready");
      process.exit(0);
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 250));
}
throw new Error("UI test fixtures did not start");
