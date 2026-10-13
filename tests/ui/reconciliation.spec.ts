import { test, expect } from "@playwright/test";
import fs from "node:fs";
const config = JSON.parse(fs.readFileSync("artifacts/local-evm.json", "utf8"));
test("a refund demo executed by another relayer displays the actual execution outcome", async ({
  page,
}) => {
  const id = "af7b5a02-d3cd-4f23-9f5d-39e35e94d787";
  await page.route("**/api/config", (route) => route.fulfill({ json: config }));
  await page.addInitScript(
    (runId) => sessionStorage.setItem("lastwei-run", runId),
    id,
  );
  await page.route(`**/api/demo/${id}`, (route) =>
    route.fulfill({
      json: {
        id,
        kind: "refund",
        status: "executed",
        created_at: 0,
        deadline: 0,
        intent_id: null,
        fund_tx: null,
        execute_tx: null,
        reclaim_tx: null,
        refund_tx: null,
        error: null,
      },
    }),
  );
  await page.goto("/?demo=live");
  await expect(
    page.getByRole("heading", { name: "You’re all set." }),
  ).toBeVisible();
  await expect(
    page.getByText("Action completed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sponsorship returned." }),
  ).toHaveCount(0);
});
