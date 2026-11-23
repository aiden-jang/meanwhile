import { expect, test } from "@playwright/test";
import { installFeeds, openStories, startJourney } from "./feeds";

test("Surface to Seafloor returns to the exact readings on the same canvas", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.route("https://erddap.marine.ie/**", (route) => route.abort());
  await page.goto("/");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  await openStories(page, "all");
  await startJourney(page, "surface-to-seafloor");
  const journey = page.getByRole("region", { name: "Current journey", exact: true });
  const button = (name: string) => page.getByRole("button", { name, exact: true });
  const next = (title: string) => journey.getByRole("button", { name: `Next: ${title}`, exact: true });
  const previous = journey.getByRole("button", { name: "Previous view", exact: true });
  const slider = (name: string) => page.getByRole("slider", { name, exact: true });
  const drifterTime = slider("Replay time");
  const floatProjection = page.getByRole("group", { name: "Float projection", exact: true });
  const sample = slider("Inspect profile sample");
  const section = slider("Distance along section");

  await expect(journey).toContainText("1 of 3");
  await button("Show the full track").click();
  await button("Map").click();
  await drifterTime.press("End");
  await drifterTime.press("ArrowLeft");
  const drifterFix = await drifterTime.inputValue();
  await next("Float Dive").click();
  await expect(journey).toContainText("2 of 3");
  await expect(floatProjection.getByRole("button", { name: "Map", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await button("Follow the rise").click();
  await slider("Ascent depth").press("Home");
  await button("View measured profile").click();
  await button("Salinity").click();
  await sample.press("ArrowRight");
  const floatSample = await sample.inputValue();
  await expect(page.getByRole("region", { name: "Measured float profile" })).toContainText(
    "Next: Seafloor Flight",
  );
  await next("Seafloor Flight").click();
  await expect(journey).toContainText("3 of 3");
  await button("Across Challenger Deep").click();
  await section.press("End");
  await section.press("ArrowLeft");
  const trenchSample = await section.inputValue();

  await previous.click();
  await expect(sample).toHaveValue(floatSample);
  await expect(button("Salinity")).toHaveAttribute("aria-pressed", "true");
  await previous.click();
  await expect(drifterTime).toHaveValue(drifterFix);
  await expect(page.getByRole("group", { name: "Current Rider on the map" })).toBeVisible();
  await next("Float Dive").click();
  await expect(sample).toHaveValue(floatSample);
  await next("Seafloor Flight").click();
  await expect(section).toHaveValue(trenchSample);
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);

  await page.goto("/");
  await openStories(page, "search");
  await button("Continue Surface to Seafloor 3 of 3").click();
  await expect(section).toHaveValue(trenchSample);
  await previous.click();
  await expect(sample).toHaveValue(floatSample);
  await expect(button("Salinity")).toHaveAttribute("aria-pressed", "true");
  await next("Seafloor Flight").click();
  await journey.getByRole("button", { name: "Finish journey", exact: true }).click();
  await expect(journey).toHaveCount(0);
  await expect(page.locator(".related-stories summary")).toBeFocused();
});
