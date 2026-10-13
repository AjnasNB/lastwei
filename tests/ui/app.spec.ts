import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

const config = JSON.parse(fs.readFileSync("artifacts/local-evm.json", "utf8"));
test.beforeEach(async ({ page }) => {
  await page.route("**/api/config", (route) => route.fulfill({ json: config }));
  await page.route("**/api/demo/**", (route) =>
    route.fulfill({ status: 404, json: { error: "Run not found" } }),
  );
});
test("simulation completes and refunds; mode remains explicit", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText(
      "Interactive simulation. No wallet, blockchain transactions, or real funds.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Run simulation", exact: true })
    .click();
  await expect(
    page.getByText("Simulation completed", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Demo outcome").selectOption("refund");
  await page
    .getByRole("button", { name: "Run simulation", exact: true })
    .click();
  await expect(
    page.getByText("Simulation refunded", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sponsorship returned." }),
  ).toBeVisible();
});
test("changing contribution recalculates the exact shortfall", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Try a different contribution").fill("95");
  await expect(page.getByText("0.00005 ETH", { exact: true })).toBeVisible();
});
test("desktop and mobile have no horizontal overflow and pass axe", async ({
  page,
}) => {
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Get to the last step." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    const a11y = await new AxeBuilder({ page }).analyze();
    expect(a11y.violations).toEqual([]);
    await page.screenshot({
      path: `artifacts/${size.width === 390 ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
  }
});
test("wallet owner and sponsor complete a real local-EVM checkout through the UI", async ({
  page,
}) => {
  await page.addInitScript(
    ({ owners }) => {
      let ownerIndex = 0;
      const handlers: Record<string, Array<() => void>> = {};
      const request = async ({
        method,
        params = [],
      }: {
        method: string;
        params?: unknown[];
      }) => {
        if (method === "eth_requestAccounts" || method === "eth_accounts")
          return [owners[ownerIndex]];
        if (method === "wallet_switchEthereumChain") return null;
        if (method === "eth_signTypedData_v4" && typeof params[1] === "string")
          params[1] = JSON.parse(params[1]);
        if (method === "eth_sendTransaction") {
          const tx = params[0] as Record<string, string>;
          if (!tx.gas) {
            const estimate = await request({
              method: "eth_estimateGas",
              params: [tx],
            });
            tx.gas = `0x${((BigInt(estimate) * 12n) / 10n).toString(16)}`;
          }
        }
        const result = await fetch("http://127.0.0.1:18546", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        }).then((r) => r.json());
        if (result.error) throw result.error;
        return result.result;
      };
      Object.assign(window, {
        ethereum: {
          request,
          on: (event: string, fn: () => void) =>
            (handlers[event] ??= []).push(fn),
          removeListener: (event: string, fn: () => void) =>
            (handlers[event] = handlers[event]?.filter((x) => x !== fn)),
        },
        switchTestOwner: () => {
          ownerIndex = 1;
          handlers.accountsChanged?.forEach((fn) => fn());
        },
      });
    },
    { owners: config.owners },
  );
  await page.goto("/#wallet");
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await expect(
    page.getByText("Connected to Base Sepolia.", { exact: true }),
  ).toBeVisible();
  const create = page.getByRole("button", {
    name: "Create intent account",
    exact: true,
  });
  if (await create.isVisible()) await create.click();
  await expect(page.locator(".account-info")).toBeVisible();
  await page.getByRole("button", { name: "Deposit", exact: true }).click();
  await expect(
    page.getByText("0.0007 ETH available", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sign checkout intent", exact: true })
    .click();
  const pkg = await page.getByLabel("Signed request package").inputValue();
  expect(JSON.parse(pkg).chainId).toBe(84532);
  await page.evaluate(() => {
    (window as unknown as { switchTestOwner: () => void }).switchTestOwner();
  });
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await page.getByLabel("Signed request JSON").fill(pkg);
  await page
    .getByRole("button", { name: "Inspect request", exact: true })
    .click();
  await expect(
    page.getByText(
      "Verified the owner, factory, destination, calldata, and signature.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Fund shortfall", exact: true })
    .click();
  await expect(page.getByText("Funded", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Execute payment", exact: true })
    .click();
  await expect(page.getByText("Executed", { exact: true })).toBeVisible();
});
