import AxeBuilder from "@axe-core/playwright";
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
  await expect(shelf.locator("[id^=select-journey-]")).toHaveCount(8);
  await shelf.getByRole("button", { name: /^Ice in Motion Start over the Arctic/ }).click();
  const preview = shelf.getByRole("button", { name: "Ice in Motion Preview route", exact: true });
  const path = page.locator("[data-journey-route] path");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  await expect(preview).toBeInViewport();
  const labels = await new AxeBuilder({ page })
    .include(".journey-shelf")
    .withRules(["label-content-name-mismatch"])
    .analyze();
  expect(labels.violations).toEqual([]);
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
  await expect(extent).toHaveAttribute("aria-valuetext", /^18 Jun 2012(?:,| at) 12:00 UTC$/);
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
  const catalogue = page.getByRole("region", { name: "Story catalogue", exact: true });
  await expect(catalogue.getByRole("region", { name: "Start here" })).toBeVisible();
  const resume = catalogue.getByRole("button", { name: "Continue Ice in Motion 2 of 3", exact: true });
  await expect(resume).toBeVisible();
  await resume.click();
  await expect(location).toHaveValue(savedLocation);
  await expect(divider).toHaveValue(savedDivider);
  await expect(glacier.getByRole("group", { name: "Glacier Flow on the globe" })).toBeVisible();
  await guide.getByRole("button", { name: "Previous view", exact: true }).click();
  await expect(extent).toHaveAttribute("aria-valuetext", /^18 Jun 2012(?:,| at) 12:00 UTC$/);
  await expect(ice.getByRole("group", { name: "Ice Line on the map" })).toBeVisible();
});

test("Ice in Motion keeps the pager reachable and reveals the finding after the breakup", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/#v=observe&story=glacier&journey=ice-in-motion&stop=1&p=map");
  const guide = page.getByRole("region", { name: "Current journey", exact: true });
  const glacier = page.getByRole("region", { name: "Glacier Flow", exact: true });
  const next = guide.getByRole("button", { name: "Next: Iceberg Drift", exact: true });
  const year = glacier.getByRole("combobox", { name: "Annual velocity", exact: true });
  const trace = glacier.getByRole("slider", { name: "Trace progress", exact: true });
  await year.selectOption("2013");
  await expect(glacier.locator(".glacier-field figcaption")).toHaveText("2013 annual velocity field");
  await glacier.getByRole("button", { name: "Flowing seaward", exact: true }).click();
  await expect(trace).toHaveValue("24");
  await expect(next).toBeInViewport({ ratio: 1 });
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  await next.click();
  const iceberg = page.getByRole("region", { name: "Iceberg Drift", exact: true });
  const breakup = guide.getByRole("button", { name: "Watch the breakup", exact: true });
  await expect(breakup).toBeInViewport({ ratio: 1 });
  await expect(iceberg.getByRole("button", { name: "Finish journey", exact: true })).toHaveCount(0);
  await breakup.click();
  await guide.getByRole("button", { name: "See the finding", exact: true }).click();
  await expect(iceberg.getByRole("heading", { name: "Three ways ice moves" })).toBeFocused();
  await guide.getByRole("button", { name: "Previous view", exact: true }).click();
  await expect(year).toHaveValue("2013");
  await expect(trace).toHaveValue("24");
  await expect(glacier.getByRole("group", { name: "Glacier Flow on the map" })).toBeVisible();
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});
