import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

// The synthetic race from scripts/make-fixtures.mjs, run through the real WASM module in
// place of the demo race: same path, smaller files, known answers.
const fixture = (name) => fileURLToPath(new URL(`../zig/testdata/${name}`, import.meta.url));

const serveDemo = (page, { gpx, fit }) =>
  Promise.all([
    page.route("**/demo/*.gpx", (route) => route.fulfill(gpx)),
    page.route("**/demo/*.fit", (route) => route.fulfill(fit)),
  ]);

test("opens straight on the demo race, plan vs actual", async ({ page }) => {
  await serveDemo(page, {
    gpx: { path: fixture("route.gpx") },
    fit: { path: fixture("activity.fit") },
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "retrace" })).toBeVisible();

  const rows = page.getByTestId("checkpoints").locator("tbody tr");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1)).toContainText("Refuge");
  await expect(page.getByTestId("total-actual")).toHaveText("0h59");
  // The series from debriefz reach the story: the profile and the gap read them.
  await expect(page.getByTestId("profile-readout")).toBeVisible();
  await expect(page.getByTestId("gap-readout")).toContainText("km 6.0");
});

test("a bad file shows the Zig error", async ({ page }) => {
  await serveDemo(page, {
    gpx: { path: fixture("route.gpx") },
    fit: { body: Buffer.from("not a fit file") },
  });
  await page.goto("/");
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
