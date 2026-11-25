import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { installFeeds, openLayer, openStories } from "./feeds";

for (const [id, title] of [
  ["aurora", "Aurora Overflight"],
  ["sun", "Sun Watch"],
  ["meteors", "Meteor Nights"],
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
  const find = page.getByRole("button", { name: "Find", exact: true });
  await find.click();
  const search = page.getByRole("searchbox", { name: "Search places, stories and layers" });
  await search.fill("Tonga");
  await expect(page.getByRole("dialog").getByRole("button", { name: /Tonga’s shockwave/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(search).toHaveCount(0);
  await expect(time).toHaveValue(selected);
  await expect(find).toBeFocused();
});

test("Find holds a playing story and resumes it when dismissed", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/#v=observe&story=tonga");
  const story = page.getByRole("region", { name: "Tonga’s shockwave", exact: true });
  const follow = story.getByRole("button", { name: "Follow the wave", exact: true });
  const play = story.getByRole("button", { name: "Play", exact: true });
  const pause = story.getByRole("button", { name: "Pause", exact: true });
  await follow.click();
  await play.click();
  await expect(pause).toBeVisible();
  const find = page.getByRole("button", { name: "Find", exact: true });
  await find.click();
  const dialog = page.getByRole("dialog", { name: "Find", exact: true });
  await expect(dialog).toBeVisible();
  await expect(story.locator("button.story-playback")).toHaveAttribute("data-playback-start", "true");
  await dialog.getByRole("button", { name: "Close Find", exact: true }).click();
  await expect(pause).toBeVisible();
  await expect(find).toBeFocused();
});

test("Find goes directly to places and layers, while Explore and Back restore their own views", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/#v=observe&at=-74,40,1");
  const button = (name: string) => page.getByRole("button", { name, exact: true });
  const find = button("Find");
  const dialog = page.getByRole("dialog", { name: "Find", exact: true });
  const search = dialog.getByRole("searchbox", { name: "Search places, stories and layers" });
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  const place = page.getByRole("heading", { name: "Around Tokyo", exact: true });
  await find.click();
  await expect(search).toBeFocused();
  await search.fill("Tokyo");
  await expect(
    dialog.getByRole("region", { name: "Places", exact: true }).getByRole("button", {
      name: "Tokyo",
      exact: true,
    }),
  ).toBeVisible();
  await search.press("Enter");
  await expect(place).toBeFocused();
  await button("Back to Find").click();
  await expect(search).toHaveValue("Tokyo");
  await expect(dialog.getByRole("button", { name: "Tokyo", exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "Tokyo", exact: true }).click();
  await button("Map").click();
  const camera = () => new URLSearchParams(new URL(page.url()).hash.slice(1)).get("at");
  await expect.poll(camera).toBe("139.65,35.68,2.2");
  const layerPreferences = await page.evaluate(() => localStorage.getItem("eif.mapLayers"));
  await find.click();
  await search.fill("Storm Radar");
  await expect(dialog.getByRole("button", { name: /^Storm radar$/i })).toHaveCount(1);
  await dialog
    .getByRole("region", { name: "Layers", exact: true })
    .getByRole("button", {
      name: "Storm radar",
      exact: true,
    })
    .click();
  await expect(page.getByRole("heading", { name: "Storm radar", exact: true })).toBeFocused();
  await expect(page.locator("#globe-view")).toHaveAttribute("aria-label", "Map");
  expect(await page.evaluate(() => localStorage.getItem("eif.mapLayers"))).toBe(layerPreferences);
  await page.goBack();
  await expect(search).toHaveValue("Storm Radar");
  await expect(dialog.getByRole("button", { name: "Storm radar", exact: true })).toBeFocused();
  await button("Close Find").click();
  await expect(place).toBeVisible();
  await expect(find).toBeFocused();
  await expect.poll(camera).toBe("139.65,35.68,2.2");
  await page.getByRole("tab", { name: "Stories", exact: true }).click();
  const catalogue = page.getByRole("searchbox", { name: "Find a story", exact: true });
  await catalogue.fill("Tonga");
  const result = page.locator("#search-story-tonga");
  await result.click();
  await button("Back to stories").click();
  await expect(result).toBeFocused();
  await expect(catalogue).toHaveValue("Tonga");
  await result.click();
  await button("Explore").click();
  await expect(place).toBeHidden();
  await expect(page.getByRole("button", { name: "Storm radar details" })).toBeVisible();
  await expect(page.locator("#globe-view")).toHaveAttribute("aria-label", "Map");
  await expect.poll(camera).toBe("139.65,35.68,2.2");
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});

test("Find and layer returns stay in reach while scrolling on a short phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", radar: "default", empty: true });
  await page.goto("/");
  await page.getByRole("button", { name: "Find", exact: true }).click();
  const find = page.getByRole("dialog", { name: "Find", exact: true });
  const search = find.getByRole("searchbox");
  await search.fill("earth");
  await find.evaluate((panel) => (panel.scrollTop = panel.scrollHeight));
  expect(await find.evaluate((panel) => panel.scrollTop)).toBeGreaterThan(0);
  await expect(search).toBeInViewport({ ratio: 1 });
  await find.getByRole("button", { name: "Close Find", exact: true }).click();
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  const radar = page.getByRole("button", { name: "Storm radar details", exact: true });
  await radar.click();
  const rail = page.locator("#chrome-rail");
  await rail.evaluate((panel) => (panel.scrollTop = panel.scrollHeight));
  expect(await rail.evaluate((panel) => panel.scrollTop)).toBeGreaterThan(0);
  const back = rail.getByRole("button", { name: "Back to layers", exact: true });
  await expect(back).toBeInViewport({ ratio: 1 });
  await back.click();
  await expect(radar).toBeFocused();
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

test("the landing keeps Explore usable while the globe loads", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  let releaseGlobe!: () => void;
  const loading = new Promise<void>((resolve) => {
    releaseGlobe = resolve;
  });
  await page.route(/\/(?:Globe-[\w-]+\.js|src\/globe\/Globe\.tsx)(?:\?|$)/, async (route) => {
    await loading;
    await route.continue();
  });
  const entrances = page.getByRole("group", { name: "Explore by subject" });
  const earth = entrances.getByRole("button", { name: "Earth", exact: true });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(earth).toBeEnabled();
    await expect(entrances.getByRole("button", { name: "Below the Surface" })).toBeDisabled();
    await expect(entrances.getByRole("button", { name: "After Dark" })).toBeDisabled();
  } finally {
    releaseGlobe();
  }
  await expect(page.locator("#globe-view canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Explore", exact: true })).toHaveCount(1);
  await earth.click();
  await expect(page.getByRole("tab", { name: "Layers", exact: true })).toBeFocused();
  await expect(page.getByRole("heading", { name: "Storm radar" })).toBeHidden();
});

test("Layers holds the radar scan and scene tabs restore each position", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  const now = new Date("2026-11-24T09:30:00Z").getTime();
  await page.clock.setFixedTime(now);
  await page.addInitScript(() => {
    localStorage.setItem("eif.sky-city", "Tokyo");
    localStorage.setItem("eif.mapLayers", JSON.stringify({ radar: false, earthquakes: false }));
  });
  const scans = [now - 1_200_000, now - 600_000, now];
  await page.route("https://api.rainviewer.com/public/weather-maps.json", (route) =>
    route.fulfill({
      json: {
        host: "https://tilecache.rainviewer.com",
        radar: { past: scans.map((at, i) => ({ time: at / 1000, path: `/v2/radar/continuity${i}` })) },
      },
    }),
  );
  await page.route("https://tilecache.rainviewer.com/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGOQW///PwAFhwLMAV5hdQAAAABJRU5ErkJggg==",
        "base64",
      ),
    }),
  );
  await page.goto("/");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  const pose = () => new URLSearchParams(new URL(page.url()).hash.slice(1)).get("at");
  const tab = (name: string) =>
    page.getByRole("group", { name: "Explore by subject" }).getByRole("button", { name, exact: true });
  await tab("Earth").click();
  await expect(page.getByRole("button", { name: "Storm radar", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("button", { name: "Storm radar", exact: true }).click();
  await openLayer(page, "Storm radar");
  const radar = page.getByRole("region", { name: "Storm radar playback" });
  const scan = page.getByRole("slider", { name: "Radar scan time" });
  const openLayers = page.getByRole("button", { name: "Back to layers", exact: true });
  await expect(page.getByRole("heading", { name: "Storm radar", exact: true })).toBeFocused();
  await expect(scan).toBeEnabled();
  await expect(scan).toBeInViewport({ ratio: 1 });
  await scan.press("Home");
  await expect(scan).toHaveValue("0");
  await expect(radar).toBeVisible();
  await expect(
    page.locator(".radar-clock time[data-radar-displayed]").filter({ visible: true }),
  ).toHaveAttribute("datetime", new Date(scans[0]!).toISOString());
  await openLayers.click();
  await page.getByRole("button", { name: "Storm radar details", exact: true }).click();
  await expect(scan).toHaveValue("0");
  await page.getByRole("button", { name: /back to the Observatory/ }).click();
  await tab("Below the Surface").click();
  const depth = page.getByRole("region", { name: "Earthquake cutaway" });
  await expect.poll(pose).toBe("-176,-18.3,1.95");
  const handle = depth.getByRole("slider", { name: "Drag to change depth" });
  await expect(handle).toBeInViewport({ ratio: 1 });
  await handle.press("End");
  await expect(handle).toHaveAttribute("aria-valuetext", "900 km");
  await expect(depth.getByText("670.8 km deep", { exact: true })).toBeVisible();
  await expect(depth.getByRole("button", { name: "900 km", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(depth.getByRole("button", { name: "Read South of Levuka, Fiji · 670.8 km" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await depth.getByText("Quake readings & sources", { exact: true }).click();
  await expect(depth.getByRole("link", { name: "USGS event record" })).toHaveAttribute("href", /us2000h9e2$/);
  await tab("After Dark").click();
  await expect(page.getByRole("heading", { name: "Tonight’s Sky", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "City", exact: true })).toHaveValue("Tokyo");
  const sky = page.getByRole("slider", { name: "City local time", exact: true });
  await expect(sky).toBeInViewport({ ratio: 1 });
  await expect(tab("After Dark")).toBeInViewport({ ratio: 1 });
  await sky.press("End");
  const time = await sky.getAttribute("aria-valuetext");
  await tab("Earth").click();
  await expect(scan).toBeHidden();
  await openLayer(page, "Storm radar");
  await expect(scan).toHaveValue("0");
  await page.goBack();
  await expect(sky).toHaveAttribute("aria-valuetext", time!);
  await tab("Below the Surface").click();
  await expect(handle).toHaveAttribute("aria-valuetext", "900 km");
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("eif.mapLayers")!).radar)).toBe(true);
});

test("the cutaway and sky panels show the shared world through their edge", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  const { width, height } = page.viewportSize()!;
  const stacked = width < 600 || (width < 900 && height >= 621);
  const panelOverlap = () =>
    page.locator(".observatory-sidebar:visible").evaluate((panel, vertical) => {
      const rail = panel.getBoundingClientRect();
      const world = document.querySelector("#globe-view canvas")!.getBoundingClientRect();
      return vertical ? world.bottom - rail.top : rail.right - world.left;
    }, stacked);
  const subjects = page.getByRole("group", { name: "Explore by subject" });
  await subjects.getByRole("button", { name: "Below the Surface", exact: true }).click();
  const cutaway = page.getByRole("region", { name: "Earthquake cutaway" });
  await expect.poll(panelOverlap).toBeGreaterThan(stacked ? 12 : 128);
  await expect(cutaway.getByRole("slider", { name: "Drag to change depth" })).toBeInViewport();
  await cutaway
    .getByRole("group", { name: "Cutaway projection" })
    .getByRole("button", { name: "Map" })
    .click();
  await expect(page.locator("#globe-view")).toHaveAttribute("aria-label", "Map");
  await expect.poll(panelOverlap).toBeGreaterThan(stacked ? 12 : 128);
  await subjects.getByRole("button", { name: "After Dark", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tonight’s Sky", exact: true })).toBeVisible();
  await expect.poll(panelOverlap).toBeGreaterThan(stacked ? 12 : 128);
  await expect(page.getByRole("slider", { name: "City local time", exact: true })).toBeInViewport();
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});

test("the phone sky exposes the selected object and returns from the Moon on the same canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.setFixedTime(new Date("2026-11-12T16:00:00Z"));
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.addInitScript(() => localStorage.setItem("eif.sky-city", "Tokyo"));
  await page.goto("/");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  await page.getByRole("button", { name: "After Dark", exact: true }).click();
  const object = page.getByRole("combobox", { name: "Sky object" });
  const moonfall = page.getByRole("button", { name: "Moonfall", exact: true });
  await expect(object).toBeInViewport({ ratio: 1 });
  await object.selectOption("Moon");
  await expect(moonfall).toBeInViewport({ ratio: 1 });
  await object.selectOption("Saturn");
  await expect(moonfall).toBeHidden();
  await object.selectOption("Moon");
  const time = page.getByRole("slider", { name: "City local time" });
  await time.press("End");
  const held = await time.getAttribute("aria-valuetext");
  await expect(moonfall).toBeInViewport({ ratio: 1 });
  const hit = await moonfall.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return button.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
  });
  expect(hit).toBe(true);
  await page.getByRole("button", { name: "View options", exact: true }).click();
  const options = page.getByRole("region", { name: "View options", exact: true });
  await expect(options.getByRole("heading").first()).toHaveText("Local sky controls");
  await expect(options.getByRole("heading", { name: "Globe controls", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(options).toBeHidden();
  await moonfall.click();
  await expect(page.getByRole("group", { name: "Lunar view" })).toBeVisible();
  await page.getByRole("button", { name: "Back to Tonight’s Sky", exact: true }).click();
  await expect(moonfall).toBeFocused();
  await expect(object).toHaveValue("Moon");
  await expect(time).toHaveAttribute("aria-valuetext", held!);
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});

test("Moonfall opens with the rover traverse and playback reachable in landscape", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/");
  await page.getByRole("button", { name: "All stories", exact: true }).click();
  await page.locator("#open-story-moonfall").click();
  const traverse = page.getByRole("combobox", { name: "Rover traverse" });
  const distance = page.getByRole("slider", { name: "Mapped distance" });
  const play = page.getByRole("button", { name: "Play", exact: true });
  await expect(traverse).toBeInViewport({ ratio: 1 });
  expect(
    await traverse.evaluate((node) => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return node.contains(document.elementFromPoint(x + width / 2, y + height / 2));
    }),
  ).toBe(true);
  await traverse.selectOption("1");
  await expect(traverse).toHaveValue("1");
  const caption = page.locator(".moonfall-description");
  const dock = page.getByRole("group", { name: "Rover playback" });
  await expect(caption).toBeInViewport({ ratio: 1 });
  const captionBox = (await caption.boundingBox())!;
  const dockBox = (await dock.boundingBox())!;
  expect(captionBox.y + captionBox.height + 4).toBeLessThanOrEqual(dockBox.y);
  await expect(distance).toBeInViewport({ ratio: 1 });
  await expect(play).toBeInViewport({ ratio: 1 });
  await distance.press("ArrowRight");
  await expect(distance).toHaveValue("1");
  await play.click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeInViewport({ ratio: 1 });
});

test("Explore opens Layers and nearby Fiji reports keep the same world and reading", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const now = Date.now();
  await installFeeds(page, {
    presentation: "fresh",
    empty: true,
    usgs: [
      {
        id: "usfiji01",
        properties: { mag: 5.1, place: "Fiji test report", time: now - 120_000, type: "earthquake" },
        geometry: { coordinates: [-175.96, -18.33, 586] },
      },
    ],
  });
  await page.addInitScript(() => localStorage.setItem("eif.sky-city", "Tokyo"));
  await page.goto("/#v=observe&at=-74,40,1");
  const globe = page.locator("#globe-view");
  const canvas = await globe.locator("canvas").elementHandle();
  const entrances = page.getByRole("group", { name: "Explore by subject" });
  const home = page.getByRole("button", { name: "meanwhile. Earth, ocean & sky, back to the Observatory" });
  const button = (name: string) => page.getByRole("button", { name, exact: true });
  const rail = page.locator("#chrome-rail");
  await button("Explore").click();
  await expect(rail).toBeVisible();
  await expect(button("Storm radar details")).toBeInViewport();
  const viewport = page.viewportSize()!;
  await expect(page.getByRole("tab", { name: "Layers", exact: true })).toBeFocused();
  const fold = rail.locator(".explorer-tabs").getByRole("button", { name: "Hide Layers" });
  await expect(fold).toHaveAttribute("aria-expanded", "true");
  const opened = (await globe.boundingBox())!;
  const dock = page.locator(".explore-world-controls");
  await expect(dock.getByRole("group", { name: "Projection" })).toBeInViewport({ ratio: 1 });
  await expect(fold).toBeInViewport({ ratio: 1 });
  await expect(dock.getByRole("button", { name: "Hide Layers" })).toHaveCount(0);
  const foldBox = (await fold.boundingBox())!;
  await fold.click();
  await expect(rail).toBeHidden();
  const reopen = page.locator(".zones").getByRole("button", { name: "Layers", exact: true });
  await expect(reopen).toHaveAttribute("aria-expanded", "false");
  await expect(reopen).toBeFocused();
  await expect(reopen).toBeInViewport({ ratio: 1 });
  const reopenBox = (await reopen.boundingBox())!;
  if (viewport.width < 768) {
    const projection = (await dock.boundingBox())!;
    const credit = (await page.locator(".creator-credit").boundingBox())!;
    expect(reopenBox.y).toBeGreaterThanOrEqual(projection.y + projection.height);
    expect(reopenBox.y + reopenBox.height).toBeLessThanOrEqual(credit.y);
    await expect.poll(async () => (await globe.boundingBox())?.height ?? 0).toBeGreaterThan(opened.height);
  } else {
    const previousCenter = { x: foldBox.x + foldBox.width / 2, y: foldBox.y + foldBox.height / 2 };
    expect(
      await reopen.evaluate(
        (button, { x, y }) => button.contains(document.elementFromPoint(x, y)),
        previousCenter,
      ),
    ).toBe(true);
  }
  await reopen.press("Enter");
  await expect(page.getByRole("tab", { name: "Layers", exact: true })).toBeFocused();
  const stories = page.getByRole("tab", { name: "Stories", exact: true });
  await stories.click();
  await button("Hide Stories").click();
  const reopenStories = page.locator(".zones").getByRole("button", { name: "Stories", exact: true });
  await expect(reopenStories).toBeFocused();
  await reopenStories.click();
  await expect(stories).toBeFocused();
  await home.click();

  await entrances.getByRole("button", { name: "Below the Surface", exact: true }).click();
  const depth = page.getByRole("region", { name: "Earthquake cutaway" });
  await depth.getByRole("button", { name: "600 km", exact: true }).click();
  await expect(depth.getByText("600 km deep", { exact: true })).toBeVisible();
  await expect(depth.locator("[data-reading-label] > span")).toHaveText("600 km");
  await expect(page.locator("[data-evidence-connector]")).toHaveCount(0);
  await depth.getByText("Quake readings & sources", { exact: true }).click();
  await depth
    .getByRole("group", { name: "Recorded earthquakes" })
    .getByRole("button", { name: /670\.8 km/ })
    .click();
  await depth.getByRole("button", { name: "Map", exact: true }).click();
  const pose = () => new URLSearchParams(new URL(page.url()).hash.slice(1)).get("at");
  await expect.poll(pose).toBe("-176,-18.3,1.95");
  const nearby = button("Explore nearby earthquakes");
  await nearby.click();
  await expect(page.getByRole("heading", { name: "Nearby earthquakes" })).toBeFocused();
  await expect(
    page.getByRole("tabpanel", { name: "Layers" }).getByRole("region", { name: "Map layers" }),
  ).toBeVisible();
  await expect(globe).toHaveAttribute("aria-label", "Map");
  await expect.poll(pose).toBe("-176,-18.3,1.95");
  await expect(page.getByRole("region", { name: "Nearby earthquake reports" })).toContainText(
    "670.8 km deep",
  );
  const report = page.getByRole("button", { name: /Fiji test report/ });
  await report.click();
  const inlineReading = rail.locator(".cutaway-report-detail");
  await expect(inlineReading).toContainText("Fiji test report");
  await expect(inlineReading).toContainText("586");
  await expect(button("Back to cutaway")).toBeInViewport({ ratio: 1 });
  await expect.poll(pose).toBe("-176,-18.3,1.95");
  await button("Back to nearby earthquakes").click();
  await expect(report).toBeFocused();
  await button("All layers").click();
  await expect(button("Earthquakes details")).toBeFocused();
  await expect.poll(pose).toBe("-176,-18.3,1.95");
  await page.goBack();
  await expect(report).toBeVisible();
  await button("Globe").click();
  await expect(globe).toHaveAttribute("aria-label", "Globe");
  await button("Back to cutaway").click();
  await expect(nearby).toBeFocused();
  await expect(depth.getByText("670.8 km deep", { exact: true })).toBeVisible();
  await expect(globe).toHaveAttribute("aria-label", "Map");
  await expect.poll(pose).toBe("-176,-18.3,1.95");
  expect(await page.evaluate(() => localStorage.getItem("eif.flat"))).toBeNull();
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});

test("a pinned phone reading leaves room for its own controls while Layers is folded", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, {
    presentation: "explore",
    usgs: [
      {
        id: "uspinned01",
        properties: { mag: 4.2, place: "Channel Islands, California", time: Date.now() - 120_000 },
        geometry: { coordinates: [-119.75, 34, 20] },
      },
    ],
  });
  await page.addInitScript(() => localStorage.setItem("eif.railOpen", "0"));
  await page.goto("/#v=explore&at=-119,34,1&m=2&w=24&s=usgs&e=usgs:uspinned01");
  const reading = page.getByRole("complementary", { name: "Pinned earthquake" });
  await expect(reading).toBeVisible();
  const reopen = page.locator("#explorer-fold");
  await expect(reopen).toBeHidden();
  const close = reading.getByRole("button", { name: "Close", exact: true });
  await page.getByRole("link", { name: "Skip to controls" }).press("Enter");
  await expect(close).toBeFocused();
  await close.press("Enter");
  await expect(reading).toBeHidden();
  await expect(reopen).toBeInViewport({ ratio: 1 });
  await reopen.click();
  await expect(page.getByRole("tab", { name: "Layers", exact: true })).toBeFocused();
});

test("Find restores a selected story result and the exact map on either Back action", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/#v=explore&at=-74,40,1&p=map");
  await page.getByRole("button", { name: "Find", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Find", exact: true });
  const search = dialog.getByRole("searchbox");
  const story = dialog.getByRole("button", { name: "Kīlauea", exact: true });
  await search.fill("Kilauea");
  for (const back of ["story", "browser"]) {
    await story.click();
    const close = page.getByRole("button", { name: "Back to Find", exact: true });
    await expect(close).toBeVisible();
    if (back === "story") await close.click();
    else await page.goBack();
    await expect(search).toHaveValue("Kilauea");
    await expect(story).toBeFocused();
  }
  await dialog.getByRole("button", { name: "Close Find" }).click();
  await expect(page.locator("#globe-view")).toHaveAttribute("aria-label", "Map");
  await expect.poll(() => new URLSearchParams(new URL(page.url()).hash.slice(1)).get("at")).toBe("-74,40,1");
});

test("Tokyo weather stays on the shared world and returns to the exact local sky", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const now = new Date("2026-11-12T16:00:00Z");
  await page.clock.setFixedTime(now);
  await page.route("**/api/observations/wind", (route) =>
    route.fulfill({
      contentType: "application/x-netcdf",
      body: readFileSync(new URL("./fixtures/weather-wind.nc", import.meta.url)),
    }),
  );
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.addInitScript(() => localStorage.setItem("eif.sky-city", "Tokyo"));
  await page.goto("/#v=observe&at=-74,40,1");
  const globe = page.locator("#globe-view");
  const canvas = await globe.locator("canvas").elementHandle();
  const rail = page.locator("#chrome-rail");
  const button = (name: string) => page.getByRole("button", { name, exact: true });
  const entrances = page.getByRole("group", { name: "Explore by subject" });
  await entrances.getByRole("button", { name: "After Dark", exact: true }).click();
  const scrubber = page.getByRole("slider", { name: "City local time" });
  const facing = page.getByRole("group", { name: "Look around the local sky" });
  await scrubber.press("End");
  await facing.press("ArrowRight");
  const direction = await facing.innerText();
  const minute = await scrubber.getAttribute("aria-valuetext");
  const seeCity = button("See Tokyo on Earth");
  await expect(seeCity).toBeInViewport({ ratio: 1 });
  await seeCity.click();
  await expect(page.getByRole("heading", { name: "Tokyo on Earth" })).toBeVisible();
  await expect(globe).toHaveAttribute("aria-label", "Map");
  const held = page.locator(".sky-held-reading time");
  await expect(held).toHaveText(minute!);
  const heldInstant = await held.getAttribute("datetime");
  const preferences = await page.evaluate(() => localStorage.getItem("eif.mapLayers"));
  const cityLayers = button("Explore live layers here");
  await expect(cityLayers).toBeInViewport({ ratio: 1 });
  await cityLayers.click();
  const weather = rail.getByRole("region", { name: "Live layers near Tokyo" });
  await expect(weather.getByRole("heading")).toBeFocused();
  await expect(weather).toContainText("RainViewer");
  await expect(weather).toContainText("NOAA GFS forecast");
  await expect(weather.locator(".city-weather-rows time")).toHaveAttribute("datetime", now.toISOString());
  await expect(weather.locator(".sky-held-reading time")).toHaveAttribute("datetime", heldInstant!);
  await expect(globe).toHaveAttribute("aria-label", "Map");
  const wind = weather.getByRole("button", { name: "Surface wind", exact: true });
  await expect(wind).toHaveAttribute("aria-pressed", "true");
  await wind.click();
  await expect(wind).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => localStorage.getItem("eif.mapLayers"))).toBe(preferences);
  await button("Globe").click();
  await expect(globe).toHaveAttribute("aria-label", "Globe");
  await weather.getByRole("button", { name: "Back to local sky" }).click();
  await expect(seeCity).toBeFocused();
  await expect(seeCity).toBeInViewport({ ratio: 1 });
  await expect(scrubber).toHaveAttribute("aria-valuetext", minute!);
  await expect(facing).toHaveText(direction, { useInnerText: true });
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});

test("Find opens an exact journey and the folded Stories panel keeps its identity", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh" });
  await page.goto("/");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  const button = (name: string) => page.getByRole("button", { name, exact: true });
  await button("All stories").click();
  await button("Hide Stories").click();
  await button("Stories").click();
  await expect(page.getByRole("tab", { name: "Stories" })).toHaveAttribute("aria-selected", "true");
  await button("Find").click();
  const search = page.getByRole("searchbox", { name: "Search places, stories and layers" });
  await search.fill("Ice in Motion");
  await expect(page.getByRole("region", { name: "Journeys", exact: true })).toContainText("Ice in Motion");
  await search.press("Enter");
  await expect(page.getByRole("region", { name: "Current journey", exact: true })).toContainText(
    "Ice in Motion",
  );
  await button("Back to Find").click();
  await expect(search).toHaveValue("Ice in Motion");
  await expect(
    page
      .getByRole("region", { name: "Journeys", exact: true })
      .getByRole("button", { name: /^Ice in Motion/ }),
  ).toBeFocused();
  await button("Close Find").click();
  await expect(button("Find")).toBeFocused();
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});

test("Honolulu scrubs the shared globe and map and returns to the same Explore view", async ({ page }) => {
  if (!test.info().project.use.isMobile) await page.setViewportSize({ width: 1260, height: 735 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/#v=explore&p=globe&at=-158,19,1.4&layers=earthquakes");
  const stage = page.locator("#globe-view");
  const canvas = await stage.locator("canvas").elementHandle();
  const marker = stage.getByRole("button", { name: "Honolulu Tonga’s shockwave" });
  const rail = page.locator("#chrome-rail");
  const position = () => page.evaluate(() => new URLSearchParams(location.hash.slice(1)).get("at"));
  const story = page.getByRole("region", { name: "Tonga’s shockwave", exact: true });
  const sample = story.getByRole("slider", { name: "Station pressure time" });

  for (const projection of ["Globe", "Map"]) {
    if (projection === "Map") {
      await page.locator("#view-projection").click();
    }
    await expect(stage).toHaveAttribute("aria-label", projection);
    await expect(marker).toBeVisible();
    await rail.evaluate((panel) => panel.scrollTo(0, 90));
    const scroll = await rail.evaluate((panel) => panel.scrollTop);
    if (test.info().project.use.isMobile) expect(scroll).toBeGreaterThan(0);
    const pose = await position();
    const bounds = await marker.boundingBox();
    const switches = rail.locator(".layer-row [aria-pressed]");
    const preferences = await switches.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("aria-pressed")),
    );
    await marker.click();
    await expect(sample).toBeFocused();
    await expect(sample).toHaveValue("539");
    await expect(story.locator(".tonga-explore-value")).toHaveText("1017.75 hPa");
    const plot = (await sample.boundingBox())!;
    await sample.click({ position: { x: plot.width * 0.15, y: plot.height / 2 } });
    await expect(sample).not.toHaveValue("539");
    const minute = await sample.inputValue();
    await expect(page).toHaveURL(/story=tonga/);
    await story.getByRole("button", { name: projection === "Map" ? "Globe" : "Map", exact: true }).click();
    await expect(sample).toHaveValue(minute);
    await sample.press("ArrowRight");
    await expect(sample).toHaveValue(String(Number(minute) + 1));
    await story.getByRole("button", { name: "Back to Explore" }).click();
    await expect(stage).toHaveAttribute("aria-label", projection);
    await expect.poll(position).toBe(pose);
    await expect.poll(() => rail.evaluate((panel) => panel.scrollTop)).toBe(scroll);
    await expect(marker).toBeVisible();
    await expect(marker).toBeFocused();
    const restored = (await marker.boundingBox())!;
    expect(Math.abs(restored.x - bounds!.x)).toBeLessThan(1);
    expect(Math.abs(restored.y - bounds!.y)).toBeLessThan(1);
    expect(
      await switches.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-pressed"))),
    ).toEqual(preferences);
    expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(
      true,
    );
  }
  await page.getByRole("button", { name: "Hide Layers", exact: true }).click();
  await expect(rail).toBeHidden();
  await marker.click();
  await story.getByRole("button", { name: "Back to Explore" }).click();
  await expect(rail).toBeHidden();
  await expect(marker).toBeFocused();
});

test("Float Dive drags a measured depth across projections and returns to the Explore marker", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/#v=explore&p=map&at=-53.4,56.7,1.2&layers=earthquakes");
  const world = page.locator("#globe-view");
  const canvas = await world.locator("canvas").elementHandle();
  const marker = world.getByRole("button", { name: "Float Dive Labrador Sea · Argo" });
  const rail = page.locator("#chrome-rail");
  const position = () => page.evaluate(() => new URLSearchParams(location.hash.slice(1)).get("at"));
  await expect(marker).toBeVisible();
  await rail.evaluate((node) => {
    node.scrollTop = 90;
  });
  const scroll = await rail.evaluate((node) => node.scrollTop);
  const pose = await position();
  const toggles = rail.locator(".layer-row [aria-pressed]");
  const readLayers = () =>
    toggles.evaluateAll((items) => items.map((item) => item.getAttribute("aria-pressed")));
  const layers = await readLayers();
  const origin = (await marker.boundingBox())!;
  await marker.click();
  const float = page.getByRole("slider", { name: "Float depth" });
  const projection = page.getByRole("group", { name: "Float projection" });
  await expect(projection.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  await expect(float).toHaveAttribute("aria-valuenow", "611");
  await expect(page.getByRole("img", { name: /Measured temperature by estimated depth/ })).toBeVisible();
  const cursor = page.locator(".float-world-chart-sample");
  const firstPoint = await cursor.getAttribute("style");
  const box = (await float.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 44, { steps: 8 });
  await page.mouse.up();
  const read = async () => Number(await float.getAttribute("aria-valuenow"));
  await expect.poll(read).toBeGreaterThan(750);
  await expect(cursor).not.toHaveAttribute("style", firstPoint!);
  const depth = await read();
  const value = await float.getAttribute("aria-valuetext");
  await expect(page.locator("[data-float-depth]")).toHaveText(`${depth.toLocaleString("en-US")} m`);
  await projection.getByRole("button", { name: "Globe" }).click();
  await expect(float).toHaveAttribute("aria-valuetext", value!);
  await float.press("ArrowUp");
  await expect.poll(read).toBeLessThan(depth);
  await page.getByRole("button", { name: "Back to Explore" }).click();
  await expect(world).toHaveAttribute("aria-label", "Map");
  await expect.poll(position).toBe(pose);
  await expect.poll(() => rail.evaluate((node) => node.scrollTop)).toBe(scroll);
  await expect(marker).toBeFocused();
  expect(await readLayers()).toEqual(layers);
  const restored = (await marker.boundingBox())!;
  expect(Math.hypot(origin.x - restored.x, origin.y - restored.y)).toBeLessThan(1);
  expect(await canvas!.evaluate((element) => element === document.querySelector("#globe-view canvas"))).toBe(
    true,
  );
});
