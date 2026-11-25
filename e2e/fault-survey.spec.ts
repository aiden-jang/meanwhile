import { expect, test } from "@playwright/test";
import { installFeeds, openStories } from "./feeds";

test("Fault Offset keeps the survey and exact framing when returning from radar", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/");
  const canvas = page.locator("#globe-view canvas");
  const original = await canvas.elementHandle();
  await openStories(page, "search");
  const search = page.getByRole("searchbox", { name: "Find a story" });
  await search.fill("Ridgecrest");
  const launch = page.locator("#search-story-fault");
  const launchTop = await launch.evaluate((element) => element.getBoundingClientRect().top);
  await launch.click();
  const panel = page.getByRole("region", { name: "Fault Offset", exact: true });
  const compare = panel.getByRole("button", { name: "Compare radar", exact: true });
  const survey = panel.getByRole("slider", { name: "Scrub survey sites" });
  const chosen = panel.locator(".story-sites button[aria-pressed=true]");
  const anchor = panel.locator(".story-sites button").first();
  await expect(survey).toHaveValue("7");
  await expect(compare).toBeInViewport({ ratio: 1 });
  await expect(survey).toBeInViewport({ ratio: 1 });
  await compare.click({ trial: true });
  await expect(anchor).toHaveAttribute("style", /left:/);
  const camera = await anchor.evaluate((element) => [element.style.left, element.style.top]);

  await survey.press("ArrowLeft");
  await expect(survey).toHaveValue("6");
  await expect(survey).toHaveAttribute("aria-valuetext", "Gully · 30377, 1.48 m left");
  await expect(chosen).toHaveAccessibleName("Inspect Gully · 30377");
  expect(await anchor.evaluate((element) => [element.style.left, element.style.top])).toEqual(camera);
  await expect(chosen).toBeVisible();
  const origin = await chosen.boundingBox();
  const scroll = await panel.locator("#observatory-intro").evaluate((pane) => pane.scrollTop);

  await compare.focus();
  await page.keyboard.press("Enter");
  await expect(panel.getByText("One color cycle shows", { exact: false })).toBeVisible();
  await panel.getByRole("button", { name: "Map", exact: true }).click();
  await expect(panel.getByRole("group", { name: "Fault Offset on the map" })).toBeVisible();
  await expect(chosen).toHaveAccessibleName("Inspect Gully · 30377");
  const stage = await panel.locator(".replay-stage").boundingBox();
  await canvas.dispatchEvent("wheel", {
    deltaY: -300,
    clientX: stage!.x + 80,
    clientY: stage!.y + 100,
    cancelable: true,
  });
  await expect(page.locator("[data-orbit-readout]")).toContainText("4.38×");

  await panel.getByRole("button", { name: "Back to survey", exact: true }).click();
  await expect(panel.getByRole("group", { name: "Fault Offset on the globe" })).toBeVisible();
  await expect(survey).toHaveValue("6");
  await expect(compare).toBeFocused();
  await expect
    .poll(() => panel.locator("#observatory-intro").evaluate((pane) => pane.scrollTop))
    .toBe(scroll);
  await expect.poll(() => chosen.boundingBox()).toEqual(origin);
  expect(await canvas.evaluate((element, before) => element === before, original)).toBe(true);
  await panel.getByRole("button", { name: "Back to stories", exact: true }).click();
  await expect(search).toHaveValue("Ridgecrest");
  await expect(launch).toBeFocused();
  expect(
    Math.abs((await launch.evaluate((element) => element.getBoundingClientRect().top)) - launchTop),
  ).toBeLessThan(2);
});
