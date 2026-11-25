import { expect, test, type Locator } from "@playwright/test";
import { installFeeds, openStories } from "./feeds";

test("Iceberg Drift shares dated fragment tracks, satellite views and the selected iceberg", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/");
  const canvas = page.locator("#globe-view canvas");
  const original = await canvas.elementHandle();
  await openStories(page);
  const trigger = page.getByRole("button", { name: "Iceberg Drift", exact: true });
  await trigger.click();
  const panel = page.getByRole("region", { name: "Iceberg Drift", exact: true });
  await panel.getByRole("button", { name: "Fragments", exact: true }).click();
  await panel.getByRole("button", { name: "Map", exact: true }).click();
  const date = panel.getByRole("slider", { name: "Track date" });
  const fragment = panel.getByRole("button", { name: "Inspect A-68E", exact: true });
  await expect(date).toHaveAttribute("aria-valuetext", "Jan 11, 2021");
  await fragment.click();
  await expect(panel.getByRole("combobox", { name: "Iceberg" })).toHaveValue("E");
  await expect(date).toHaveAttribute("aria-valuetext", "Jan 11, 2021");
  await panel.getByRole("slider", { name: "Track date" }).press("ArrowLeft");
  await panel.getByRole("combobox", { name: "Iceberg" }).selectOption({ label: "A-68A" });
  await expect(date).toHaveAttribute("aria-valuetext", "Jan 10, 2021");
  await panel.getByRole("button", { name: "Breakup", exact: true }).click();
  await panel.getByRole("button", { name: "Open satellite image" }).click();
  const image = panel.getByRole("img", { name: "Landsat 8 · Dec 23, 2020 · False color" });
  await expect(image).toBeVisible();
  await page.setViewportSize({ width: 320, height: 568 });
  const caption = panel.locator(".iceberg-photo figcaption");
  const photo = (await image.boundingBox())!;
  expect(photo.x + photo.width).toBeLessThan((await caption.boundingBox())!.x);
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.getByRole("button", { name: "Globe", exact: true }).click();
  await panel.getByRole("button", { name: "Back to track" }).click();
  await expect(panel.getByRole("button", { name: "Open satellite image" })).toBeFocused();
  await expect(panel.getByRole("button", { name: "Map", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(date).toHaveAttribute("aria-valuetext", "Dec 23, 2020");
  const ice = panel.getByRole("combobox", { name: "Iceberg" });
  await ice.selectOption({ label: "A-68J" });
  const slider = panel.getByRole("slider", { name: "Track date" });
  await expect(slider).toHaveAttribute("aria-valuetext", "Mar 17, 2021");
  await panel.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.getByRole("group", { name: "Iceberg Drift on the map" })).toBeVisible();
  await expect(slider).toHaveAttribute("aria-valuetext", "Mar 17, 2021");
  await expect(ice).toHaveValue("J");
  await slider.press("Home");
  await expect(panel.getByText("This track starts Jan 30, 2021.")).toBeVisible();
  await slider.press("End");
  await expect(panel.getByText(/Last recorded position · Mar 17, 2021/)).toBeVisible();
  expect(await canvas.evaluate((element, before) => element === before, original)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

async function center(locator: Locator) {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

for (const touch of [false, true]) {
  test.describe(touch ? "phone touch" : "desktop mouse", () => {
    test.use({
      hasTouch: touch,
      isMobile: touch,
      viewport: touch ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    });

    test("drag the recorded track on both projections and return to the same view", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await installFeeds(page, { presentation: "fresh", empty: true });
      await page.goto("/");
      await openStories(page);
      const search = page.getByRole("searchbox", { name: "Find a story" });
      await search.fill("Iceberg Drift");
      const entry = page.getByRole("button", { name: "Iceberg Drift", exact: true });
      await entry.click();
      const panel = page.getByRole("region", { name: "Iceberg Drift", exact: true });
      const handle = panel.getByRole("slider", { name: "A-68A along its track" });
      const date = panel.getByRole("slider", { name: "Track date", exact: true });
      const canvas = page.locator("#globe-view canvas");
      const original = await canvas.elementHandle();
      const reading = panel.locator("#observatory-intro");
      const touchSession = touch ? await page.context().newCDPSession(page) : null;
      const coast = panel.getByText("South Georgia", { exact: true });
      await expect(date).toHaveValue("39");
      for (const projection of ["Globe", "Map"]) {
        await panel.getByRole("button", { name: projection, exact: true }).click();
        await expect(
          panel.getByRole("group", { name: `Iceberg Drift on the ${projection.toLowerCase()}` }),
        ).toBeVisible();
        await panel.getByRole("button", { name: "Jump to 23 Dec" }).click();
        await expect(handle).toHaveAttribute("data-day", "48");
        await expect(handle).toBeVisible();
        const target = await center(handle);
        const coastBefore = await center(coast);
        for (let i = 0; i < 9; i++) await date.press("ArrowLeft");
        await expect(handle).toHaveAttribute("data-day", "39");
        const start = await center(handle);
        if (touchSession) {
          await touchSession.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
          await expect(handle).toHaveAttribute("data-dragging", "");
          await touchSession.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
          await touchSession.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        } else {
          await page.mouse.move(start.x, start.y);
          await page.mouse.down();
          await expect(handle).toHaveAttribute("data-dragging", "");
          await page.mouse.move(target.x, target.y, { steps: 10 });
          await page.mouse.up();
        }
        await expect(date).toHaveAttribute("aria-valuetext", "Dec 23, 2020");
        const coastAfter = await center(coast);
        expect(coastAfter.x).toBeCloseTo(coastBefore.x, 0);
        expect(coastAfter.y).toBeCloseTo(coastBefore.y, 0);
        const open = panel.getByRole("button", { name: "Open satellite image" });
        await open.scrollIntoViewIfNeeded();
        const scroll = await reading.evaluate((element) => element.scrollTop);
        await open.click();
        await expect(panel.getByRole("img", { name: /Landsat 8/ })).toBeVisible();
        await expect(page.locator("[data-scale]")).toHaveCSS("display", "none");
        await panel
          .getByRole("button", { name: projection === "Map" ? "Globe" : "Map", exact: true })
          .click();
        const stage = await center(panel.locator(".replay-stage"));
        await canvas.dispatchEvent("wheel", {
          deltaY: -240,
          clientX: stage.x,
          clientY: stage.y,
          bubbles: true,
          cancelable: true,
        });
        await panel.getByRole("button", { name: "Back to track" }).click();
        await expect(open).toBeFocused();
        await expect(panel.getByRole("button", { name: projection, exact: true })).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        await expect(date).toHaveValue("48");
        await expect(page.locator("[data-scale]")).not.toHaveCSS("display", "none");
        await expect.poll(() => reading.evaluate((element) => element.scrollTop)).toBe(scroll);
        await expect
          .poll(async () => {
            const point = await center(handle);
            return Math.hypot(point.x - target.x, point.y - target.y);
          })
          .toBeLessThan(1);
        await handle.press("ArrowLeft");
        for (let i = 0; i < 8; i++) await date.press("ArrowLeft");
        await expect(date).toHaveValue("39");
      }
      await panel.getByRole("button", { name: "Back to stories" }).click();
      await expect(search).toHaveValue("Iceberg Drift");
      await expect(entry).toBeFocused();
      expect(await canvas.evaluate((node, before) => node === before, original)).toBe(true);
    });
  });
}
