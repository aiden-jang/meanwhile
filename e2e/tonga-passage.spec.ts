import { expect, test } from "@playwright/test";
import { installFeeds } from "./feeds";

for (const motion of ["reduce", "no-preference"] as const) {
  test(`the eruption keeps the world, selected minute and exact return across projections (${motion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: motion });
    if (motion === "no-preference") await page.setViewportSize({ width: 390, height: 664 });
    await installFeeds(page, { presentation: "fresh", empty: true });
    await page.goto("/#v=explore&p=map&at=-156,-4,1.33&layers=earthquakes");
    const world = page.locator("#globe-view");
    const rail = page.locator("#chrome-rail");
    const marker = world.getByRole("button", { name: "Follow Tonga’s shockwave" });
    const pose = () => page.evaluate(() => new URLSearchParams(location.hash.slice(1)).get("at"));
    await expect(world).toHaveAttribute("aria-label", "Map");
    await expect(marker).toBeVisible();
    await expect.poll(pose).toBe("-156,-4,1.33");
    const fiji = world.getByRole("button", { name: "Descend beneath Fiji" });
    if (test.info().project.use.isMobile) {
      await expect(fiji).toBeVisible();
      await expect(marker).toBeInViewport({ ratio: 1 });
      const a = (await marker.boundingBox())!,
        b = (await fiji.boundingBox())!;
      expect(
        a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y,
      ).toBe(true);
    }
    await rail.evaluate((el) => el.scrollTo(0, 93));
    const scroll = await rail.evaluate((el) => el.scrollTop);
    const source = await pose();
    const canvas = await world.locator("canvas").elementHandle();
    const before = (await marker.boundingBox())!;
    await marker.click();
    const passage = page.getByRole("region", { name: "Tonga to Honolulu" });
    await expect(passage).toHaveAttribute("data-beat", "pressure");
    const sample = passage.getByRole("slider");
    await sample.press("End");
    await sample.press("ArrowLeft");
    await expect(passage.locator(".passage-clock")).toHaveText("09:53 UTC");
    await passage.getByRole("button", { name: "Globe", exact: true }).click();
    await expect(world).toHaveAttribute("aria-label", "Globe");
    await expect(sample).toHaveValue("593");
    await sample.press("Home");
    await expect(passage).toHaveAttribute("data-minute", "495");
    await passage.getByRole("button", { name: "Back", exact: true }).click();
    await expect(world).toHaveAttribute("aria-label", "Map");
    await expect(marker).toBeFocused();
    await expect.poll(pose).toBe(source);
    await expect.poll(() => rail.evaluate((el) => el.scrollTop)).toBe(scroll);
    await world.evaluate(async (el) => {
      const flight = el.getAnimations().find((animation) => animation.id === "globe-presentation");
      if (flight) await Promise.allSettled([flight.finished]);
    });
    await expect
      .poll(async () => {
        const after = await marker.boundingBox();
        return after ? Math.hypot(after.x - before.x, after.y - before.y) : Infinity;
      })
      .toBeLessThan(1);
    expect(await canvas!.evaluate((el) => el === document.querySelector("#globe-view canvas"))).toBe(true);
  });
}

test("the Honolulu record can be scrubbed when satellite imagery cannot load", async ({ page }) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.route(/\/infrared[^/]*\.webp(?:\?.*)?$/, (route) => route.abort());
  await page.goto("/#v=explore&p=map&at=-156,-4,1.33&layers=earthquakes");
  const feature = page.getByRole("button", { name: "Follow Tonga’s shockwave" });
  await feature.click();
  const passage = page.getByRole("region", { name: "Tonga to Honolulu" });
  await expect(passage.getByRole("status")).toContainText("Satellite scans unavailable");
  await expect(passage.getByRole("status")).toBeVisible();
  await passage.getByRole("slider").press("Home");
  await expect(passage.locator(".passage-clock")).toHaveText("08:15 UTC");
  await page.goBack();
  await expect(feature).toBeFocused();
});
