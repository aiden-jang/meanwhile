import { expect, test, type Page } from "@playwright/test";
import { installFeeds } from "./feeds";

const world = (page: Page) => page.locator("#globe-view");
const context = (page: Page) => page.getByRole("region", { name: /^From / });
const pose = (page: Page) => page.evaluate(() => new URLSearchParams(location.hash.slice(1)).get("at"));

test.beforeEach(async ({ page }) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.addInitScript(() => localStorage.setItem("eif.landingRotation", "0"));
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("ALOHA carries a recorded profile into Explore and returns to the exact sample", async ({ page }) => {
  await page.goto("/#v=observe&at=-121,41,1.17");
  const launch = page.getByRole("button", { name: "Through the Pacific", exact: true });
  const canvas = await world(page).locator("canvas").elementHandle();
  await launch.click();
  const descent = page.getByRole("dialog", { name: "Through the Pacific" });
  const depth = descent.getByRole("slider", { name: "Descent position" });
  await depth.press("End");
  await depth.press("ArrowLeft");
  await descent.getByRole("button", { name: /Recorded profile/ }).click();
  const profile = descent.getByRole("region", { name: "Station ALOHA" });
  const surface = profile.getByRole("button", { name: "Surface at Station ALOHA" });
  await expect(surface).toBeInViewport({ ratio: 1 });
  await expect(profile).toContainText("1.52 °C");
  await profile.getByRole("button", { name: "Save view", exact: true }).click();
  await expect(profile.getByRole("button", { name: "Update saved view" })).toBeVisible();
  await surface.click();

  const origin = context(page);
  await expect(page.getByRole("heading", { name: "Station ALOHA", exact: true })).toBeVisible();
  await expect(origin.locator("time")).toHaveAttribute("datetime", "2024-12-19T00:00:00.000Z");
  await expect(origin).toContainText("1.52 °C");
  await expect.poll(() => pose(page)).toBe("-158,22.75,1.85");
  await expect(page.locator(".place-reticle-label")).toHaveText("Station ALOHA");
  await origin.getByRole("button", { name: "Surface wind" }).click();
  await expect(page.getByRole("heading", { name: "Surface wind", exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("eif.mapLayers") ?? "{}").wind)).not.toBe(
    true,
  );
  const scene = world(page).locator(".globe-scene");
  const extent = (await scene.boundingBox())!.height;
  await origin.getByRole("button", { name: "Related stories" }).click();
  const related = page.getByRole("region", { name: "Related to Station ALOHA" });
  await expect(related.getByRole("button", { name: "Float Dive", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Float Dive", exact: true })).toHaveCount(1);
  await expect(page.locator(".place-reticle-label")).toBeVisible();
  expect((await scene.boundingBox())!.height).toBeCloseTo(extent, 0);
  await related.getByRole("button", { name: "All stories", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Start here", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Back to Through the Pacific" }).click();
  await expect(depth).toHaveValue("999");
  await expect(profile).toContainText("1.52 °C");
  await expect(surface).toBeFocused();
  await descent.getByRole("button", { name: "Back", exact: true }).click();
  await expect(launch).toBeFocused();
  await expect.poll(() => pose(page)).toBe("-121,41,1.17");

  await page.getByRole("button", { name: "Saved observations and recent visits" }).click();
  const saved = page.getByRole("dialog", { name: "Saved" });
  const entry = saved.locator("#saved-entry-pacific");
  await expect(saved).toContainText("1.52 °C");
  await entry.click();
  await expect(depth).toHaveValue("999");
  await descent.getByRole("button", { name: "Back", exact: true }).click();
  await expect(entry).toBeFocused();
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});

test("Honolulu separates the recorded pressure from Explore and restores the minute and map", async ({
  page,
}) => {
  await page.goto("/#v=explore&p=map&at=-156,-4,1.33&layers=earthquakes");
  const marker = world(page).getByRole("button", { name: "Follow Tonga’s shockwave" });
  await marker.click();
  const passage = page.getByRole("region", { name: "Tonga to Honolulu" });
  const time = passage.getByRole("slider");
  await time.press("End");
  await time.press("ArrowLeft");
  await expect(passage.locator(".passage-clock")).toHaveText("09:53 UTC");
  const explore = passage.getByRole("button", { name: "Explore Honolulu" });
  await explore.click();
  await expect(page.getByRole("heading", { name: "Honolulu", exact: true })).toBeVisible();
  const origin = context(page);
  await expect(origin.locator("time")).toHaveAttribute("datetime", "2022-01-15T09:53:00.000Z");
  await expect(origin).toContainText("Recorded station pressure");
  await expect(world(page)).toHaveAttribute("aria-label", "Map");
  await page.getByRole("button", { name: "Back to Tonga’s shockwave" }).click();
  await expect(time).toHaveValue("593");
  await expect(world(page)).toHaveAttribute("aria-label", "Map");
  await expect(explore).toBeFocused();
  await passage.getByRole("button", { name: "Back", exact: true }).click();
  await expect(marker).toBeFocused();
  await expect.poll(() => pose(page)).toBe("-156,-4,1.33");
});

test("Fiji carries the held earthquake to Layers and returns to its depth after switching projections", async ({
  page,
}) => {
  await page.goto("/#v=observe&at=155,-14,1");
  const launch = page.getByRole("button", { name: "Below the Surface", exact: true });
  await launch.click();
  const fiji = page.getByRole("region", { name: "Beneath Fiji" });
  await fiji.getByRole("button", { name: "Map", exact: true }).click();
  const depth = fiji.getByRole("slider");
  await depth.press("End");
  const explore = fiji.getByRole("button", { name: "Explore nearby earthquakes" });
  await expect(explore).toBeInViewport({ ratio: 1 });
  await explore.click();
  const origin = context(page);
  await expect(origin).toContainText("670.8 km deep");
  await expect(page.locator("#cutaway-nearby-title")).toBeVisible();
  await expect(page.locator(".place-reticle-label")).toHaveText("Fiji region");
  await expect.poll(async () => (await pose(page))?.split(",").slice(0, 2).join(",")).toBe("179.35,-18.47");
  await expect(world(page)).toHaveAttribute("aria-label", "Map");
  await page.getByRole("button", { name: "Globe", exact: true }).click();
  await expect(world(page)).toHaveAttribute("aria-label", "Globe");
  await page.getByRole("button", { name: "Back to Fiji" }).click();
  await expect(depth).toHaveValue("670.8");
  await expect(world(page)).toHaveAttribute("aria-label", "Map");
  await expect(explore).toBeFocused();
  await fiji.getByRole("button", { name: "Back to previous view" }).click();
  await expect(launch).toBeFocused();
  await expect.poll(() => pose(page)).toBe("155,-14,1");
});

test("shared Pacific and Fiji readings reopen at their exact depths", async ({ page }) => {
  await page.goto("/#v=observe&story=pacific&choice=999&chapter=profile&p=map");
  const descent = page.getByRole("dialog", { name: "Through the Pacific" });
  await expect(descent.getByRole("slider")).toHaveValue("999");
  await expect(descent.getByRole("region", { name: "Station ALOHA" })).toBeVisible();
  await expect(world(page)).toHaveAttribute("aria-label", "Map");

  await page.goto("/#v=observe&scene=depth&depthEvent=us2000h9e2&descent=670.8&p=map");
  const fiji = page.getByRole("region", { name: "Beneath Fiji" });
  await expect(fiji.getByRole("slider")).toHaveValue("670.8");
  await expect(world(page)).toHaveAttribute("aria-label", "Map");
  await fiji.getByRole("button", { name: "Back to previous view" }).click();
  await expect(page.getByRole("button", { name: "Through the Pacific", exact: true })).toBeVisible();
});

test("Find offers Station ALOHA as a place and a story and returns to either result", async ({ page }) => {
  await page.goto("/#v=observe&at=-121,41,1.17");
  await page.getByRole("button", { name: "Find", exact: true }).click();
  const find = page.getByRole("dialog", { name: "Find", exact: true });
  const search = find.getByRole("searchbox");
  await search.fill("Station ALOHA");
  const place = find.locator('[data-find-result="place:Station ALOHA"]');
  const story = find.locator('[data-find-result="story:pacific"]');
  await expect(place).toBeVisible();
  await expect(story).toBeVisible();
  await place.click();
  await expect(page.getByRole("heading", { name: "Around Station ALOHA", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Back to Find", exact: true }).click();
  await expect(search).toHaveValue("Station ALOHA");
  await expect(place).toBeFocused();
  await story.click();
  const descent = page.getByRole("dialog", { name: "Through the Pacific" });
  await expect(descent.getByRole("slider")).toHaveValue("0");
  await descent.getByRole("button", { name: "Back", exact: true }).click();
  await expect(search).toHaveValue("Station ALOHA");
  await expect(story).toBeFocused();
  await expect.poll(() => pose(page)).toBe("-121,41,1.17");
});
