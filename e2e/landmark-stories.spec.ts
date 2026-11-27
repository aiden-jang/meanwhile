import { expect, test } from "@playwright/test";
import { installFeeds } from "./feeds";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test("a finger can scrub all of the Aral archive without panning the map", async ({ page }) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#v=observe&p=map&story=aral");
  const station = page.locator("svg.water-history");
  const strip = station.locator("[data-water-hit]");
  await expect(station).toHaveAttribute("data-year", "1984");
  const original = await page.locator("#globe-view canvas[data-engine]").elementHandle();
  const firstCell = await station.getAttribute("data-cell");
  const touch = await page.context().newCDPSession(page);
  async function point(frac: number) {
    return strip.evaluate((el, f) => {
      const path = el as unknown as SVGPathElement;
      const p = path.getPointAtLength(path.getTotalLength() * f).matrixTransform(path.getScreenCTM()!);
      return { x: p.x, y: p.y };
    }, frac);
  }
  await expect
    .poll(async () => {
      const p = await point(0.02);
      return page.evaluate((v) => document.elementFromPoint(v.x, v.y)?.hasAttribute("data-water-hit"), p);
    })
    .toBe(true);
  await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [await point(0.02)] });
  for (let i = 1; i <= 8; i++)
    await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [await point(i / 20)] });
  await expect(station.locator("#lakebed-reading")).toHaveText("1997 · No observation");
  for (let i = 9; i <= 20; i++)
    await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [await point(i / 20)] });
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(station.locator("#lakebed-reading")).toHaveText("2021 · Exposed lakebed");
  await page.getByRole("button", { name: "Globe", exact: true }).click();
  await expect(station).toHaveAttribute("data-cell", firstCell!);
  await expect(station).toHaveAttribute("data-year", "2021");
  const pin = station.getByRole("button", { name: "Move lakebed sampling pin" });
  await expect(pin).toBeVisible();
  await pin.focus();
  await expect(pin).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(station).not.toHaveAttribute("data-cell", firstCell!);
  expect(
    await original!.evaluate((el) => el === document.querySelector("#globe-view canvas[data-engine]")),
  ).toBe(true);
});
