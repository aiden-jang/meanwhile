import { expect, test } from "@playwright/test";
import { installFeeds } from "./feeds";

test("a short phone shows the first catalogue pick on arrival", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "All stories", exact: true }).click();
  const topics = page.locator(".story-topic-jump");
  await expect(topics).toHaveAttribute("aria-expanded", "false");
  await topics.click();
  await page
    .getByRole("group", { name: "Story categories" })
    .getByRole("button", { name: "After Dark" })
    .click();
  await expect(topics).toContainText("After Dark");
  await expect(topics).toBeFocused();
  await topics.click();
  await page
    .getByRole("group", { name: "Story categories" })
    .getByRole("button", { name: "All topics" })
    .click();
  const action = page.locator("#open-story-float");
  await expect(action).toBeInViewport({ ratio: 1 });
  const button = (await action.boundingBox())!;
  const rail = (await page.locator("#chrome-rail").boundingBox())!;
  expect(button.y + button.height).toBeLessThanOrEqual(rail.y + rail.height - 4);
});

test("Iceberg Drift keeps mobile landscape playback inside the reading panel", async ({ page }) => {
  await page.setViewportSize({ width: 812, height: 375 });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#v=observe&story=iceberg");
  const panel = page.getByRole("region", { name: "Iceberg Drift", exact: true });
  const playback = panel.getByRole("group", { name: "Story playback" });
  await expect(playback).toHaveCount(0);
  await panel.getByRole("button", { name: "Replay controls" }).click();
  const start = playback.getByRole("button", { name: "Follow the drift" });
  await expect(start).toBeVisible();
  expect(await start.evaluate((node) => !!node.closest("#observatory-intro"))).toBe(true);
  await start.click();
  await expect(playback.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(panel.getByRole("slider", { name: "Track date" })).toBeVisible();
  await expect(
    panel.getByRole("complementary", { name: "About this shared view" }).locator("details"),
  ).toBeVisible();
});
