import { expect, test } from "@playwright/test";
import { installFeeds } from "./feeds";

test("browser Back restores a shared Kīlauea reading and its scrolled panel after Find", async ({ page }) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#v=observe&story=kilauea&p=map&chapter=lava:29&t=1528023600000");
  const story = page.getByRole("region", { name: "Kīlauea", exact: true });
  const pin = story.locator("[data-route-hit]");
  const rail = story.locator("#observatory-intro");
  await expect(pin).toHaveAttribute("aria-valuenow", "29");
  await expect(story.getByRole("complementary", { name: "About this shared view" })).toBeVisible();
  const scroll = await rail.evaluate((element) => {
    element.scrollTop = 235;
    return element.scrollTop;
  });
  expect(scroll).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Find", exact: true }).click();
  const search = page.getByRole("dialog", { name: "Find" });
  await search.getByRole("searchbox").fill("Glacier Flow");
  await search.locator('[data-find-result="story:glacier"]').click();
  await expect(page.getByRole("region", { name: "Glacier Flow", exact: true })).toBeVisible();
  await page.goBack();
  await expect(search.getByRole("searchbox")).toHaveValue("Glacier Flow");
  await search.getByRole("button", { name: "Close Find" }).click();
  await expect(pin).toHaveAttribute("aria-valuenow", "29");
  await expect(story.getByRole("complementary", { name: "About this shared view" })).toBeVisible();
  await expect.poll(() => rail.evaluate((element) => element.scrollTop)).toBe(scroll);
});
