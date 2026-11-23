import { expect, test } from "@playwright/test";
import { installFeeds, openStories } from "./feeds";

for (const [id, title] of [
  ["aurora", "Aurora Overflight"],
  ["sun", "Sun Watch"],
  ["meteors", "Meteor Nights"],
  ["radar", "Storm Radar"],
] as const) {
  test(`${title} reopens after a refresh and a single Back returns to search`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installFeeds(page, { presentation: "fresh", empty: true });
    await page.goto("/");
    await openStories(page, "search");
    const search = page.getByRole("searchbox", { name: "Find a story" });
    await search.fill(title);
    await page.locator(`#search-story-${id}`).click();
    await expect(page).toHaveTitle(new RegExp(title));
    await expect(page).toHaveURL(new RegExp(`story=${id}`));
    await page.goBack();
    await expect(search).toHaveValue(title);
    await page.goForward();
    await expect(page).toHaveTitle(new RegExp(title));
    await page.reload();
    await expect(page).toHaveTitle(new RegExp(title));
    await expect(
      page
        .getByRole("heading", { name: id === "aurora" ? "Into the auroral oval." : title, exact: true })
        .first(),
    ).toBeVisible();
  });
}

test("browser Back and reload keep the current journey stop, date and map", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/#v=observe&story=ice&journey=ice-in-motion&stop=0");
  const guide = page.getByRole("region", { name: "Current journey" });
  await expect(guide).toContainText("1 of 3");
  const ice = page.getByRole("region", { name: "Ice Line", exact: true });
  const time = ice.locator("#earth-story-time");
  await expect(time).toBeVisible();
  const map = ice.getByRole("button", { name: "Map", exact: true });
  await map.click();
  await expect(map).toHaveAttribute("aria-pressed", "true");
  await time.press("End");
  await expect(time).toHaveValue((await time.getAttribute("max"))!);
  await expect(ice.locator(".story-time")).toHaveAttribute("data-compact-ending", "true");
  const date = await time.getAttribute("aria-valuetext");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  await guide.getByRole("button", { name: "Next: Glacier Flow" }).click();
  await expect(guide).toContainText("2 of 3");
  await page.goBack();
  await expect(guide).toContainText("1 of 3");
  await expect(time).toHaveAttribute("aria-valuetext", date!);
  await expect(map).toHaveAttribute("aria-pressed", "true");
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
  await page.goForward();
  await expect(guide).toContainText("2 of 3");
  await expect(page).toHaveURL(/journey=ice-in-motion&stop=1/);
  await page.reload();
  await expect(guide).toContainText("2 of 3");
  await guide.getByRole("button", { name: "Previous view" }).click();
  await expect(time).toHaveAttribute("aria-valuetext", date!);
  await expect(map).toHaveAttribute("aria-pressed", "true");
});

test("dismissing Find restores the story without changing the sky time", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/#story=meteors");
  const time = page.getByRole("slider", { name: "City local time", exact: true });
  await time.press("End");
  const selected = await time.inputValue();
  const find = page.getByRole("button", { name: "Find a story", exact: true });
  await find.click();
  const search = page.getByRole("searchbox", { name: "Search all stories" });
  await search.fill("Tonga");
  await expect(page.getByRole("dialog").getByRole("button", { name: /Tonga’s shockwave/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(search).toHaveCount(0);
  await expect(time).toHaveValue(selected);
  await expect(find).toBeFocused();
});

test("Comet Return restores the flat map and archive time after a local sky visit", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/#v=observe&story=comet&p=map");
  const map = page.getByRole("button", { name: "Map", exact: true }).first();
  const time = page.getByRole("slider", { name: /July 2020/ });
  await expect(map).toHaveAttribute("aria-pressed", "true");
  await time.press("Home");
  await expect(time).toHaveValue("0");
  const earlier = await time.inputValue();
  await page.getByRole("button", { name: "See from my city", exact: true }).click();
  await expect(time).not.toHaveValue(earlier);
  await page.getByRole("button", { name: "Back to Earth", exact: true }).click();
  await expect(map).toHaveAttribute("aria-pressed", "true");
  await expect(time).toHaveValue(earlier);
});

test("From Radar to Recovery returns to the held scan, Gulf fix and night-light divider", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  const now = Math.floor(Date.now() / 600_000) * 600_000;
  const scans = [now - 1_200_000, now - 600_000, now];
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGOQW///PwAFhwLMAV5hdQAAAABJRU5ErkJggg==",
    "base64",
  );
  let rolled = false;
  await page.route("**/radar_base_reflectivity_time/ImageServer/query?**", (route) =>
    route.fulfill({
      json: {
        features: (rolled ? scans.slice(1) : scans).map((at) => ({
          attributes: { objectid: scans.indexOf(at) + 1, idp_validtime: at },
        })),
      },
    }),
  );
  await page.route("**/radar_base_reflectivity_time/ImageServer/exportImage?**", (route) =>
    route.fulfill({ contentType: "image/png", body: png }),
  );

  await page.goto("/#v=observe&story=radar&journey=radar-to-recovery&stop=0&choice=south");
  const journey = page.getByRole("region", { name: "Current journey" });
  const action = (name: string) => journey.getByRole("button", { name, exact: true });
  const radar = page.getByRole("region", { name: "Storm Radar", exact: true });
  const storm = page.getByRole("region", { name: "Eye of the Storm", exact: true });
  const lights = page.getByRole("region", { name: "Lights Return", exact: true });
  const globe = page.locator("#globe-view");
  const canvas = await globe.locator("canvas").elementHandle();
  const map = (panel: typeof radar) => panel.getByRole("button", { name: "Map", exact: true });
  const scan = radar.getByRole("slider", { name: "Radar scan time" });
  const radarTime = radar.locator(".radar-clock time");
  await expect(journey).toContainText("From Radar to Recovery");
  await expect(radar.getByLabel("Coverage", { exact: true })).toHaveValue("us");
  await scan.press("Home");
  await expect(radarTime).toHaveAttribute("datetime", new Date(scans[0]!).toISOString());
  await expect(radar.getByRole("status", { name: "Radar status" })).toHaveText(
    "Select a time to compare the observed scans.",
  );
  await map(radar).click();
  await expect(map(radar)).toHaveAttribute("aria-pressed", "true");
  await globe.focus();
  await globe.press("ArrowRight");
  await expect(page).toHaveURL(/at=/);
  const readPose = () =>
    page.evaluate(() => {
      const raw = localStorage.getItem("eif.journey-progress-v1:radar-to-recovery");
      return JSON.parse(raw!).stops.find(([step]: [number]) => step === 0)[1].arrival.pose;
    });

  await action("Follow Katrina").click();
  const radarPose = await readPose();
  await expect(map(storm)).toHaveAttribute("aria-pressed", "true");
  await storm.getByRole("button", { name: "Follow the storm", exact: true }).click();
  await expect(storm.getByRole("heading", { name: "Landfall near Buras, Louisiana" })).toBeVisible();
  await storm.getByRole("button", { name: "Inspect offshore peak", exact: true }).click();
  const fixes = storm.getByRole("slider", { name: "Recorded fix" });
  await fixes.press("ArrowRight");
  await expect(fixes).toHaveValue("4");
  await expect(storm.locator(".storm-measurements")).toContainText("905 hPa");

  const recovery = action("Follow Maria’s recovery");
  await expect(recovery).toBeInViewport({ ratio: 1 });
  await recovery.click();
  await expect(map(lights)).toHaveAttribute("aria-pressed", "true");
  const period = lights.getByRole("slider", { name: "Night-light period" });
  const divider = lights.getByRole("slider", { name: "Before and after divider" });
  await expect(period).toHaveValue("1");
  await period.press("End");
  await divider.press("Home");
  await divider.press("ArrowRight");

  await action("Previous view").click();
  await expect(fixes).toHaveValue("4");
  await expect(map(storm)).toHaveAttribute("aria-pressed", "true");
  await recovery.click();
  await expect(period).toHaveValue("3");
  await expect(divider).toHaveValue("1");
  await action("Previous view").click();
  rolled = true;
  await action("Previous view").click();
  await expect(map(radar)).toHaveAttribute("aria-pressed", "true");
  await expect(radar.getByLabel("Radar region")).toHaveValue("south");
  await expect(radarTime).toHaveAttribute("datetime", new Date(scans[0]!).toISOString());
  await expect(radar.getByRole("status", { name: "Radar status" })).toHaveText(
    "Select a time to compare the observed scans.",
  );
  await action("Follow Katrina").click();
  const restored = await readPose();
  for (const key of ["lon", "lat", "zoom"]) expect(restored[key]).toBeCloseTo(radarPose[key], 2);
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});
