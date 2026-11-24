import { expect, test, type Page } from "@playwright/test";
import { installFeeds, openStories } from "./feeds";

async function openKilauea(page: Page) {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/");
  await openStories(page, "search");
  await page.getByRole("searchbox", { name: "Find a story" }).fill("Kīlauea");
  const trigger = page.getByRole("button", { name: "Kīlauea", exact: true });
  const canvas = page.locator("#globe-view canvas");
  const original = await canvas.elementHandle();
  await trigger.click();
  return { trigger, panel: page.getByRole("region", { name: "Kīlauea", exact: true }), canvas, original };
}

test("Kīlauea plays the survey and opens USGS footage on the shared globe", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  const { trigger, panel, canvas, original } = await openKilauea(page);
  await panel.getByRole("button", { name: "Follow the lava", exact: true }).click();
  await expect(panel.getByRole("heading", { name: "Fissure 8 reopens" })).toBeVisible();
  await panel.getByRole("button", { name: "Pause", exact: true }).click();
  await panel.getByRole("button", { name: "Ocean entry", exact: true }).click();
  await expect(panel.getByRole("heading", { name: "Lava reaches Kapoho Bay" })).toBeVisible();
  await panel.getByRole("button", { name: "Watch USGS overflight" }).click();
  await expect(page.getByRole("img", { name: /USGS field footage/ })).toBeVisible();
  await expect(page.getByText("USGS overflight · June 4, 2018")).toBeVisible();
  await panel.getByRole("button", { name: "Return to lava map" }).click();
  expect(await canvas.evaluate((element, before) => element === before, original)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("Kīlauea keeps the same coastline comparison on globe and map", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { panel, canvas, original } = await openKilauea(page);
  const follow = panel.getByRole("button", { name: "Follow the lava", exact: true });
  const compareCoast = panel.getByRole("button", { name: "Compare coast", exact: true });
  await expect(follow).toBeInViewport({ ratio: 1 });
  await expect(compareCoast).toBeInViewport({ ratio: 1 });
  await expect(panel.getByRole("slider", { name: "Mapped extent date" })).toBeHidden();
  await follow.click();
  await expect(panel.getByRole("slider", { name: "Mapped extent date" })).toBeFocused();
  await panel.getByRole("button", { name: "Next survey" }).click();
  await expect(panel.getByRole("slider", { name: "Mapped extent date" })).toHaveValue("1");
  await panel.getByRole("button", { name: /^Ocean entry · / }).click();
  await expect(panel.getByRole("slider", { name: "Mapped extent date" })).toHaveAttribute(
    "aria-valuetext",
    "Jun 4 · 22:00 HST",
  );
  await compareCoast.click();
  const compare = panel.getByRole("slider", { name: "Compare before and after" });
  await compare.press("Home");
  await expect(compare).toHaveAttribute("aria-valuetext", "Before the eruption");
  await panel.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.getByRole("group", { name: "Kīlauea on the map" })).toContainText("Before eruption");
  await expect(compare).toHaveAttribute("aria-valuetext", "Before the eruption");
  await compare.press("End");
  await expect(compare).toHaveAttribute("aria-valuetext", "August 9 coastline");
  await panel.getByRole("button", { name: "Globe", exact: true }).click();
  await expect(page.getByRole("group", { name: "Kīlauea on the globe" })).toContainText("August 9, 2018");
  await compare.press("ArrowLeft");
  await expect(compare).toHaveValue("99");
  await panel.getByRole("button", { name: "Keep this comparison" }).click();
  await expect(panel.getByRole("button", { name: "Comparison kept", exact: true })).toBeVisible();
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("eif.visits-v2")!).saved[0]);
  expect(kept.position.moment).toMatchObject({ chapter: "compare", choice: "99" });
  await panel.getByRole("button", { name: "Back to replay", exact: true }).click();
  await expect(panel.getByRole("slider", { name: "Mapped extent date" })).toHaveAttribute(
    "aria-valuetext",
    "Jun 4 · 22:00 HST",
  );
  expect(await canvas.evaluate((element, before) => element === before, original)).toBe(true);
});

test("a short-phone Kīlauea opening uploads one survey after relief is ready", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => (release = resolve));
  await page.route(/\/a\/relief-phone-[^/]+\.webp$/, async (route) => {
    const response = await route.fetch();
    await delayed;
    await route.fulfill({ response });
  });
  await page.addInitScript(() => {
    const uploads: number[] = [];
    Object.assign(window, { surveyUploads: uploads });
    const upload = WebGL2RenderingContext.prototype.texSubImage2D;
    WebGL2RenderingContext.prototype.texSubImage2D = function (...args: unknown[]) {
      const source = args.at(-1);
      if (source instanceof HTMLCanvasElement && source.width * 1150 === source.height * 1300)
        uploads.push(source.width);
      Reflect.apply(upload, this, args);
    };
  });
  const uploads = () => page.evaluate(() => (window as Window & { surveyUploads?: number[] }).surveyUploads);
  try {
    const { panel, canvas, original } = await openKilauea(page);
    await expect(panel.getByText("Preparing the USGS survey")).toBeVisible();
    expect(await uploads()).toEqual([]);
    release();
    await expect(panel.getByText("USGS · Mapped lava extent")).toBeVisible();
    await expect.poll(uploads).toEqual([650]);
    expect(await canvas.evaluate((element, before) => element === before, original)).toBe(true);
  } finally {
    release();
  }
});

test("the projected shoreline handle and the slider change the same comparison", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { panel } = await openKilauea(page);
  await panel.getByRole("button", { name: "Compare coast", exact: true }).click();
  const slider = panel.getByRole("slider", { name: "Compare before and after" });
  const handle = panel.locator("[data-survey-handle][data-positioned]");
  for (const projection of ["Globe", "Map"]) {
    await panel.getByRole("button", { name: projection, exact: true }).click();
    await slider.press("Home");
    await slider.press("ArrowRight");
    await expect(handle).toBeVisible();
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 36, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect(slider).not.toHaveValue("1");
  }
});

test("returning from Kīlauea keeps the archived day and its launch control", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh" });
  await page.goto("/#d=2018-06-04");
  const trigger = page.getByRole("button", { name: "Follow Kīlauea’s lava", exact: true });
  await trigger.click();
  await page.getByRole("button", { name: "Back to archive", exact: true }).click();
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(/d=2018-06-04/);
});
