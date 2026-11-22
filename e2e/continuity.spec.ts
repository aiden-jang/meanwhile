import { expect, test } from "@playwright/test";
import { installFeeds, openStories, startJourney } from "./feeds";

for (const [id, title] of [
  ["aurora", "Aurora Overflight"],
  ["sun", "Sun Watch"],
  ["meteors", "Meteor Nights"],
  ["radar", "Storm Radar"],
] as const) {
  test(`${title} reopens after a refresh and a single Back returns to search`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installFeeds(page, { presentation: "fresh", empty: true });
    await page.goto("/");
    await openStories(page, "search");
    const search = page.getByRole("searchbox", { name: "Find a story" });
    await search.fill(title);
    await page.locator(`#search-story-${id}`).click();
    await expect(page).toHaveTitle(new RegExp(title));
    await expect(page).toHaveURL(new RegExp(`story=${id}`));
    await page.goBack();
    await expect(search).toHaveValue(title);
    await page.goForward();
    await expect(page).toHaveTitle(new RegExp(title));
    await page.reload();
    await expect(page).toHaveTitle(new RegExp(title));
    await expect(
      page
        .getByRole("heading", { name: id === "aurora" ? "Into the auroral oval." : title, exact: true })
        .first(),
    ).toBeVisible();
  });
}

test("browser Back and reload keep the current journey stop, date and map", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/");
  await openStories(page, "all");
  await startJourney(page, "ice-in-motion");
  const guide = page.getByRole("region", { name: "Current journey" });
  const ice = page.getByRole("region", { name: "Ice Line", exact: true });
  await ice.getByRole("button", { name: "Map", exact: true }).click();
  const time = ice.locator("#earth-story-time");
  await time.press("End");
  await expect(time).toHaveValue((await time.getAttribute("max"))!);
  const date = await time.getAttribute("aria-valuetext");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  await guide.getByRole("button", { name: "Next: Glacier Flow" }).click();
  await expect(guide).toContainText("2 of 3");
  await page.goBack();
  await expect(guide).toContainText("1 of 3");
  await expect(time).toHaveAttribute("aria-valuetext", date!);
  await expect(ice.getByRole("button", { name: "Map", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
  await page.goForward();
  await expect(guide).toContainText("2 of 3");
  await expect(page).toHaveURL(/journey=ice-in-motion&stop=1/);
  await page.reload();
  await expect(guide).toContainText("2 of 3");
  await guide.getByRole("button", { name: "Previous view" }).click();
  await expect(time).toHaveAttribute("aria-valuetext", date!);
});

test("dismissing Find restores the story without changing the sky time", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/#story=meteors");
  const time = page.getByRole("slider", { name: "City local time", exact: true });
  await time.press("End");
  const selected = await time.inputValue();
  const find = page.getByRole("button", { name: "Find a story", exact: true });
  await find.click();
  const search = page.getByRole("searchbox", { name: "Search all stories" });
  await search.fill("Tonga");
  await expect(page.getByRole("dialog").getByRole("button", { name: /Tonga’s shockwave/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(search).toHaveCount(0);
  await expect(time).toHaveValue(selected);
  await expect(find).toBeFocused();
});

test("Comet Return restores the flat map and archive time after a local sky visit", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/#v=observe&story=comet&p=map");
  const map = page.getByRole("button", { name: "Map", exact: true }).first();
  const time = page.getByRole("slider", { name: /July 2020/ });
  await expect(map).toHaveAttribute("aria-pressed", "true");
  await time.press("Home");
  await expect(time).toHaveValue("0");
  const earlier = await time.inputValue();
  await page.getByRole("button", { name: "See from my city", exact: true }).click();
  await expect(time).not.toHaveValue(earlier);
  await page.getByRole("button", { name: "Back to Earth", exact: true }).click();
  await expect(map).toHaveAttribute("aria-pressed", "true");
  await expect(time).toHaveValue(earlier);
});
