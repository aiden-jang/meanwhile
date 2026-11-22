import { expect, test, type Page } from "@playwright/test";
import { installFeeds, openStories, revealStoryTools, selectScene } from "./feeds";

const follow = (page: Page) => page.locator("#open-aurora-overflight");

test(
  "the aurora hides background reports and returns from Tonight’s Sky to the same forecast",
  { tag: "@dev" },
  async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installFeeds(page, { presentation: "fresh" });
    await page.goto("/");
    const canvas = await page.locator("#globe-view canvas").elementHandle();
    const reports = () =>
      page.evaluate(() => {
        const world = window as unknown as {
          __events?: { object: { geometry: { drawRange: { count: number } } } };
          __marks?: () => { id: string }[];
        };
        return {
          quakes: world.__events?.object.geometry.drawRange.count ?? 0,
          hazards:
            world.__marks?.().filter(({ id }) => /^(cyclone|fire|flood|volcano):/.test(id)).length ?? 0,
        };
      });
    await expect.poll(async () => (await reports()).quakes).toBeGreaterThan(0);
    await expect.poll(async () => (await reports()).hazards).toBeGreaterThan(0);
    await openStories(page, "search");
    await page.getByRole("searchbox", { name: "Find a story" }).fill("aurora");
    await page.locator("#search-story-aurora").click();
    await expect(page.getByRole("heading", { name: "Into the auroral oval." })).toBeVisible();
    await expect.poll(reports).toEqual({ quakes: 0, hazards: 0 });

    const projection = page.getByRole("group", { name: "Aurora projection", exact: true });
    const map = projection.getByRole("button", { name: "Map", exact: true });
    await map.click();
    const stamp = page.getByRole("group", { name: "Globe readout" }).locator("time");
    const forecast = await stamp.getAttribute("datetime");
    expect(forecast).toBeTruthy();
    const horizonAmount = () =>
      page.evaluate(() =>
        (window as unknown as { __globe: { localSky: { amount: () => number } } }).__globe.localSky.amount(),
      );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.locator("#open-tonight-sky").click();
    await expect(
      page
        .getByRole("group", { name: "Sky reference projection" })
        .getByRole("button", { name: "Local sky" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect.poll(horizonAmount).toBe(1);
    await page.getByRole("button", { name: "Back to Aurora Overflight" }).click();
    await expect.poll(horizonAmount).toBe(0);
    await expect(map).toHaveAttribute("aria-pressed", "true");
    await expect(stamp).toHaveAttribute("datetime", forecast!);
    await expect(page.locator("#open-tonight-sky")).toBeFocused();
    await expect.poll(reports).toEqual({ quakes: 0, hazards: 0 });
    await page.getByRole("button", { name: "Back to stories" }).click();
    await page.getByRole("tab", { name: "Layers", exact: true }).click();
    await expect.poll(async () => (await reports()).quakes).toBeGreaterThan(0);
    await expect.poll(async () => (await reports()).hazards).toBeGreaterThan(0);
    expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(
      true,
    );
  },
);

test("After Dark follows the NOAA forecast and restores its catalogue", { tag: "@dev" }, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /shader|WebGLProgram/i.test(message.text()))
      errors.push(message.text());
  });
  await page.goto("/");
  await selectScene(page, "After Dark");
  await revealStoryTools(page);
  await expect(follow(page)).toBeEnabled();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await revealStoryTools(page);
  await follow(page).click();
  const readout = page.getByRole("group", { name: "Globe readout" });
  await expect(readout).toContainText("30% model chance");
  await expect(readout).toContainText(/Valid for \d\d:\d\d UTC/);
  const flight = () =>
    page.evaluate(() => {
      const globe = (
        window as unknown as {
          __globe: {
            auroraSweep: () => number;
            framingReady: () => boolean;
            state: () => { lat: number };
          };
        }
      ).__globe;
      return { sweep: globe.auroraSweep(), ready: globe.framingReady(), lat: globe.state().lat };
    });
  await expect.poll(async () => (await flight()).sweep).toBe(1);
  await expect.poll(async () => (await flight()).ready).toBe(true);
  expect(Math.abs((await flight()).lat)).toBeGreaterThanOrEqual(72);
  await page.getByRole("button", { name: "Back to stories" }).click();
  await expect(
    page
      .getByRole("group", { name: "Story categories" })
      .getByRole("button", { name: "After Dark", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(follow(page)).toBeFocused();
  await expect.poll(async () => (await flight()).sweep).toBe(0);
  expect(errors).toEqual([]);
});

test("the reduced-motion phone can read the current forecast and exit to Explore", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/");
  await selectScene(page, "After Dark");
  await revealStoryTools(page);
  await follow(page).click();
  await expect(page.getByRole("heading", { name: "Into the auroral oval." })).toBeVisible();
  await expect(page.getByRole("link", { name: "NOAA OVATION forecast" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Replay flight" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Explore the globe", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Browse stories", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await expect(page.locator("#chrome-rail")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("eif.figures"))).toBeNull();
});

test("After Dark still opens when NOAA’s forecast is unavailable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.route(/ovation_aurora_latest\.json/, (route) => route.fulfill({ status: 503, body: "" }));
  await page.goto("/");
  await selectScene(page, "After Dark");
  await expect(page.getByRole("heading", { name: "The other side of day." })).toBeVisible();
  await revealStoryTools(page);
  await expect(page.getByText("NOAA’s aurora forecast is unavailable.")).toBeVisible();
  await expect(follow(page)).toBeDisabled();
});
