import { expect, test, type Page } from "@playwright/test";
import { installFeeds, openStories, startJourney, selectScene } from "./feeds";
import { installOrbit } from "./fixtures/orbit";

async function tides(page: Page) {
  await page.route("https://api.tidesandcurrents.noaa.gov/**", (route) => {
    const key = route.request().url().includes("product=predictions") ? "predictions" : "data";
    return route.fulfill({
      json: {
        [key]: Array.from({ length: 7 }, (_, i) => ({
          t: `2026-11-09 12:${String(i * 6).padStart(2, "0")}`,
          v: String(0.2 + i / 10),
        })),
      },
    });
  });
}

for (const [id, titles] of [
  ["above-earth", ["Tonight’s Sky", "Moonfall", "Orbital Pass"]],
  ["water-in-motion", ["Atmospheric River", "Rainbelt", "River Pulse"]],
] as const) {
  test(`${id} keeps one canvas across its guided views and finishes in free exploration`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    if (id === "above-earth") await installOrbit(page);
    await installFeeds(page, { presentation: "fresh", empty: true });
    await tides(page);
    await page.route("**/api/observations/river", (route) => route.abort());
    const satellite = Promise.withResolvers<void>();
    if (id === "water-in-motion")
      await page.route("https://gibs.earthdata.nasa.gov/wms/**", async (route) => {
        await satellite.promise;
        await route.fulfill({ path: "src/assets/story-previews/rain.webp", contentType: "image/webp" });
      });
    await page.goto("/");
    const canvas = await page.locator("#globe-view canvas").elementHandle();
    await openStories(page, "all");
    await startJourney(page, id);
    const journey = page.getByRole("region", { name: "Current journey", exact: true });
    await expect(journey).toContainText("1 of 3");
    await expect(page.getByRole("heading", { name: titles[0], exact: true })).toBeVisible();
    const skyTime = page.getByRole("slider", { name: "City local time", exact: true });
    if (id === "above-earth") await skyTime.press("End");
    const savedTime = id === "above-earth" ? await skyTime.inputValue() : null;
    const forecastTime = page.getByRole("slider", { name: "Forecast valid time", exact: true });
    const rainTime = page.getByRole("slider", { name: "Satellite estimate time", exact: true });
    if (id === "water-in-motion") {
      await page
        .getByRole("combobox", { name: "Forecast", exact: true })
        .selectOption({ label: "9 November 2026 archive" });
      await forecastTime.press("Home");
      await forecastTime.press("ArrowRight");
      await page.getByRole("button", { name: "Focus the Pacific coast", exact: true }).click();
      await page.getByRole("button", { name: "Map", exact: true }).click();
    }
    const toSecond = id === "water-in-motion" ? "Open Rainbelt" : `Next: ${titles[1]}`;
    const toThird = id === "water-in-motion" ? "Go to the Hudson" : `Next: ${titles[2]}`;
    const heldForecast = id === "water-in-motion" ? await forecastTime.getAttribute("aria-valuetext") : null;
    await journey.getByRole("button", { name: toSecond, exact: true }).click();
    await expect(journey).toContainText("2 of 3");
    await expect(page.getByRole("heading", { name: titles[1], exact: true })).toBeVisible();
    if (id === "water-in-motion") {
      await expect(page.getByRole("group", { name: "Rainbelt on the map" })).toBeVisible();
      await expect(journey.getByRole("button", { name: "Satellite", exact: true })).toHaveAttribute(
        "aria-current",
        "step",
      );
      const record = page.getByRole("region", { name: "Source and time", exact: true });
      await expect(record).toContainText("On screen while Rainbelt loads");
      await expect(record).toContainText(heldForecast!);
      satellite.resolve();
      await expect(record).toContainText("Previous view");
      await expect(record.locator("time")).toHaveCount(2);
      await rainTime.press("ArrowLeft");
    }
    const heldRain = id === "water-in-motion" ? await rainTime.getAttribute("aria-valuetext") : null;
    await journey.getByRole("button", { name: "Previous view", exact: true }).click();
    await expect(journey).toContainText("1 of 3");
    if (savedTime !== null) await expect(skyTime).toHaveValue(savedTime);
    if (heldForecast) {
      await expect(forecastTime).toHaveAttribute("aria-valuetext", heldForecast);
      await expect(page.getByRole("group", { name: "Atmospheric River on the map" })).toBeVisible();
    }
    await journey.getByRole("button", { name: toSecond, exact: true }).click();
    if (heldRain) await expect(rainTime).toHaveAttribute("aria-valuetext", heldRain);
    if (id === "water-in-motion")
      await expect(journey.getByRole("button", { name: toThird, exact: true })).toBeInViewport({ ratio: 1 });
    await journey.getByRole("button", { name: toThird, exact: true }).click();
    await expect(journey).toContainText("3 of 3");
    expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(
      true,
    );
    if (id === "water-in-motion")
      await journey.getByRole("button", { name: "See the finding", exact: true }).click();
    await page.getByRole("button", { name: "Finish journey", exact: true }).click();
    await expect(journey).toHaveCount(0);
    await expect(page.locator(".related-stories summary")).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}

test("Reading the coast keeps its comparison, model time and harbor on a short phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await tides(page);
  await page.goto("/");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  await openStories(page, "all");
  await startJourney(page, "reading-the-coast");
  const journey = page.getByRole("region", { name: "Current journey" });
  const projection = page.getByRole("group", { name: "Observation projection" });
  const previous = journey.getByRole("button", { name: "Previous view", exact: true });
  const toWave = journey.getByRole("button", { name: "Open the Chile record", exact: true });
  await expect(toWave).toBeInViewport({ ratio: 1 });
  await projection.getByRole("button", { name: "Map", exact: true }).click();
  const divide = page.getByRole("slider", { name: "Shoreline divider", exact: true });
  await divide.press("Home");
  await divide.press("ArrowRight");
  await page.getByRole("button", { name: "Keep this comparison", exact: true }).click();
  await toWave.click();

  const wave = page.getByRole("region", { name: "Tsunami Arrival", exact: true });
  const model = wave.getByRole("slider", { name: "Replay time", exact: true });
  await expect(wave.getByRole("group", { name: "Tsunami Arrival on the map" })).toBeVisible();
  const waveChart = wave.locator(".observation-chart svg");
  await waveChart.scrollIntoViewIfNeeded();
  const trace = (await waveChart.boundingBox())!;
  await waveChart.click({ position: { x: trace.width / 2, y: trace.height / 2 } });
  await expect(model).toHaveValue("12");
  const buoy = wave.getByRole("combobox", { name: "Measurement buoy" });
  await buoy.selectOption("46407");
  await expect(model).toHaveValue("12");
  await expect(wave.getByText("0.002 m", { exact: true })).toBeVisible();
  for (let index = 0; index < 4; index++) await model.press("ArrowRight");
  await expect(wave.getByText("Modeled front reached this buoy · 16 h")).toBeVisible();
  await expect(wave.locator(".coast-buoy-arrival [data-arrival]")).toHaveCount(1);
  const toHarbor = journey.getByRole("button", { name: "Go to San Francisco", exact: true });
  await expect(toHarbor).toBeInViewport({ ratio: 1 });
  await toHarbor.click();

  const tide = page.getByRole("region", { name: "Tide Watch", exact: true });
  const harbor = tide.getByRole("combobox", { name: "Harbor" });
  await expect(harbor).toHaveValue("9414290");
  await harbor.selectOption("9447130");
  const observation = tide.getByRole("slider", { name: "Observation time", exact: true });
  const tideChart = tide.locator(".observation-chart svg");
  await tideChart.scrollIntoViewIfNeeded();
  const sample = await tideChart.evaluate((svg) => {
    const point = new DOMPoint(44, 33).matrixTransform((svg as SVGSVGElement).getScreenCTM()!);
    return { x: point.x, y: point.y };
  });
  await page.mouse.click(sample.x, sample.y);
  await expect(observation).toHaveAttribute("aria-valuetext", /12:06 UTC/);
  const finding = journey.getByRole("button", { name: "See the finding", exact: true });
  await expect(finding).toBeInViewport({ ratio: 1 });
  await finding.click();
  const recap = tide.getByRole("region", { name: "Reading the coast finding" });
  await expect(recap).toContainText("Kept comparison · 1%");
  await expect(recap).toContainText("DART 46407");
  await expect(recap).toContainText("Seattle");
  await expect(recap).toContainText("12:06 UTC");

  await previous.click();
  await expect(buoy).toHaveValue("46407");
  await expect(model).toHaveValue("16");
  await expect(projection.getByRole("button", { name: "Map", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await previous.click();
  await expect(divide).toHaveValue("1");
  await expect(page.getByRole("button", { name: "Comparison kept" })).toBeVisible();
  await expect(projection.getByRole("button", { name: "Map", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await toWave.click();
  await journey.getByRole("button", { name: "Return to harbor", exact: true }).click();
  await expect(harbor).toHaveValue("9447130");
  await expect(observation).toHaveAttribute("aria-valuetext", /12:06 UTC/);
  await finding.click();
  await recap.getByRole("button", { name: "Finish journey", exact: true }).click();
  await expect(journey).toHaveCount(0);
  await expect(tide.locator(".related-stories summary")).toBeFocused();
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("Reading the coast restores a manually framed globe after viewing the wave on the map @dev", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/#v=observe&story=kilauea&journey=reading-the-coast&stop=0");

  const camera = () =>
    page.evaluate(() => {
      const globe = (
        window as unknown as {
          __globe?: { state: () => { lon: number; lat: number; zoom: number }; morph: () => number };
        }
      ).__globe;
      return globe && { ...globe.state(), projection: globe.morph() };
    });
  const divide = page.getByRole("slider", { name: "Shoreline divider", exact: true });
  await expect(divide).toBeVisible();
  await expect.poll(async () => (await camera())?.zoom).toBeCloseTo(2.4);
  const start = await camera();
  const world = page.locator("#globe-view");
  await world.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("+");
  await expect.poll(camera).not.toEqual(start);
  const framed = await camera();

  const journey = page.getByRole("region", { name: "Current journey" });
  await journey.getByRole("button", { name: "Open the Chile record", exact: true }).click();
  const wave = page.getByRole("region", { name: "Tsunami Arrival", exact: true });
  await expect(wave.getByRole("slider", { name: "Replay time", exact: true })).toBeVisible();
  await wave.getByRole("button", { name: "Map", exact: true }).click();
  await expect.poll(async () => (await camera())?.projection).toBe(1);
  await journey.getByRole("button", { name: "Previous view", exact: true }).click();
  await expect(divide).toBeVisible();
  await expect.poll(camera).toEqual(framed);
});

test("related stories cross scenes and return to their previous story", async ({ page }) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#v=observe&story=katrina");
  await page.getByText("Keep exploring", { exact: true }).click();
  await page.getByRole("button", { name: /^Lights Return/ }).click();
  await expect(page.getByRole("heading", { name: "Lights Return", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to Eye of the Storm", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Eye of the Storm", exact: true })).toBeVisible();
});

for (const view of ["Meteor Nights", "Moonfall"] as const) {
  test(`Tonight’s Sky opens again after its internal ${view} view`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.setFixedTime(new Date("2026-11-06T18:00:00Z"));
    await installFeeds(page, { presentation: "fresh", empty: true });
    await page.goto("/");
    await selectScene(page, "After Dark");
    await openStories(page, "search");
    await page.getByRole("searchbox", { name: "Find a story" }).fill("Tonight’s Sky");
    await page.locator("#search-story-sky").click();
    const canvas = await page.locator("#globe-view canvas").elementHandle();
    const city = page.getByRole("combobox", { name: "City", exact: true });
    await city.selectOption({ label: "Seoul" });
    const time = page.getByRole("slider", { name: "City local time", exact: true });
    await time.press("End");
    const savedTime = await time.inputValue();
    const openView = page
      .getByRole("region", { name: "Tonight’s Sky", exact: true })
      .getByRole(
        "button",
        view === "Moonfall" ? { name: /Moonfall · Taurus–Littrow$/ } : { name: view, exact: true },
      );
    await expect(openView).toBeVisible();
    await openView.click();
    await expect(page.getByRole("heading", { name: view, exact: true })).toBeVisible();
    await page.getByText("Keep exploring", { exact: true }).click();
    await expect(page.locator(".related-stories button strong")).not.toHaveText("Tonight’s Sky");
    await page.locator(".related-stories button").click();
    await page.getByRole("button", { name: `Back to ${view}`, exact: true }).click();
    if (view === "Meteor Nights") await page.getByRole("button", { name: "Sky view", exact: true }).click();
    else await page.getByRole("button", { name: "Back to Tonight’s Sky", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Tonight’s Sky", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sky view", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(city).toHaveValue("Seoul");
    await expect(time).toHaveValue(savedTime);
    await expect(page.getByRole("button", { name: "Back to stories", exact: true })).toBeVisible();
    expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(
      true,
    );
  });
}

test("measurement sound requires a gesture, follows readings and closes when the view leaves", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { created: 0, closed: 0, pitches: [] as number[] };
    Object.assign(window, { measurementAudio: state });
    class Context {
      state = "running";
      destination = {};
      get currentTime() {
        return performance.now() / 1000;
      }
      constructor() {
        state.created++;
      }
      async resume() {}
      async close() {
        state.closed++;
      }
      createGain() {
        return {
          gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {},
          disconnect() {},
        };
      }
      createOscillator() {
        const node = {
          type: "",
          frequency: { value: 0 },
          onended: null,
          connect(gain: unknown) {
            return gain;
          },
          disconnect() {},
          start() {
            state.pitches.push(node.frequency.value);
          },
          stop() {},
        };
        return node;
      }
    }
    Object.assign(window, { AudioContext: Context });
  });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await tides(page);
  await page.goto("/#v=observe&story=tide");
  const listen = page.getByRole("button", { name: "Listen to water level", exact: true });
  await expect(listen).toBeVisible();
  const audio = () =>
    page.evaluate(
      () =>
        (window as unknown as { measurementAudio: { created: number; closed: number; pitches: number[] } })
          .measurementAudio,
    );
  expect((await audio()).created).toBe(0);
  const time = page.getByRole("slider", { name: "Observation time", exact: true });
  await time.press("Home");
  await listen.click();
  await expect(page.getByRole("button", { name: "Mute water level", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect.poll(async () => (await audio()).pitches.length).toBe(1);
  await page.waitForTimeout(250);
  await time.press("End");
  await expect.poll(async () => (await audio()).pitches.length).toBe(2);
  const pitches = (await audio()).pitches;
  expect(pitches[1]).toBeGreaterThan(pitches[0]!);
  await page.getByRole("button", { name: "Back to stories", exact: true }).click();
  await expect.poll(async () => (await audio()).closed).toBe(1);
  await openStories(page);
  await page.getByRole("button", { name: "Tide Watch", exact: true }).click();
  await expect(listen).toHaveAttribute("aria-pressed", "false");
  expect((await audio()).created).toBe(1);
});

test("long observation times stay clear of playback and onward links remain reachable on a narrow phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.route("https://gibs.earthdata.nasa.gov/**", (route) => route.abort());
  await page.goto("/#v=observe&story=rain");
  const transport = page.locator(".observation-transport");
  const play = transport.getByRole("button", { name: "Replay", exact: true });
  await expect(play).toBeVisible();
  const clear = await transport.evaluate((element) => {
    const copy = element.querySelector("span")!;
    const range = document.createRange();
    range.selectNodeContents(copy);
    const button = element.querySelector("button")!.getBoundingClientRect();
    return [...range.getClientRects()].every(
      (rect) => rect.bottom <= button.top || rect.top >= button.bottom || rect.right <= button.left - 6,
    );
  });
  expect(clear).toBe(true);
  await page.getByText("Keep exploring", { exact: true }).click();
  await expect(page.locator(".related-stories button")).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("heading", { name: "Rainbelt", exact: true })).toBeAttached();
});
