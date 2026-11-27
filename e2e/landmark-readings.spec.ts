import { expect, test, type Locator } from "@playwright/test";
import { installFeeds } from "./feeds";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

function pointOnStrip(strip: Locator, fraction: number) {
  return strip.evaluate((el, f) => {
    const path = el as unknown as SVGPathElement;
    const p = path.getPointAtLength(path.getTotalLength() * f).matrixTransform(path.getScreenCTM()!);
    return { x: p.x, y: p.y };
  }, fraction);
}

test("scrubbing the open lakebed archive uses the measured years already on the phone", async ({ page }) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const annualImage = /\/aral-\d{4}[^/]*\.webp$/;
  const loaded = new Set<string>();
  page.on("requestfinished", (request) => {
    if (annualImage.test(request.url())) loaded.add(request.url());
  });
  let disconnect = false;
  await page.route(annualImage, (route) => (disconnect ? route.abort() : route.continue()));
  await page.goto("/#v=observe&p=map&story=aral");
  const station = page.locator("svg.water-history");
  const strip = station.locator("[data-water-hit]");
  await expect(station).toHaveAttribute("data-year", "1984");
  const years = Number(await page.locator("#earth-story-time").getAttribute("max")) + 1;
  expect(years).toBeGreaterThan(1);
  await expect.poll(() => loaded.size).toBe(years);
  disconnect = true;
  for (const [fraction, year] of [
    [0.4, "1997"],
    [0.75, "2011"],
    [0.999, "2021"],
    [0.01, "1984"],
  ] as const) {
    const { x, y } = await pointOnStrip(strip, fraction);
    await page.touchscreen.tap(x, y);
    await expect(station).toHaveAttribute("data-year", year);
  }
});

test("the glacier pin reading leaves its phone transect labels clear in both projections", async ({
  page,
}) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#v=observe&story=glacier&chapter=velocity:1532,0&choice=2024&at=-49.55,69.15,2");
  const story = page.getByRole("region", { name: "Glacier Flow", exact: true });
  const transect = story.locator('svg[data-landmark="ice"]');
  await expect(story.locator("[data-glacier-pin]")).toHaveAttribute("data-sample", "1532");
  for (const name of ["Globe", "Map"]) {
    const projection = story.getByRole("button", { name, exact: true });
    await projection.click();
    await expect(projection).toHaveAttribute("aria-pressed", "true");
    await expect(transect.getByText("Toward fjord", { exact: true })).toBeVisible();
    await expect
      .poll(() =>
        transect.evaluate((svg) => {
          const card = svg.querySelector("[data-paper]")!.getBoundingClientRect();
          return Array.from(svg.querySelectorAll("[data-end] text")).every((label) => {
            const r = label.getBoundingClientRect();
            return (
              r.width > 0 &&
              card.width > 0 &&
              (r.right <= card.left || r.left >= card.right || r.bottom <= card.top || r.top >= card.bottom)
            );
          });
        }),
      )
      .toBe(true);
  }
});
