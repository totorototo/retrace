import { readFileSync } from "node:fs";
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
  const rows = page.getByTestId("checkpoints").getByRole("listitem");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1)).toContainText("Refuge");
  await expect(page.getByTestId("total-actual")).toHaveText("0h59");
  // The series from debriefz reach the story: the profile and the gap read them.
  await expect(page.getByTestId("profile-readout")).toBeVisible();
  await expect(page.getByTestId("gap-readout")).toContainText("km 6.0");
});

// zig/testdata/route.plan.json is gpxz's plan for route.gpx at 7:30/km and a 10 min stop:
//   gpxz --plan --pace 450 --life-base-stop 600 zig/testdata/route.gpx
// Regenerate it if gpxz's model changes: these tests then fail with PlanStale, as they should.
test("a plan.json's model replaces the pickers", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("gpx-input").setInputFiles(fixture("route.gpx"));
  await expect(page.getByTestId("plan-distance")).toHaveText("6.0 km");
  await expect(page.getByRole("radiogroup", { name: "Runner profile" })).toBeVisible();

  await page.getByTestId("planFile-input").setInputFiles(fixture("route.plan.json"));
  await expect(page.getByTestId("planFile-name")).toHaveText("route.plan.json");
  await expect(page.getByRole("radiogroup", { name: "Runner profile" })).toHaveCount(0);
  await expect(page.getByTestId("plan-model")).toHaveText(
    "7:30/km flat · fatigue 0.002 · 0h10 at each LifeBase",
  );

  await page.getByTestId("fit-input").setInputFiles(fixture("activity.fit"));
  await expect(page.getByTestId("checkpoints").getByRole("listitem")).toHaveCount(3);
  await expect(page.getByText("route.plan.json: 7:30/km flat")).toBeVisible();
});

test("a plan.json for another route is refused, and can be removed", async ({ page }) => {
  await page.goto("/");
  const route = readFileSync(fixture("route.gpx"));
  await page.getByTestId("gpx-input").setInputFiles({
    name: "edited.gpx",
    mimeType: "application/gpx+xml",
    buffer: Buffer.concat([route, Buffer.from("\n")]),
  });
  await expect(page.getByTestId("plan-distance")).toHaveText("6.0 km");
  await page.getByTestId("planFile-input").setInputFiles(fixture("route.plan.json"));
  await expect(page.getByTestId("error")).toContainText("made for another GPX");

  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByTestId("error")).toHaveCount(0);
  await expect(page.getByRole("radiogroup", { name: "Runner profile" })).toBeVisible();
  await expect(page.getByTestId("plan-distance")).toHaveText("6.0 km");
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
