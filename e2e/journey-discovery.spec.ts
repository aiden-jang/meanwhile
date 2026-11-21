import { expect, test } from "@playwright/test";
import { installFeeds, openStories } from "./feeds";

test("Ice in Motion previews on the same world and resumes its saved stops after reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/");
  await openStories(page, "search");
  const journeys = page.getByRole("button", { name: "Journeys", exact: true });
  await expect(journeys).toBeInViewport({ ratio: 1 });
  await journeys.click();

  const shelf = page.getByRole("region", { name: "Guided journeys", exact: true });
  const preview = shelf.getByRole("button", { name: "Preview route: Ice in Motion", exact: true });
  const path = page.locator("[data-journey-route] path");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  await expect(preview).toBeInViewport();
  await preview.click();
  await expect(preview).toHaveAttribute("aria-pressed", "true");
  await expect(path).toHaveAttribute("d", /L-?\d/);
  await preview.press("Escape");
  await expect(path).toHaveCount(0);
  await expect(preview).toBeFocused();

  await shelf.getByRole("button", { name: "Start journey", exact: true }).click();
  const guide = page.getByRole("region", { name: "Current journey", exact: true });
  const ice = page.getByRole("region", { name: "Ice Line", exact: true });
  const glacier = page.getByRole("region", { name: "Glacier Flow", exact: true });
  const extent = ice.getByRole("slider", { name: "Observation time", exact: true });
  await ice.getByRole("button", { name: "Map", exact: true }).click();
  await ice.locator(".observation-chart svg").click();
  await expect(extent).toHaveAttribute("aria-valuetext", "18 Jun 2012, 12:00 UTC");
  await guide.getByRole("button", { name: "Next: Glacier Flow", exact: true }).click();
  await glacier.getByRole("button", { name: "Globe", exact: true }).click();
  await glacier.getByRole("button", { name: "Compare 2013 and 2024", exact: true }).click();
  const location = glacier.getByRole("combobox", { name: "Reading location", exact: true });
  const divider = glacier.getByRole("slider", { name: "Velocity map divider", exact: true });
  await location.selectOption({ label: "Inland ice" });
  await divider.press("ArrowRight");
  const savedLocation = await location.inputValue();
  const savedDivider = await divider.inputValue();
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);

  await page.goto("/");
  await openStories(page, "search");
  const resume = shelf.getByRole("button", { name: "Continue Ice in Motion 2 of 3" });
  await expect(resume).toBeVisible();
  await resume.click();
  await expect(location).toHaveValue(savedLocation);
  await expect(divider).toHaveValue(savedDivider);
  await expect(glacier.getByRole("group", { name: "Glacier Flow on the globe" })).toBeVisible();
  await guide.getByRole("button", { name: "Previous view", exact: true }).click();
  await expect(extent).toHaveAttribute("aria-valuetext", "18 Jun 2012, 12:00 UTC");
  await expect(ice.getByRole("group", { name: "Ice Line on the map" })).toBeVisible();
});
