import { expect, test, type Page } from "@playwright/test";
import { installFeeds, openStories } from "./feeds";

async function start(page: Page, width = 390) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/");
  await openStories(page, "search");
}
const visits = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("eif.visits-v2") ?? "{}"));

test("completed Continue restarts from the beginning after reload while unfinished visits resume", async ({
  page,
}) => {
  await start(page);
  const search = page.getByRole("searchbox", { name: "Find a story" });
  await search.fill("Aral");
  await page.locator("#search-story-aral").click();
  const slider = page.getByRole("region", { name: "Vanishing Sea", exact: true }).getByRole("slider").first();
  await slider.press("End");
  await expect(page.locator(".related-stories")).toHaveAttribute("open", "");
  await page.getByRole("button", { name: "Back to stories", exact: true }).click();
  await expect.poll(async () => (await visits(page)).recent[0].completed).toBe(true);
  await search.fill("");
  const resume = page.locator(".story-continue");
  await expect(resume).toContainText("Watch again Vanishing Sea");
  expect(new URLSearchParams(new URL(page.url()).hash.slice(1)).has("story")).toBe(false);
  await page.reload();
  await openStories(page, "search");
  await expect(resume).toContainText("Watch again Vanishing Sea");
  await resume.scrollIntoViewIfNeeded();
  if (process.env["EIF_CAPTURE_UI"])
    await page.screenshot({ path: test.info().outputPath("watch-again-phone.png") });
  await resume.click();
  await expect(slider).toHaveValue("0");
  await slider.press("ArrowRight");
  await page.getByRole("button", { name: "Back to stories", exact: true }).click();
  await expect(resume).toContainText("Continue Vanishing Sea");
  await resume.click();
  await expect(slider).toHaveValue("1");
});

test("Open latest ignores an old held observation instead of resuming it", async ({ page }) => {
  await page.route("https://gibs.earthdata.nasa.gov/**", (route) => route.abort());
  await start(page);
  const search = page.getByRole("searchbox", { name: "Find a story" });
  await search.fill("Rainbelt");
  await page.locator("#search-story-rain").click();
  const slider = page.getByRole("slider", { name: "Satellite estimate time", exact: true });
  await slider.press("End");
  const newest = await slider.inputValue();
  await slider.press("Home");
  expect(await slider.inputValue()).not.toBe(newest);
  await page.getByRole("button", { name: "Back to stories", exact: true }).click();
  await search.fill("");
  const resume = page.locator(".story-continue");
  await expect(resume).toContainText("Open latest Rainbelt");
  await resume.click();
  await expect(slider).toHaveValue(newest);
});

test("Rainbelt holds the last satellite frame during a failed request and can retry it in place", async ({
  page,
}) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.clock.setFixedTime(new Date("2026-11-20T20:00:00Z"));
  let fail = true;
  await page.route("https://gibs.earthdata.nasa.gov/wms/**", (route) => {
    const time = new URL(route.request().url()).searchParams.get("TIME");
    return fail && time === "2026-11-20T11:30:00Z"
      ? route.abort()
      : route.fulfill({ path: "src/assets/story-previews/rain.webp", contentType: "image/webp" });
  });
  await page.goto("/#v=observe&story=rain&p=map");
  const rain = page.getByRole("region", { name: "Rainbelt", exact: true });
  const slider = rain.getByRole("slider", { name: "Satellite estimate time", exact: true });
  await expect(slider).toHaveValue("48");
  await expect(rain.getByText("Loading this image…", { exact: false })).toHaveCount(0);
  await slider.press("ArrowLeft");
  await expect(rain.getByRole("status").filter({ hasText: "No image could be loaded" })).toContainText(
    "12:00 UTC",
  );
  await expect(slider).toHaveValue("47");
  fail = false;
  await rain.getByRole("button", { name: "Retry satellite frame", exact: true }).click();
  await expect(rain.getByRole("button", { name: "Retry satellite frame", exact: true })).toHaveCount(0);
  await expect(rain.getByText("Loading this image…", { exact: false })).toHaveCount(0);
  await expect(slider).toHaveValue("47");
  await expect(rain.getByRole("button", { name: "Map", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("onward recommendations avoid the last story and preserve the original return path", async ({
  page,
}) => {
  await start(page, 1440);
  const search = page.getByRole("searchbox", { name: "Find a story" });
  await search.fill("Aral");
  await page.locator("#search-story-aral").click();
  const aral = page.getByRole("region", { name: "Vanishing Sea", exact: true });
  // Loading panels also contain recommendations; their controls are replaced by the player.
  await expect(aral.getByRole("slider").first()).toBeVisible();
  await aral.locator(".related-stories summary").click();
  await expect(aral.locator(".related-stories button strong")).toHaveText("Water Weight");
  await aral.locator(".related-stories button").click();
  const water = page.getByRole("region", { name: "Water Weight", exact: true });
  await expect(water.getByRole("slider").first()).toBeVisible();
  await expect(aral).toHaveCount(0);
  await water.locator(".related-stories summary").click();
  await expect(water.locator(".related-stories button strong")).toHaveText("River Pulse");
  await water.getByRole("button", { name: "Back to Vanishing Sea", exact: true }).click();
  await aral.getByRole("button", { name: "Back to stories", exact: true }).click();
  await expect(search).toHaveValue("Aral");
  await expect(page.locator("#search-story-aral")).toBeFocused();
});

for (const blocked of [false, true]) {
  test(`library removal and clear have keyboard-accessible Undo with storage blocked=${blocked}`, async ({
    page,
  }) => {
    await page.addInitScript((blocked) => {
      const visit = { id: "aral", seen: Date.now(), position: {} };
      localStorage.setItem("eif.visits", JSON.stringify({ version: 1, recent: [visit], saved: [visit] }));
      if (blocked) {
        const set = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === "eif.visits" || key === "eif.visits-v2")
            throw new DOMException("Denied", "QuotaExceededError");
          set.call(this, key, value);
        };
      }
    }, blocked);
    await start(page);
    await openStories(page, "all");
    await page.getByRole("button", { name: "Saved observations and recent visits" }).click();
    const shelf = page.getByRole("dialog", { name: "Saved observations", exact: true });
    await shelf.getByRole("button", { name: "Remove saved Vanishing Sea" }).click();
    await expect(shelf.locator(".kept-item")).toHaveCount(0);
    await shelf.getByRole("button", { name: "Undo", exact: true }).press("Enter");
    await expect(shelf.locator(".kept-item")).toHaveCount(1);
    await expect(shelf.locator(".saved-feedback")).toBeFocused();
    await expect(shelf).toContainText(blocked ? "Restored for this visit" : "Restored on this device");
    await shelf.getByText("Recent visits", { exact: true }).click();
    await shelf.getByRole("button", { name: "Clear recent visits" }).click();
    await expect(page.locator(".story-continue")).toHaveCount(0);
    if (process.env["EIF_CAPTURE_UI"])
      await page.screenshot({ path: test.info().outputPath(`undo-phone-${blocked}.png`) });
    await shelf.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(shelf.locator(".kept-item")).toHaveCount(1);
    await shelf.getByRole("button", { name: "Close saved observations" }).click();
    await expect(page.locator(".story-continue")).toContainText("Continue Vanishing Sea");
  });
}

for (const projection of ["globe", "map"]) {
  test(`Reset camera preserves ${projection}, enabled layers, filters and held time @dev`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await installFeeds(page);
    const at = Math.floor(Date.now() / 1000) - 3600;
    await page.goto(`/#v=explore&p=${projection}&at=20,35,2&m=4&w=24&c=${at}&layers=earthquakes,fires`);
    const camera = () =>
      page.evaluate(() => {
        const globe = (
          window as unknown as {
            __globe: { state: () => { lon: number; lat: number; zoom: number }; morph: () => number };
          }
        ).__globe;
        return globe ? { ...globe.state(), morph: globe.morph() } : null;
      });
    await expect.poll(async () => (await camera())?.zoom).toBe(2);
    await expect.poll(async () => (await camera())?.morph).toBe(projection === "map" ? 1 : 0);
    const before = await page.evaluate(() => Object.fromEntries(new URLSearchParams(location.hash.slice(1))));
    const canvas = await page.locator("#globe-view canvas").elementHandle();
    const toggles = page.locator(".layer-row [aria-pressed]");
    const enabled = await toggles.evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-pressed")),
    );
    await page.getByRole("button", { name: "View options", exact: true }).click();
    if (process.env["EIF_CAPTURE_UI"])
      await page.screenshot({ path: test.info().outputPath(`reset-${projection}.png`) });
    await page.getByRole("button", { name: "Reset camera", exact: true }).click();
    await expect
      .poll(camera)
      .toEqual({ lon: -74.006, lat: 40.7128, zoom: 1, morph: projection === "map" ? 1 : 0 });
    const after = await page.evaluate(() => Object.fromEntries(new URLSearchParams(location.hash.slice(1))));
    for (const key of ["p", "m", "w", "c", "layers"]) expect(after[key]).toBe(before[key]);
    expect(
      await toggles.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-pressed"))),
    ).toEqual(enabled);
    expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(
      true,
    );
  });
}
