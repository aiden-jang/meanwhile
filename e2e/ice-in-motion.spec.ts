import { expect, test } from "@playwright/test";
import { installFeeds, openStories, startJourney } from "./feeds";

test("Ice in Motion keeps the selected date, glacier pin, and iceberg photograph on one canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  const selectedImage = Promise.withResolvers<void>();
  await page.route(/\/ice-2012-06-18(?:-[\w-]+)?\.webp(?:\?.*)?$/, async (route) => {
    await selectedImage.promise;
    await route.continue();
  });
  await page.goto("/");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  await openStories(page, "all");
  await startJourney(page, "ice-in-motion");
  const region = (name: string) => page.getByRole("region", { name, exact: true });
  const guide = region("Current journey");
  const ice = region("Ice Line");
  const glacier = region("Glacier Flow");
  const iceberg = region("Iceberg Drift");
  const previous = guide.getByRole("button", { name: "Previous view", exact: true });
  const next = (title: string) => guide.getByRole("button", { name: `Next: ${title}`, exact: true });
  const extent = ice.getByRole("slider", { name: "Observation time", exact: true });
  const divider = glacier.getByRole("slider", { name: "Velocity map divider", exact: true });
  const location = glacier.getByRole("combobox", { name: "Reading location", exact: true });
  const fragment = iceberg.getByRole("combobox", { name: "Iceberg", exact: true });

  await expect(guide).toContainText("1 of 3");
  await ice.getByRole("button", { name: "Map", exact: true }).click();
  const chart = ice.locator(".observation-chart svg");
  await chart.click();
  await expect(extent).toHaveValue("90");
  await expect(ice.getByText("Loading the selected observations…")).toBeVisible();
  await next("Glacier Flow").click();
  await expect(guide).toContainText("2 of 3");
  selectedImage.resolve();
  await glacier.getByRole("button", { name: "Globe", exact: true }).click();
  await glacier.getByRole("button", { name: "Compare 2013 and 2024", exact: true }).click();
  await expect(divider).toBeEnabled();
  await location.selectOption({ label: "Inland ice" });
  await divider.press("ArrowRight");
  const pin = await location.inputValue();
  const split = await divider.inputValue();
  await next("Iceberg Drift").click();
  await expect(guide).toContainText("3 of 3");
  const trackDate = iceberg.getByRole("slider", { name: "Track date", exact: true });
  await guide.getByRole("button", { name: "Watch the breakup", exact: true }).click();
  await expect(trackDate).toHaveAttribute("aria-valuetext", "Feb 4, 2021");
  await expect(guide.getByRole("button", { name: "See the finding", exact: true })).toBeVisible();
  await iceberg.getByRole("button", { name: "Fragments", exact: true }).click();
  await fragment.selectOption("E");
  await expect(trackDate).toHaveAttribute("aria-valuetext", "Jan 11, 2021");
  await iceberg.getByRole("button", { name: "Map", exact: true }).click();
  await iceberg.getByRole("button", { name: "Open satellite image", exact: true }).click();
  const photo = iceberg.getByRole("img", { name: /NOAA-20 VIIRS/ });
  await expect(photo).toBeVisible();

  await previous.click();
  await expect(divider).toHaveValue(split);
  await expect(location).toHaveValue(pin);
  await expect(glacier.getByRole("group", { name: "Glacier Flow on the globe" })).toBeVisible();
  await previous.click();
  await expect(extent).toHaveAttribute("aria-valuetext", "18 Jun 2012, 12:00 UTC");
  await expect(ice.getByRole("group", { name: "Ice Line on the map" })).toBeVisible();
  await next("Glacier Flow").click();
  await expect(divider).toHaveValue(split);
  await next("Iceberg Drift").click();
  await expect(photo).toBeVisible();
  await expect(iceberg.getByRole("group", { name: "Iceberg Drift on the map" })).toBeVisible();
  await iceberg.getByRole("button", { name: "Back to track", exact: true }).click();
  await expect(fragment).toHaveValue("E");
  await expect(trackDate).toHaveAttribute("aria-valuetext", "Jan 11, 2021");
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});
