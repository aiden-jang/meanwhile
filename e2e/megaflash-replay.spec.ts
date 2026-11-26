import { devices, expect, test } from "@playwright/test";
import { installFeeds, openStories } from "./feeds";

test("Megaflash opens on its optical timeline and keeps the scan and guided replay available", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/");
  await openStories(page);
  const trigger = page.getByRole("button", { name: "Megaflash", exact: true });
  const canvas = page.locator("#globe-view canvas");
  const original = await canvas.elementHandle();
  await trigger.click();
  const panel = page.getByRole("region", { name: "Megaflash", exact: true });
  const button = (name: string) => panel.getByRole("button", { name, exact: true });
  const time = panel.getByRole("slider", { name: "Scrub the flash" });
  await expect(time).toHaveValue("0");
  await expect(button("Eastern Texas, 0.00 s")).toBeVisible();

  await page.setViewportSize({ width: 320, height: 568 });
  await expect(time).toBeInViewport({ ratio: 1 });
  await expect(button("Inspect this window")).toBeInViewport({ ratio: 1 });
  await button("Near Kansas City, 6.50 s").click();
  await expect(time).toHaveValue("26");
  await button("Infrared scan").click();
  await expect(
    page
      .getByRole("group", { name: "Megaflash on the globe" })
      .getByText("GOES-16 infrared · 08:52 UTC · False color"),
  ).toBeVisible();
  await expect(time).toHaveAttribute("aria-valuetext", "Before the flash");
  await button("Follow the flash").click();
  await button("Pause").click();
  await expect(button("Play")).toBeVisible();
  await button("Full flash").click();
  await expect(time).toHaveValue("30");
  await expect(panel.getByText("829 ± 8 km", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  expect(await canvas.evaluate((el, prior) => el === prior, original)).toBe(true);
});

test("Megaflash keeps its archive comparisons addressable across projections", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/#v=observe&story=megaflash&chapter=extent");
  const panel = page.getByRole("region", { name: "Megaflash", exact: true });
  const comparison = panel.getByRole("group", { name: "Compare optical detections" });
  const first = comparison.getByRole("button", { name: "First detections" });
  const full = comparison.getByRole("button", { name: "Full flash" });
  const time = panel.getByRole("slider", { name: "Scrub the flash" });
  await expect(full).toHaveAttribute("aria-pressed", "true");
  await first.press("Enter");
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await expect(time).toHaveAttribute("aria-valuetext", "First 0.25 s");
  await expect(page).toHaveURL(/chapter=first/);
  await panel.getByRole("button", { name: "Map", exact: true }).click();
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await full.click();
  await expect(full).toHaveAttribute("aria-pressed", "true");
  await expect(time).toHaveAttribute("aria-valuetext", "7.39 s");
  await expect(page).toHaveURL(/chapter=extent/);
  await time.press("ArrowLeft");
  await expect(time).toHaveAttribute("aria-valuetext", "≈ 7.25 s");
  await buttonReading(page);
});

async function buttonReading(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Inspect this window" }).click();
  const reading = page.getByRole("region", { name: "Optical detection window" });
  await expect(reading.getByText("7.25–7.39 s")).toBeVisible();
  await reading.getByRole("button", { name: "Keep this reading" }).click();
  await expect(reading.getByRole("button", { name: "Reading kept" })).toBeDisabled();
}

for (const map of [false, true]) {
  const projection = map ? "Map" : "Globe";
  test(`Megaflash pulses and scrubbing hold the ${projection.toLowerCase()} and return to the exact reading`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      ...(map ? devices["Pixel 7"] : {}),
      viewport: map ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      await installFeeds(page, { presentation: "fresh", empty: true });
      await page.goto("/#v=observe&story=megaflash&chapter=inspect");
      const panel = page.getByRole("region", { name: "Megaflash", exact: true });
      const button = (name: string) => panel.getByRole("button", { name, exact: true });
      const canvas = page.locator("#globe-view canvas");
      const original = await canvas.elementHandle();
      if (map) await button(projection).tap();
      const pulse = button("Across the Plains, 3.25 s");
      const time = panel.getByRole("slider", { name: "Scrub the flash" });
      const center = async () => {
        await expect(pulse).toBeVisible();
        const bounds = await pulse.boundingBox();
        if (!bounds) throw new Error("The pulse is outside the scene");
        return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      };
      const place = await center();
      const action = map ? "tap" : "click";
      await pulse[action]();
      await expect(time).toHaveValue("13");
      await expect(pulse).toHaveAttribute("aria-pressed", "true");
      const box = await time.boundingBox();
      if (!box) throw new Error("The timeline is outside its panel");
      const y = box.y + box.height / 2;
      const points = [0.46, 0.52, 0.64, 0.75, 0.87].map((fraction) => ({
        x: box.x + box.width * fraction,
        y,
      }));
      if (map) {
        const touch = await context.newCDPSession(page);
        await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [points[0]!] });
        for (const point of points)
          await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point] });
        await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      } else {
        await page.mouse.move(points[0]!.x, y);
        await page.mouse.down();
        for (const point of points) await page.mouse.move(point.x, point.y, { steps: 4 });
        await page.mouse.up();
      }
      expect(Number(await time.inputValue())).toBeGreaterThan(20);
      await time.press("Home");
      await time.press("ArrowRight");
      await expect(time).toHaveValue("0");
      await button("Near Kansas City, 6.50 s")[action]();
      await expect(time).toHaveValue("26");
      const afterScrub = await center();
      expect(Math.hypot(afterScrub.x - place.x, afterScrub.y - place.y)).toBeLessThan(1);

      const opener = button("Inspect this window");
      const rail = panel.locator("#observatory-intro");
      await opener.scrollIntoViewIfNeeded();
      const scroll = () => rail.evaluate((node) => node.scrollTop);
      const savedScroll = await scroll();
      await opener[action]();
      const reading = panel.getByRole("region", { name: "Optical detection window" });
      await expect(reading.getByText("6.50–6.75 s")).toBeVisible();
      await expect(reading.getByText("68", { exact: true })).toBeVisible();
      const target = map ? "Globe" : "Map";
      await button(target)[action]();
      await expect(button(target)).toHaveAttribute("aria-pressed", "true");
      await canvas.dispatchEvent("wheel", { deltaY: -130, clientX: place.x, clientY: place.y });
      await button("Back to flash")[action]();
      await expect(opener).toBeFocused();
      await expect(button(projection)).toHaveAttribute("aria-pressed", "true");
      await expect(time).toHaveValue("26");
      await expect.poll(scroll).toBe(savedScroll);
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
