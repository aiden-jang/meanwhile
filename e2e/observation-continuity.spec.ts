import { expect, test, type Page } from "@playwright/test";
import { installFeeds } from "./feeds";

async function open(page: Page, story: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/#v=observe&story=" + story);
}
test("two tabs keep independent readings and reflect removals and undo", async ({ page, context }) => {
  const other = await context.newPage();
  await open(page, "aral");
  await open(other, "glacier");
  const tabs = [page, other];
  await Promise.all(tabs.map((p) => p.getByRole("button", { name: "Save view", exact: true }).click()));
  const saved = (p: Page) => p.getByRole("dialog", { name: "Saved observations" });
  for (const p of tabs) {
    await p.locator("#open-saved-observations").click();
    await expect(saved(p).getByRole("article")).toHaveCount(2);
  }
  const reading = (p: Page) => saved(p).locator(".kept-item").filter({ hasText: "Glacier Flow" });
  for (const p of tabs) await reading(p).locator(".kept-note summary").click();
  const note = (p: Page) => reading(p).getByRole("textbox");
  await note(other).fill("Blue ice");
  await reading(other).getByRole("button", { name: "Save note" }).click();
  await expect(note(page)).toHaveValue("Blue ice");
  await note(page).fill("My unfinished draft");
  await note(other).fill("Across both years");
  await reading(other).getByRole("button", { name: "Save note" }).click();
  await expect(reading(other).getByText("Note saved.", { exact: true })).toBeVisible();
  await expect(note(page)).toHaveValue("My unfinished draft");
  await saved(page)
    .getByRole("button", { name: /Remove saved/ })
    .first()
    .click();
  await expect(saved(other).getByRole("article")).toHaveCount(1);
  await saved(page).getByRole("button", { name: "Undo" }).click();
  await expect(saved(other).getByRole("article")).toHaveCount(2);
  await other.reload();
  await other.locator("#open-saved-observations").click();
  await expect(saved(other).getByRole("article")).toHaveCount(2);
});

test("phone Saved keeps background controls out of keyboard navigation and restores its opener", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "aral");
  const trigger = page.locator("#open-saved-observations");
  await trigger.click();
  await expect(page.locator("#saved-observations:modal")).toBeVisible();
  const heading = page.locator("#saved-heading");
  await expect(heading).toBeFocused();
  await trigger.evaluate((button) => button.focus());
  await expect(heading).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close saved observations" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("switching glacier years holds the trace at the same point", async ({ page }) => {
  await open(page, "glacier");
  const panel = page.getByRole("region", { name: "Glacier Flow", exact: true });
  await panel.getByRole("button", { name: "Flowing seaward", exact: true }).click();
  const chapters = panel.getByRole("group", { name: "Story moments" });
  await expect(chapters.locator("img")).toHaveCount(0);
  await expect(chapters.getByRole("button", { name: "Flowing seaward" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const slider = panel.getByRole("slider");
  const value = await slider.inputValue();
  for (const year of ["2013", "2024"]) {
    await panel.getByRole("combobox", { name: "Annual velocity" }).selectOption(year);
    await expect(panel.locator(".glacier-field figcaption")).toHaveText(year + " annual velocity field");
    await expect(
      panel.getByText(year + " mean velocity · 50% of illustrative trace", { exact: true }).first(),
    ).toBeVisible();
    await expect(slider).toHaveValue(value);
  }
});
test("closing the lidar slice keeps the chosen dust observation", async ({ page }) => {
  await open(page, "dust");
  await page.getByRole("button", { name: "Open lidar slice" }).click();
  const slider = page.getByRole("slider", { name: "Observation time", exact: true });
  await expect(page.getByRole("slider", { name: "Profile altitude", exact: true })).toBeVisible();
  await slider.press("Home");
  const value = await slider.inputValue();
  await page.getByRole("button", { name: "Close lidar slice" }).click();
  await expect(slider).toHaveValue(value);
  await expect(page.getByRole("slider", { name: "Profile altitude", exact: true })).toHaveCount(0);
});
test("one click reopens the local sky after switching to the map", async ({ page }) => {
  await open(page, "apophis");
  const city = page.getByRole("button", { name: "See from my city" });
  await city.click();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await city.click();
  await expect(page.getByRole("button", { name: "Back to Earth", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("the glacier comparison keeps its sample and divider across projections and shared links", async ({
  page,
  context,
}) => {
  await open(page, "glacier");
  const panel = page.getByRole("region", { name: "Glacier Flow", exact: true });
  await panel.getByRole("button", { name: "Compare 2013 and 2024" }).click();
  const divide = panel.getByRole("slider", { name: "Velocity map divider" });
  await expect(divide).toBeEnabled();
  const location = panel.getByRole("combobox", { name: "Reading location" });
  await location.selectOption({ label: "Inland ice" });
  const values = panel.locator(".velocity-readings");
  await expect(values).toContainText("1,699 m/year");
  await expect(values).toContainText("1,405 m/year");
  await divide.press("ArrowRight");
  await expect(divide).toHaveValue("51");
  await panel.getByRole("button", { name: "Map", exact: true }).click();
  await expect(divide).toHaveValue("51");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => false });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (url: string) => Object.assign(window, { glacierLink: url }) },
    });
  });
  await panel.getByRole("button", { name: "Share this moment", exact: true }).click();
  await expect(panel.getByRole("status", { name: "Sharing status" })).toContainText("Link copied");
  const url = await page.evaluate(() => Reflect.get(window, "glacierLink") as string);
  await page.close();
  const reopened = await context.newPage();
  await reopened.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(reopened, { presentation: "fresh", empty: true });
  await reopened.goto(url);
  const restored = reopened.getByRole("region", { name: "Glacier Flow", exact: true });
  await expect(restored.getByRole("slider", { name: "Velocity map divider" })).toHaveValue("51");
  await expect(restored.locator(".velocity-readings")).toContainText("1,405 m/year");
  await expect(restored.getByRole("button", { name: "Map", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
