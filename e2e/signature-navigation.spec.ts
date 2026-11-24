import { expect, test } from "@playwright/test";
import { installFeeds, openLayer } from "./feeds";

for (const width of [320, 390, 1440]) {
  test(`global discovery and saved observations retain the world and search at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 320 ? 640 : width === 390 ? 844 : 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installFeeds(page, { presentation: "fresh" });
    await page.goto("/");
    const original = await page.locator("#globe-view canvas").elementHandle();
    const browse = page.getByRole("button", { name: "All stories", exact: true });
    const header = page.locator("#chrome-head");
    const canvas = page.locator("#globe-view canvas");
    const nav = [
      ".wordmark",
      ".header-explore",
      ".header-find",
      "#open-saved-observations",
      "#observatory-options",
    ];
    const positions = () => Promise.all(nav.map((selector) => header.locator(selector).boundingBox()));
    const underHeader = async () => {
      const bar = (await header.boundingBox())!;
      const world = (await canvas.boundingBox())!;
      expect(world.y).toBeCloseTo(bar.y, 0);
      expect(world.y + world.height).toBeGreaterThan(bar.y + bar.height);
    };
    await expect(browse).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    const initialPositions = await positions();
    await underHeader();
    if (process.env["EIF_CAPTURE_UI"])
      await page.screenshot({ path: test.info().outputPath(`landing-${width}.png`) });
    await browse.click();
    await expect(page.getByRole("tab", { name: "Stories", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await positions()).toEqual(initialPositions);
    await underHeader();
    await page.getByRole("button", { name: "Explore", exact: true }).click();
    const layers = page.getByRole("region", { name: "Map layers", exact: true });
    await expect(layers.getByRole("button", { name: / details$/ })).toHaveCount(9);
    await expect(page.getByRole("tab", { name: "Layers", exact: true })).toBeFocused();
    await expect(page.locator(".frame")).toHaveAttribute("data-presentation", "explore");
    expect(await positions()).toEqual(initialPositions);
    await underHeader();
    await page.getByRole("button", { name: "View options", exact: true }).click();
    const options = page.getByRole("region", { name: "View options", exact: true });
    await expect(options).toBeVisible();
    await expect(options).not.toContainText(/Find a story|Scene views|Privacy|Terms/);
    await page.keyboard.press("Escape");
    const legal = page.getByRole("navigation", { name: "Legal" });
    await expect(legal.getByRole("link", { name: "Privacy" })).toBeInViewport();
    await expect(legal.getByRole("link", { name: "Terms" })).toBeInViewport();
    await openLayer(page, "Earthquakes");
    const find = page.getByRole("button", { name: "Find", exact: true });
    await find.click();
    const dialog = page.getByRole("dialog", { name: "Find", exact: true });
    const search = dialog.getByRole("searchbox", { name: "Search places, stories and layers", exact: true });
    await expect(search).toBeFocused();
    await search.fill("Tonga");
    await expect(dialog.getByRole("button", { name: "Tonga’s shockwave", exact: true })).toBeVisible();
    if (process.env["EIF_CAPTURE_UI"])
      await page.screenshot({ path: test.info().outputPath(`search-${width}.png`) });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(find).toBeFocused();
    await expect(page.getByRole("tab", { name: "Layers", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("heading", { name: "Earthquakes", exact: true })).toBeVisible();
    const saved = page.getByRole("button", { name: "Saved observations and recent visits" });
    await saved.click();
    await expect(page.getByRole("dialog", { name: "Saved observations", exact: true })).toBeVisible();
    if (process.env["EIF_CAPTURE_UI"])
      await page.screenshot({ path: test.info().outputPath(`saved-${width}.png`) });
    await page.keyboard.press("Escape");
    await expect(saved).toBeFocused();
    await expect(page.getByRole("heading", { name: "Earthquakes", exact: true })).toBeVisible();
    expect(await original!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(
      true,
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    for (const control of await page.locator("#chrome-head > .observatory-header-actions > button").all()) {
      if (!(await control.isVisible())) continue;
      const box = await control.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
  });
}
