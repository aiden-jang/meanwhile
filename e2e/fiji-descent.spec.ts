import { expect, test } from "@playwright/test";
import { installFeeds } from "./feeds";

test("Fiji enters from the landing and Back returns the same globe", async ({ page }) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.addInitScript(() => localStorage.setItem("eif.landingRotation", "0"));
  await page.goto("/#v=observe&at=155,-14,1");
  const globe = page.getByRole("region", { name: "Globe", exact: true });
  const canvas = await globe.locator("canvas").elementHandle();
  const opener = page.getByRole("button", { name: "Below the Surface", exact: true });
  const pose = () => new URLSearchParams(new URL(page.url()).hash.slice(1)).get("at");
  await expect.poll(pose).toBe("155,-14,1");
  await opener.click();

  const fiji = page.getByRole("region", { name: "Beneath Fiji", exact: true });
  const depth = fiji.getByRole("slider", { name: "Descend beneath the waterline" });
  await expect(depth).toHaveValue("0");
  await expect(fiji.getByText("At the waterline", { exact: true })).toBeVisible();
  await expect(depth).toBeInViewport({ ratio: 1 });
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
  await opener.click();

  const fiji = page.getByRole("region", { name: "Beneath Fiji", exact: true });
  const depth = fiji.getByRole("slider");
  await expect(world).toHaveAttribute("aria-label", "Map");
  await expect(depth).toHaveValue("0");
  await depth.press("End");
  await expect(fiji.getByText("Epicentre", { exact: true })).toBeInViewport();
  await fiji.getByRole("button", { name: "Globe", exact: true }).click();
  await expect(world).toHaveAttribute("aria-label", "Globe");
  await expect(depth).toHaveValue("670.8");
  await fiji.getByRole("button", { name: "Back to previous view" }).click();
  await expect(world).toHaveAttribute("aria-label", "Map");
  await expect(earthquakes).toHaveAttribute("aria-pressed", "false");
  await expect(opener).toBeFocused();
  await expect.poll(pose).toBe("159,-12,1.74");
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});
