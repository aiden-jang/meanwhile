import { expect, test } from "@playwright/test";
import { installFeeds, openStories } from "./feeds";

test("a failed story download leaves the shared globe and a usable return path", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page);
  await page.route(/\/a\/FloatDivePanel-[^/]+\.js(?:\?|$)/, (route) => route.abort());
  await page.goto("/");
  await openStories(page, "search");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  await page.getByRole("searchbox", { name: "Find a story" }).fill("Float Dive");
  const trigger = page.locator("#search-story-float");
  await expect(trigger).toBeEnabled();
  await trigger.click();
  const recovery = page.getByRole("region", { name: "Story unavailable" });
  await expect(recovery.getByRole("heading")).toHaveText("Couldn’t open Float Dive.");
  await expect(recovery.getByRole("button", { name: "Try again" })).toBeVisible();
  await recovery.getByRole("button", { name: "Back to stories" }).click();
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("searchbox", { name: "Find a story" })).toHaveValue("Float Dive");
  expect(
    await page.locator("#globe-view canvas").evaluate((node, previous) => node === previous, canvas),
  ).toBe(true);
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await expect(page.getByRole("button", { name: "Earthquakes details" })).toBeVisible();
});

test("an interrupted story download retries the shared moment once", async ({ page }) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  let attempts = 0;
  await page.route(/\/a\/RuptureStage-[^/]+\.js$/, (route) =>
    ++attempts === 1 ? route.abort() : route.continue(),
  );
  await page.goto("/#v=observe&story=rupture&t=1299823584000&chapter=waves&choice=1,3");
  await expect(page.getByRole("combobox", { name: "First station" })).toHaveValue("1");
  await expect(page.getByRole("combobox", { name: "Second station" })).toHaveValue("3");
  await expect(page.getByRole("slider", { name: /Recording time/ })).toHaveValue("1200");
  await expect(page.getByRole("button", { name: "Play recording", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Story unavailable" })).toHaveCount(0);
  expect(attempts).toBe(2);
});

test("a persistent story download failure offers a named recovery view", async ({ page }) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  let navigations = 0;
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations++;
  });
  await page.route(/\/a\/RuptureStage-[^/]+\.js$/, (route) => route.abort());
  await page.goto("/#v=observe&story=rupture");
  await expect.poll(() => navigations).toBe(2);
  const status = page.getByRole("region", { name: "Story unavailable" });
  await expect(status.getByRole("heading")).toHaveText("Couldn’t open Rupture Reveal.");
  await expect(status).toBeFocused();
  await expect(status.getByRole("button", { name: "Try again" })).toBeVisible();
  await status.getByRole("button", { name: "Back to stories" }).click();
  await expect(page.getByRole("region", { name: "Story catalogue", exact: true })).toBeVisible();
  expect(navigations).toBe(2);
});
