import { expect, test } from "@playwright/test";
import { installFeeds } from "./feeds";

test("Fiji enters from the landing and Back returns the same globe", async ({ page }) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.addInitScript(() => localStorage.setItem("eif.landingRotation", "0"));
  // Establish the exact departure before exercising the animated descent and return.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#v=observe&at=155,-14,1");
  const globe = page.getByRole("region", { name: "Globe", exact: true });
  const canvas = await globe.locator("canvas[data-engine]").elementHandle();
  const opener = page.getByRole("button", { name: "Below the Surface", exact: true });
  const pose = () => new URLSearchParams(new URL(page.url()).hash.slice(1)).get("at");
  await expect.poll(pose).toBe("155,-14,1");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await opener.click();

  const fiji = page.getByRole("region", { name: "Beneath Fiji", exact: true });
  const depth = fiji.getByRole("slider", { name: "Descend beneath the waterline" });
  await expect(depth).toHaveValue("0");
  const section = fiji.getByRole("img", { name: "Fiji earthquake cross section" });
  await expect(section).toHaveAttribute("data-projected", "");
  await expect(depth).toBeInViewport({ ratio: 1 });
  const face = section.locator("[data-section-face]");
  await expect(face).toHaveCSS("opacity", "0");
  await depth.press("PageDown");
  await expect(depth).toHaveValue("100");
  await expect(section).toHaveAttribute("data-depth", "100");
  const opening = (await face.getAttribute("transform"))!;
  await depth.press("PageDown");
  await expect(section).toHaveAttribute("data-depth", "200");
  await expect(face).not.toHaveAttribute("transform", opening);
  await depth.press("Home");
  await expect(depth).toHaveValue("0");
  await expect(face).toHaveCSS("opacity", "0");
  const rail = (await depth.boundingBox())!;
  const x = rail.x + rail.width / 2;
  await page.mouse.move(x, rail.y + 8);
  await page.mouse.down();
  await page.mouse.move(x, rail.y + rail.height * 0.94, { steps: 5 });
  await page.mouse.up();
  await expect(fiji.getByRole("link", { name: "USGS record" })).toHaveAttribute("href", /us1000gcii$/);
  await fiji.getByRole("button", { name: "September quake" }).click();
  await expect(depth).toHaveValue("670.8");
  await expect(fiji.getByRole("link", { name: "USGS record" })).toHaveAttribute("href", /us2000h9e2$/);
  await fiji.getByRole("button", { name: "Select 600 km earthquake, Mww 8.2" }).click();
  await expect(depth).toHaveValue("600");
  await fiji.getByRole("button", { name: "Select 670.8 km earthquake, Mww 7.9" }).press("Enter");
  await expect(depth).toHaveValue("670.8");
  await fiji.getByRole("button", { name: "Back to previous view" }).click();
  await expect(opener).toBeFocused();
  await expect.poll(pose).toBe("155,-14,1");
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});

test("Fiji keeps the phone map, layer panel, and camera when returning from another projection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/#v=explore&p=map&at=159,-12,1.74");
  const world = page.locator("#globe-view");
  const canvas = await world.locator("canvas").elementHandle();
  const pose = () => new URLSearchParams(new URL(page.url()).hash.slice(1)).get("at");
  await expect.poll(pose).toBe("159,-12,1.74");
  const opener = page.getByRole("button", { name: "Descend beneath Fiji", exact: true });
  const panel = page.getByRole("tabpanel", { name: "Layers" });
  const earthquakes = panel.getByRole("button", { name: "Earthquakes", exact: true });
  await expect(earthquakes).toHaveAttribute("aria-pressed", "true");
  await earthquakes.click();
  await expect(earthquakes).toHaveAttribute("aria-pressed", "false");
  const departure = (await opener.boundingBox())!;
  await opener.click();

  const fiji = page.getByRole("region", { name: "Beneath Fiji", exact: true });
  const depth = fiji.getByRole("slider");
  await expect(world).toHaveAttribute("aria-label", "Map");
  await expect(depth).toHaveValue("0");
  await depth.press("End");
  await expect(fiji.locator('[data-fiji-event="us2000h9e2"]')).toBeInViewport();
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 568, height: 320 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(() =>
        page.evaluate(() =>
          [
            [".fiji-back", ".fiji-title"],
            [".fiji-title", ".fiji-reading"],
            [".fiji-navigation .story-projection", ".fiji-depth-control"],
            [".fiji-reading", ".fiji-credit"],
          ].filter(([first, second]) => {
            const a = document.querySelector(first)!.getBoundingClientRect();
            const b = document.querySelector(second)!.getBoundingClientRect();
            return (
              a.left < b.right + 6 && a.right + 6 > b.left && a.top < b.bottom + 6 && a.bottom + 6 > b.top
            );
          }),
        ),
      )
      .toEqual([]);
  }
  await expect(page.locator(".creator-credit")).toBeHidden();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await fiji.getByRole("button", { name: "Globe", exact: true }).click();
  await expect(world).toHaveAttribute("aria-label", "Globe");
  await expect(depth).toHaveValue("670.8");
  await fiji.getByRole("button", { name: "Back to previous view" }).click();
  await expect(world).toHaveAttribute("aria-label", "Map");
  await expect(earthquakes).toHaveAttribute("aria-pressed", "false");
  await expect(opener).toBeFocused();
  await expect.poll(pose).toBe("159,-12,1.74");
  await expect
    .poll(() =>
      opener.evaluate(async (marker, origin) => {
        for (let i = 0; i < 6; i++) {
          await new Promise(requestAnimationFrame);
          const rect = marker.getBoundingClientRect();
          if (document.activeElement !== marker || Math.hypot(rect.x - origin.x, rect.y - origin.y) > 1)
            return false;
        }
        return true;
      }, departure),
    )
    .toBe(true);
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});
