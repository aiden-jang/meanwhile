import { expect, test, type Page } from "@playwright/test";
import { installFeeds, openStories, selectScene } from "./feeds";

async function openSaved(page: Page) {
  await page.getByRole("button", { name: "Saved observations and recent visits" }).click();
  const collection = page.getByRole("dialog", { name: "Saved observations", exact: true });
  await expect(collection).toBeVisible();
  return collection;
}

const home = "meanwhile. Earth, ocean & sky, back to the Observatory";
test("discovery changes with the scene and keeps the same globe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh" });
  await page.goto("/");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  await openStories(page, "search");
  await expect(page.locator("#open-story-tonga")).toHaveAccessibleName("Tonga’s shockwave");
  await page.locator(".story-today summary").click();
  await expect(page.getByRole("region", { name: "Worth looking at today" })).toContainText(
    "calculated for a level horizon",
  );
  await selectScene(page, "After Dark");
  await openStories(page, "search");
  await expect(page.locator(".featured-story-link")).toHaveAccessibleName("Follow the rover: Moonfall");
  await page.getByRole("button", { name: "Follow the rover: Moonfall", exact: true }).click();
  await expect(page.getByRole("group", { name: "Lunar view" })).toBeVisible();
  await page.getByRole("button", { name: home }).click();
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("a saved lunar traverse resumes after a new page visit", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh" });
  await page.goto("/");
  await selectScene(page, "After Dark");
  await openStories(page, "all");
  await page.getByRole("button", { name: "Moonfall", exact: true }).click();
  await page.getByRole("combobox", { name: "Rover traverse" }).selectOption("1");
  const distance = page.getByRole("slider", { name: "Mapped distance" });
  await distance.press("End");
  const value = await distance.inputValue();
  await page.getByRole("button", { name: "Save view", exact: true }).click();
  await expect(page.locator(".visit-save")).toContainText("Saved on this device");
  // A departing document cannot wait for the next library write to acquire the lock.
  await page.evaluate(
    () =>
      new Promise<void>((acquired) => {
        void navigator.locks.request("eif.visits-v2", () => {
          acquired();
          return new Promise<void>(() => {});
        });
      }),
  );
  await page.goto("/");
  await openStories(page, "all");
  const collection = await openSaved(page);
  await expect(collection.locator(".kept-item")).toContainText("Traverse 2");
  await collection.getByRole("button", { name: "Reopen this moment" }).click();
  await expect(distance).toHaveValue(value);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("a saved float returns to its measured depth after a new page visit", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh" });
  await page.route("https://erddap.marine.ie/**", (route) =>
    route.fulfill({ json: { table: { rows: [] } } }),
  );
  await page.goto("/");
  await openStories(page, "all");
  await page.getByRole("searchbox", { name: "Find a story" }).fill("Float Dive");
  await page.locator("#search-story-float").click();
  await page
    .getByRole("group", { name: "Float projection" })
    .getByRole("button", { name: "Map", exact: true })
    .click();
  await page.getByRole("button", { name: "Follow the rise", exact: true }).click();
  const depth = page.getByRole("slider", { name: "Ascent depth" });
  await depth.press("End");
  const value = "536"; // The finding keeps the recorded warm maximum, not the final surface sample.
  await page.getByText("Add a note (optional)", { exact: true }).click();
  await page
    .getByRole("textbox", { name: /A note for this observation/ })
    .fill("The warmer water was below the shallowest sample.");
  await page.getByRole("button", { name: "Keep the 62 m reading", exact: true }).click();
  await expect(page.getByRole("status", { name: "Kept observation status" })).toHaveText(
    "Saved on this device.",
  );
  await page.goto("/");
  await openStories(page, "all");
  const collection = await openSaved(page);
  await collection.getByRole("button", { name: "Reopen this moment" }).click();
  await expect(depth).toHaveValue(value);
  await expect(page.getByRole("group", { name: "Float projection" })).toBeHidden();
  await expect.poll(() => new URLSearchParams(new URL(page.url()).hash.slice(1)).get("p")).toBe("map");
  await page.getByText("Your note", { exact: true }).click();
  await expect(page.getByRole("textbox", { name: /A note for this observation/ })).toHaveValue(
    "The warmer water was below the shallowest sample.",
  );
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
});

test("saved views and recent history can be cleared independently", async ({ page }) => {
  await installFeeds(page, { presentation: "fresh" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const visit = { id: "float", seen: Date.now(), position: {} };
    localStorage.setItem("eif.visits", JSON.stringify({ version: 1, recent: [visit], saved: [visit] }));
  });
  await page.goto("/");
  await openStories(page, "all");
  const collection = await openSaved(page);
  await collection.getByRole("button", { name: "Remove saved Float Dive" }).click();
  await expect(collection.locator(".kept-item")).toHaveCount(0);
  await collection.getByText("Recent visits", { exact: true }).click();
  await expect(collection.getByRole("button", { name: "Float Dive", exact: true })).toBeVisible();
  await collection.getByRole("button", { name: "Clear recent visits" }).click();
  await expect(collection).toContainText("Recent visits cleared.");
  await collection.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(collection.getByText("Recent visits", { exact: true })).toBeVisible();
  await expect(collection.locator(".kept-item")).toHaveCount(0);
});

test("refused storage keeps a usable visit without promising persistence", async ({ page }) => {
  await installFeeds(page, { presentation: "fresh" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "eif.visits" || key === "eif.visits-v2")
        throw new DOMException("Denied", "QuotaExceededError");
      set.call(this, key, value);
    };
  });
  await page.goto("/#v=observe&story=katrina");
  await page.getByRole("button", { name: "Save view", exact: true }).click();
  await expect(page.locator(".visit-save")).toContainText("Saved for this visit");
  await page.getByRole("button", { name: home }).click();
  await page.getByRole("button", { name: /^Explore (the globe|the layers)$/, exact: true }).click();
  await page.getByRole("button", { name: home }).click();
  await openStories(page, "all");
  await expect((await openSaved(page)).locator(".kept-item")).toContainText("Eye of the Storm");
  expect(await page.evaluate(() => localStorage.getItem("eif.visits-v2"))).toBeNull();
});
