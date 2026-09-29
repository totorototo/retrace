import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

// The synthetic race from scripts/make-fixtures.mjs, run through the real WASM module.
const fixture = (name) => fileURLToPath(new URL(`../zig/testdata/${name}`, import.meta.url));

test("plan vs actual from a GPX and a FIT", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "retrace" })).toBeVisible();

  await page.getByTestId("gpx-input").setInputFiles(fixture("route.gpx"));
  await expect(page.getByTestId("plan-distance")).toHaveText("6.0 km");

  await page.getByTestId("fit-input").setInputFiles(fixture("activity.fit"));
  const rows = page.getByTestId("checkpoints").locator("tbody tr");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1)).toContainText("Refuge");
  await expect(page.getByTestId("total-actual")).toHaveText("0h59");
});

test("a bad file shows the Zig error", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("fit-input").setInputFiles({
    name: "broken.fit",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("not a fit file"),
  });
  await expect(page.getByTestId("error")).toBeVisible();
});

test("registers a service worker", async ({ page }) => {
  await page.goto("/");
  const registered = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return !!registration.active;
  });
  expect(registered).toBe(true);
});
