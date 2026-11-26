import { expect, test } from "@playwright/test";
import { installFeeds, openStories, openEarthquakeArchives, selectScene } from "./feeds";

test("Tōhoku reveals the modeled fault before the estimated shaking", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/");
  await selectScene(page, "Below the Surface");
  await openStories(page);
  const trigger = page.getByRole("button", { name: "Rupture Reveal", exact: true });
  const canvas = page.locator("#globe-view canvas");
  const original = await canvas.elementHandle();
  await trigger.click();
  const reveal = page.getByRole("region", { name: "The Tōhoku rupture" });
  await expect(reveal.getByRole("heading", { name: "Off the coast of Honshu" })).toBeVisible();
  await reveal.getByRole("button", { name: "Follow the rupture", exact: true }).click();
  await expect(reveal.getByRole("heading", { name: "Beneath the seafloor." })).toBeVisible();
  await reveal.getByRole("button", { name: "Pause" }).press("Enter");
  await expect(reveal.getByRole("button", { name: "Play" })).toBeVisible();
  await expect(reveal.getByRole("heading", { name: "Beneath the seafloor." })).toBeVisible();
  await reveal.getByRole("button", { name: "Play" }).click();
  await expect(reveal.getByRole("button", { name: "Replay" })).toBeVisible();
  await expect(reveal.getByRole("heading", { name: "Back to the surface." })).toBeVisible();
  await expect(reveal.getByText("Intensity · MMI")).toBeVisible();
  await expect(page.getByRole("group", { name: "The Tōhoku rupture on the globe" })).toContainText(
    "Estimated surface shaking",
  );
  expect(await canvas.evaluate((el, prior) => el === prior, original)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(reveal).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("Tōhoku recordings restore the station pair, cursor, and prior projection", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/#v=observe&story=rupture&chapter=shaking");
  const reveal = page.getByRole("region", { name: "The Tōhoku rupture" });
  const canvas = page.locator("#globe-view canvas");
  const original = await canvas.elementHandle();
  const recorded = reveal.getByRole("button", { name: "Recorded waves", exact: true });
  await recorded.click();
  await expect(reveal.getByRole("heading", { name: "Recorded arrivals" })).toBeVisible();
  await expect(reveal.getByRole("combobox", { name: "Second station" })).toHaveValue("3");
  const japan = reveal.locator('[data-wave-station="MAJO"]');
  const hawaii = reveal.locator('[data-wave-station="KIP"]');
  await expect(reveal.getByText("About 8 min 22 sec")).toBeVisible();
  await expect(japan).not.toHaveAttribute("data-reached");
  await expect(hawaii).not.toHaveAttribute("data-reached");
  await reveal.getByRole("button", { name: "Jump to MAJO onset" }).click();
  await expect(japan).toHaveAttribute("data-reached", "true");
  await expect(hawaii).not.toHaveAttribute("data-reached");
  await reveal.getByRole("button", { name: "Jump to KIP onset" }).click();
  await expect(hawaii).toHaveAttribute("data-reached", "true");
  const first = reveal.getByRole("combobox", { name: "First station" });
  const second = reveal.getByRole("combobox", { name: "Second station" });
  await reveal.getByRole("button", { name: "Pick first on scene" }).click();
  await reveal.locator('[data-wave-station="TATO"]').click();
  await expect(first).toHaveValue("1");
  await reveal.getByRole("button", { name: "Map", exact: true }).click();
  await expect(reveal.getByRole("slider")).toHaveAttribute("aria-valuetext", "05:55:40 UTC");
  expect(await canvas.evaluate((el, prior) => el === prior, original)).toBe(true);
  await expect(hawaii).toHaveAttribute("data-reached", "true");
  await reveal.getByRole("button", { name: "Pick second on scene" }).click();
  await reveal.locator('[data-wave-station="COLA"]').click();
  await expect(second).toHaveValue("4");
  await second.selectOption({ label: "Albuquerque" });
  const slider = reveal.getByRole("slider", { name: "Recording time" });
  await expect(slider).toHaveAttribute("max", "900");
  await reveal.getByRole("button", { name: "Full 90-minute recording" }).click();
  await expect(slider).toHaveAttribute("max", "5400");
  await expect(slider).toHaveValue("556");
  await slider.press("End");
  await expect(slider).toHaveValue("5400");

  const opener = reveal.getByRole("button", { name: "Open Albuquerque trace" });
  const pin = reveal.locator('[data-wave-station="TATO"]');
  const center = async () => {
    const box = await pin.boundingBox();
    if (!box) throw new Error("The comparison pin is outside the scene");
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const before = await center();
  const rail = reveal.locator("#observatory-intro");
  const scroll = () => rail.evaluate((element) => element.scrollTop);
  await opener.scrollIntoViewIfNeeded();
  const scrollBefore = await scroll();
  await opener.click();
  await expect(reveal.getByRole("region", { name: "Station trace" })).toBeVisible();
  await expect(
    reveal.getByRole("img", { name: /Albuquerque, New Mexico, normalized vertical motion/ }),
  ).toBeVisible();
  await reveal.getByRole("button", { name: "Globe", exact: true }).click();
  await canvas.dispatchEvent("wheel", { deltaY: -180, clientX: before.x, clientY: before.y });
  await reveal.getByRole("button", { name: "Back to comparison" }).click();
  await expect(opener).toBeFocused();
  await expect(reveal.getByRole("button", { name: "Map", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(first).toHaveValue("1");
  await expect(second).toHaveValue("5");
  await expect(slider).toHaveValue("5400");
  await expect.poll(scroll).toBe(scrollBefore);
  await expect
    .poll(async () => {
      const after = await center();
      return Math.hypot(after.x - before.x, after.y - before.y);
    })
    .toBeLessThan(1);
  await reveal.getByRole("button", { name: "First 15 minutes" }).click();
  await reveal.getByRole("button", { name: "Jump to TATO onset" }).click();
  await reveal.getByRole("button", { name: "Keep this comparison" }).click();
  await expect(reveal.getByRole("button", { name: "Comparison kept" })).toBeDisabled();
  await reveal.getByRole("button", { name: "Back to surface shaking" }).click();
  await expect(recorded).toBeFocused();
  await expect(reveal.getByRole("button", { name: "Globe", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await recorded.click();
  await expect(first).toHaveValue("1");
  await expect(second).toHaveValue("5");
  await expect(slider).toHaveValue("288");
});

test("Tōhoku archive exposes both maps on a small phone with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.route(
    (url) =>
      url.hostname === "earthquake.usgs.gov" &&
      url.pathname.endsWith("/event/1/query") &&
      url.searchParams.get("starttime")?.startsWith("2011-03-11") === true,
    (route) =>
      route.fulfill({
        json: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              id: "official20110311054624120_30",
              properties: {
                mag: 9.1,
                magType: "mww",
                place: "2011 Great Tohoku Earthquake, Japan",
                time: Date.UTC(2011, 2, 11, 5, 46, 24, 120),
                type: "earthquake",
              },
              geometry: { type: "Point", coordinates: [142.373, 38.297, 29] },
            },
          ],
        },
      }),
  );
  await page.goto("/");
  await openEarthquakeArchives(page);
  await page.getByRole("button", { name: /Japan, 2011/ }).click();
  await expect(page).toHaveURL(/d=2011-03-11/);
  const pinned = page.getByRole("complementary", { name: "Pinned earthquake" });
  const trigger = pinned.getByRole("button", { name: "Watch Tōhoku rupture" });
  const canvas = page.locator("#globe-view canvas");
  const original = await canvas.elementHandle();
  await trigger.click();
  const reveal = page.getByRole("region", { name: "The Tōhoku rupture" });
  await expect(reveal.getByRole("button", { name: "Modeled fault movement" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(reveal.getByRole("button", { name: /reveal/ })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "The Tōhoku rupture on the globe" })).toContainText(
    "Depth exaggerated 4×",
  );
  const model = reveal.getByRole("slider", { name: "Modeled rupture time" });
  await model.press("Home");
  await model.press("ArrowRight");
  await reveal.getByRole("button", { name: "Map", exact: true }).click();
  await expect(model).toHaveValue("1");
  await expect(page.getByRole("group", { name: "The Tōhoku rupture on the map" })).toContainText(
    "Depth exaggerated 4×",
  );
  await reveal.getByRole("button", { name: "Estimated surface shaking", exact: true }).click();
  await expect(reveal.getByRole("heading", { name: "Back to the surface." })).toBeVisible();
  await reveal.getByText("Sources & coverage", { exact: true }).click();
  await expect(reveal.getByRole("link", { name: "USGS ShakeMap" })).toBeVisible();
  const overflow = () => reveal.evaluate((panel) => panel.scrollWidth - panel.clientWidth);
  await expect.poll(overflow).toBe(0);
  await reveal.getByRole("button", { name: "Recorded waves", exact: true }).click();
  const compare = reveal.getByRole("button", { name: "Open Oʻahu trace", exact: true });
  await compare.scrollIntoViewIfNeeded();
  await compare.click();
  const trace = reveal.getByRole("region", { name: "Station trace" });
  await expect(trace.getByRole("img", { name: /Oʻahu, Hawaiʻi, normalized/ })).toBeVisible();
  await expect.poll(overflow).toBe(0);
  await reveal.getByRole("button", { name: "Back to comparison" }).click();
  await expect(compare).toBeFocused();
  await expect(reveal.getByRole("button", { name: "Map", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await reveal.getByRole("button", { name: "Back to surface shaking" }).click();
  await page.setViewportSize({ width: 812, height: 375 });
  await expect.poll(overflow).toBe(0);
  await reveal.getByRole("button", { name: "Back to earthquake" }).click();
  await expect(page).toHaveURL(/d=2011-03-11/);
  expect(await canvas.evaluate((el, prior) => el === prior, original)).toBe(true);
  await expect(reveal).toBeHidden();
  await expect(trigger).toBeFocused();
});
