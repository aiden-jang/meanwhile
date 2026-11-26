import { devices, expect, test, type Page } from "@playwright/test";
import { installFeeds, openStories } from "./feeds";

const fixes = [
  [100, 941],
  [125, 930],
  [145, 909],
  [150, 902],
  [140, 905],
  [125, 913],
  [110, 920],
] as const;

async function openStorm(page: Page) {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/");
  await openStories(page, "search");
  await page.getByRole("searchbox", { name: "Find a story", exact: true }).fill("Eye of the Storm");
  const trigger = page.locator("#search-story-katrina");
  const canvas = page.locator("#globe-view canvas");
  const original = await canvas.elementHandle();
  await trigger.click();
  return { trigger, canvas, original, panel: page.getByRole("region", { name: "Eye of the Storm" }) };
}

test("Katrina’s camera flight reaches the recorded Buras landfall and can replay", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { trigger, panel } = await openStorm(page);
  await expect(panel.getByRole("heading", { name: "Across the Gulf.", exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Pause", exact: true })).toHaveCount(0);
  await expect(panel.getByRole("slider", { name: "Track time" })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await panel.getByRole("button", { name: "Follow the storm", exact: true }).click();
  const slider = panel.getByRole("slider", { name: "Track time" });
  await expect(slider).toBeVisible();
  await panel.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  const pausedAt = await slider.getAttribute("aria-valuetext");
  await panel.getByRole("button", { name: "Map", exact: true }).click();
  await expect(slider).toHaveAttribute("aria-valuetext", pausedAt!);
  await panel.getByRole("button", { name: "Play", exact: true }).click();
  await expect(panel.getByRole("region", { name: "Katrina’s recorded track", exact: true })).toBeVisible();
  await panel.getByText("All seven recorded positions", { exact: true }).click();
  await expect(
    panel.getByRole("img", { name: "Katrina’s seven recorded wind readings" }).locator("circle"),
  ).toHaveCount(7);
  await expect(panel.getByRole("button", { name: "Inspect offshore peak" })).toContainText("150 kt");
  await expect(panel.getByRole("button", { name: "Inspect landfall" })).toContainText("110 kt");
  await expect(panel.getByRole("heading", { name: "Landfall near Buras, Louisiana" })).toBeVisible();
  await expect(panel.locator(".storm-measurements").getByText("110 kt", { exact: true })).toBeVisible();
  await expect(panel.getByRole("slider", { name: "Recorded fix" })).toHaveAttribute(
    "aria-valuetext",
    "29 Aug · 11:10 UTC",
  );
  await panel.getByRole("button", { name: "Inspect offshore peak", exact: true }).click();
  await expect(panel.getByRole("slider", { name: "Recorded fix" })).toHaveValue("3");
  await panel.getByRole("button", { name: "Back to replay", exact: true }).click();
  await expect(slider).toHaveAttribute("aria-valuetext", "29 Aug · 11:10 UTC");
  await panel.getByRole("button", { name: "Replay", exact: true }).click();
  await expect(panel.getByRole("heading", { name: "Across the Gulf" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("Katrina’s reduced-motion map supports the NOAA fixes and keyboard scrubbing", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { panel, canvas, original } = await openStorm(page);
  await expect(panel.getByRole("heading", { name: "Across the Gulf.", exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Follow the storm", exact: true }).click();
  await expect(panel.getByRole("region", { name: "Katrina’s recorded track", exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Pause", exact: true })).toHaveCount(0);
  const slider = panel.getByRole("slider", { name: "Recorded fix" });
  const stage = page.getByRole("group", { name: "Eye of the Storm on the map" });
  await panel.getByRole("button", { name: "Map", exact: true }).click();
  await expect(stage.getByRole("button", { name: "Map", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(slider).toHaveAttribute("aria-valuetext", "29 Aug · 11:10 UTC");
  await expect(panel.getByText("Wind extent unavailable for this position.")).toBeVisible();
  await panel.getByRole("button", { name: "Inspect offshore peak", exact: true }).click();
  await expect(panel.locator(".storm-measurements").getByText("150 kt", { exact: true })).toBeVisible();
  await expect(panel.getByText("64 kt radius")).toBeVisible();
  await expect(slider).toHaveAttribute("aria-valuetext", "28 Aug · 18:00 UTC");
  await slider.press("Home");
  await expect(slider).toHaveAttribute("aria-valuetext", "28 Aug · 00:00 UTC");
  for (const [index, [wind, pressure]] of fixes.entries()) {
    if (index) await slider.press("ArrowRight");
    await expect(slider).toHaveValue(String(index));
    await expect(panel.locator(".storm-measurements")).toContainText(`${wind} kt`);
    await expect(panel.locator(".storm-measurements")).toContainText(`${pressure} hPa`);
  }
  await slider.press("End");
  await expect(panel.locator(".storm-measurements").getByText("920 hPa", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Globe", exact: true }).click();
  await expect(slider).toHaveAttribute("aria-valuetext", "29 Aug · 11:10 UTC");
  expect(await canvas.evaluate((el, prior) => el === prior, original)).toBe(true);
  expect(await panel.locator("#observatory-intro").evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0);
});

test("Katrina’s visible track points select their exact readings on the same globe and map", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { panel, canvas, original } = await openStorm(page);
  await panel.getByRole("button", { name: "Inspect recorded positions", exact: true }).click();
  const slider = panel.getByRole("slider", { name: "Recorded fix" });
  for (const projection of ["Globe", "Map"]) {
    if (projection === "Map") await panel.getByRole("button", { name: "Map", exact: true }).click();
    const at = async (index: number) => {
      const marker = panel.locator(`[data-storm-fix="${index}"]`);
      await expect(marker).toBeVisible();
      return marker.evaluate((node) => {
        const parent = node.parentElement!.getBoundingClientRect();
        const position = getComputedStyle(node);
        return { x: parent.left + parseFloat(position.left), y: parent.top + parseFloat(position.top) };
      });
    };
    await slider.press("Home");
    const points = [];
    for (const index of fixes.keys()) {
      if (index) await slider.press("ArrowRight");
      points.push(await at(index));
    }
    for (const [index, point] of points.entries()) {
      const [wind, pressure] = fixes[index]!;
      await page.mouse.click(point.x, point.y);
      await expect(slider, `${projection} position ${index + 1}`).toHaveValue(String(index));
      await expect(panel.locator(".storm-measurements")).toContainText(`${wind} kt`);
      await expect(panel.locator(".storm-measurements")).toContainText(`${pressure} hPa`);
    }
  }
  await panel.getByRole("button", { name: "Back to replay", exact: true }).click();
  await expect(panel.getByRole("slider", { name: "Track time" })).toHaveAttribute(
    "aria-valuetext",
    "28 Aug · 00:00 UTC",
  );
  await expect(panel.getByRole("button", { name: "Globe", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await canvas.evaluate((el, prior) => el === prior, original)).toBe(true);
});

test("Katrina’s landfall label clears the controls and wind legend on a short phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { panel, canvas, original } = await openStorm(page);
  await panel.getByRole("button", { name: "Follow the storm", exact: true }).click();
  const label = panel.locator("[data-reading-label] > span");
  for (const projection of ["Globe", "Map"]) {
    await panel.getByRole("button", { name: projection, exact: true }).click();
    await expect(label).toHaveText("110 kt · 920 hPa");
    await expect(label).toBeVisible();
    await expect
      .poll(() =>
        label.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          const controls = node
            .closest(".replay-region")!
            .querySelectorAll(
              ".stage-ident, .stage-readout, .story-projection, .story-dock, .storm-world-legend, .storm-track-handle > span",
            );
          return [...controls].some((control) => {
            const box = control.getBoundingClientRect();
            return (
              getComputedStyle(control).visibility === "visible" &&
              box.width > 0 &&
              box.height > 0 &&
              rect.left < box.right &&
              rect.right > box.left &&
              rect.top < box.bottom &&
              rect.bottom > box.top
            );
          });
        }),
      )
      .toBe(false);
    if (projection === "Map") {
      const scale = page.locator("[data-scale]");
      await expect(scale).toHaveCSS("opacity", "1");
      const caption = await panel.locator(".storm-world-legend").boundingBox();
      const ruler = await scale.boundingBox();
      expect(ruler!.y + ruler!.height).toBeLessThanOrEqual(caption!.y);
    }
  }
  expect(await canvas.evaluate((el, prior) => el === prior, original)).toBe(true);
});

for (const width of [320, 390]) {
  test(`Katrina’s ${width}px phone keeps Pause outside the scrolling reading`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { panel } = await openStorm(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await panel.getByRole("button", { name: "Follow the storm", exact: true }).click();
    const playback = panel.getByRole("group", { name: "Eye of the Storm playback", exact: true });
    const pause = playback.getByRole("button", { name: "Pause", exact: true });
    await expect(pause).toBeInViewport({ ratio: 1 });
    await panel.locator("#observatory-intro").evaluate((reading) => {
      reading.scrollTop = reading.scrollHeight;
    });
    await expect(pause).toBeInViewport({ ratio: 1 });
    const bounds = await pause.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    await pause.click();
    const slider = playback.getByRole("slider", { name: "Track time" });
    const held = await slider.inputValue();
    await expect(playback.getByRole("button", { name: "Play", exact: true })).toBeInViewport({ ratio: 1 });
    await panel.getByRole("button", { name: "Map", exact: true }).click();
    await expect(slider).toHaveValue(held);
    await slider.press("End");
    await expect(slider).toHaveAttribute("aria-valuetext", "29 Aug · 11:10 UTC");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}

test("a kept Katrina peak reopens exactly paused without the invitation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { panel, trigger } = await openStorm(page);
  await panel.getByRole("button", { name: "Follow the storm", exact: true }).click();
  await panel.getByRole("button", { name: "Inspect offshore peak", exact: true }).click();
  await panel.getByRole("button", { name: "Keep this fix", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Fix kept", exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("eif.visits-v2")!).saved[0]);
  expect(saved.position.moment).toMatchObject({ at: Date.parse("2005-08-28T18:00:00Z"), chapter: "compare" });
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(panel.getByRole("slider", { name: "Recorded fix" })).toHaveValue("3");
  await expect(panel.locator(".storm-measurements").getByText("150 kt", { exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Follow the storm", exact: true })).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Pause", exact: true })).toHaveCount(0);
});

for (const projection of ["Globe", "Map"]) {
  test(`Katrina drag and comparison preserve the exact ${projection} reading`, async ({ browser }) => {
    const mobile = projection === "Map";
    const context = await browser.newContext({
      ...(mobile ? devices["Pixel 7"] : {}),
      viewport: mobile ? { width: 320, height: 568 } : { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      await installFeeds(page, { presentation: "fresh", empty: true });
      await page.goto("/#v=observe&story=katrina&chapter=compare&t=1125208800000");
      const panel = page.getByRole("region", { name: "Eye of the Storm", exact: true });
      const canvas = page.locator("#globe-view canvas");
      const original = await canvas.elementHandle();
      const button = (name: string) => panel.getByRole("button", { name, exact: true });
      const slider = panel.getByRole("slider", { name: "Recorded fix" });
      const handle = button("Drag storm along track");
      if (mobile) await button("Map").tap();
      await expect(button(projection)).toHaveAttribute("aria-pressed", "true");
      const center = async () => {
        await expect(handle).toHaveAttribute("data-positioned", "");
        const bounds = await handle.boundingBox();
        if (!bounds) throw new Error("Storm handle is outside the scene");
        return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      };
      const fixPoint = async (index: number) => {
        await slider.press("Home");
        for (let step = 0; step < index; step++) await slider.press("ArrowRight");
        await expect(handle).toHaveAttribute("data-position", String(index));
        return center();
      };
      const path = [await fixPoint(2), await fixPoint(3), await fixPoint(4)];
      const start = await fixPoint(1);
      if (mobile) {
        const touch = await context.newCDPSession(page);
        await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
        await expect(handle).toHaveAttribute("data-grabbing", "");
        for (const point of path)
          await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point] });
        await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      } else {
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await expect(handle).toHaveAttribute("data-grabbing", "");
        for (const point of path) await page.mouse.move(point.x, point.y, { steps: 4 });
        await page.mouse.up();
      }
      await expect(slider).toHaveValue("4");
      await expect(panel.locator(".storm-measurements")).toContainText("905 hPa");
      const place = await center();
      expect(Math.hypot(place.x - path[2]!.x, place.y - path[2]!.y)).toBeLessThan(2);

      const opener = button("Compare peak and landfall");
      await opener.scrollIntoViewIfNeeded();
      const rail = panel.locator("#observatory-intro");
      const scroll = () => rail.evaluate((node) => node.scrollTop);
      const scrollBefore = await scroll();
      await opener.click();
      const comparison = panel.getByRole("region", { name: "Peak and landfall comparison" });
      await expect(comparison.getByText("40 kt lower wind")).toBeVisible();
      await expect(comparison.getByText("18 hPa higher pressure")).toBeVisible();
      await expect(button("Back to track")).toBeInViewport({ ratio: 1 });
      await button(mobile ? "Globe" : "Map").click();
      await canvas.dispatchEvent("wheel", { deltaY: -130, clientX: place.x, clientY: place.y });
      await button("Back to track").click();
      await expect(opener).toBeFocused();
      await expect(button(projection)).toHaveAttribute("aria-pressed", "true");
      await expect(slider).toHaveValue("4");
      await expect.poll(scroll).toBe(scrollBefore);
      await expect
        .poll(async () => {
          const after = await center();
          return Math.hypot(after.x - place.x, after.y - place.y);
        })
        .toBeLessThan(1);
      expect(await canvas.evaluate((node, prior) => node === prior, original)).toBe(true);
    } finally {
      await context.close();
    }
  });
}
