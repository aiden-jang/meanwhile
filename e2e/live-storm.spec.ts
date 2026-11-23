import { expect, test } from "@playwright/test";
import { installFeeds, openLayer } from "./feeds";

const transparent = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==",
  "base64",
);
const opaque = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGOQW///PwAFhwLMAV5hdQAAAABJRU5ErkJggg==",
  "base64",
);

for (const { width, height, covered } of [
  { width: 1440, height: 900, covered: true },
  { width: 320, height: 568, covered: false },
]) {
  test(`live cyclone keeps reported track and radar independent at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installFeeds(page, { presentation: "explore" });
    const now = Math.floor(Date.now() / 600_000) * 600_000;
    const scans = [now - 1200_000, now - 600_000, now];
    await page.route("**/gdacsapi/api/events/getepisodedata?**", (route) =>
      route.fulfill({
        json: {
          properties: {
            impacts: [
              {
                source: "JTWC",
                resource: { timeline: "https://www.gdacs.org/gdacsapi/api/export/gettimeline?id=9001" },
              },
            ],
          },
        },
      }),
    );
    await page.route("**/gdacsapi/api/export/gettimeline?**", (route) =>
      route.fulfill({
        json: {
          channel: {
            item: [
              {
                actual: "True",
                longitude: "132",
                latitude: "14",
                advisory_datetime: "15 Nov 2026 06:00",
                wind_speed: "20",
                pressure: "0",
              },
              {
                actual: "True",
                longitude: "128",
                latitude: "11",
                advisory_datetime: "14 Nov 2026 06:00",
                wind_speed: "15",
                pressure: "998",
              },
              {
                actual: "False",
                longitude: "135",
                latitude: "15",
                advisory_datetime: "16 Nov 2026 06:00",
                wind_speed: "22",
                pressure: "990",
              },
            ],
          },
        },
      }),
    );
    await page.route("**/public/weather-maps.json", (route) =>
      route.fulfill({
        json: {
          host: "https://tilecache.rainviewer.com",
          radar: {
            past: scans.map((at, i) => ({ time: at / 1000, path: `/v2/radar/frame${i}` })),
          },
        },
      }),
    );
    await page.route("https://tilecache.rainviewer.com/**", (route) =>
      route.fulfill({
        contentType: "image/png",
        body: !covered && route.request().url().includes("coverage") ? opaque : transparent,
      }),
    );
    await page.goto("/#v=explore&at=130,13,1.4");
    const canvas = await page.locator("#globe-view canvas").elementHandle();
    if (!covered) await page.getByRole("button", { name: "Map", exact: true }).click();
    await openLayer(page, "Tropical cyclones");
    const report = page.getByRole("button", { name: /^FIXTURE/ });
    await expect(report).toBeVisible();
    await report.focus();
    const pose = () => new URLSearchParams(new URL(page.url()).hash.slice(1)).get("at");
    const before = pose();
    await report.click();
    const track = page.getByRole("group", { name: "Reported track" });
    await expect(page.getByRole("heading", { name: "FIXTURE", exact: true })).toBeFocused();
    await expect(track).toContainText("2 of 2");
    await expect(track).toContainText("72 km/h");
    await expect(track).toContainText("Not reported");
    const position = track.getByRole("slider", { name: "Storm track position" });
    const radar = page.getByLabel("Storm radar playback", { exact: true });
    if (covered) {
      await expect(position).toHaveValue("1");
      await position.press("Home");
      await radar.getByRole("button", { name: "Replay nearby radar" }).click();
      await expect(radar.getByRole("slider", { name: "Radar scan time" })).toBeVisible();
      const time = radar.getByRole("slider", { name: "Radar scan time" });
      await expect(radar.locator("[data-radar-displayed]")).toBeVisible();
      await time.press("Home");
      await expect(radar.locator("[data-radar-displayed]")).toHaveAttribute(
        "datetime",
        new Date(scans[0]!).toISOString(),
      );
      await expect(position).toBeHidden();
      await expect(time).toHaveValue("0");
      await radar.getByRole("button", { name: "Play", exact: true }).click();
      await expect(radar.locator("[data-radar-displayed]")).toHaveAttribute(
        "datetime",
        new Date(now).toISOString(),
      );
    } else {
      await expect(radar.getByText("No radar coverage here.", { exact: true })).toBeVisible();
      await expect(radar.getByRole("slider")).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Radar by RainViewer", exact: true })).toHaveCount(0);
      await radar.getByText("No radar coverage here.", { exact: true }).scrollIntoViewIfNeeded();
      await track.getByRole("button", { name: "Previous reported position" }).click();
    }
    const handoff = page.getByRole("button", { name: /Watch Katrina’s landfall/ });
    const time = radar.getByRole("slider", { name: "Radar scan time" });
    if (covered) {
      await time.press("Home");
      await expect(time).toHaveValue("0");
    }
    await handoff.scrollIntoViewIfNeeded();
    const returnScroll = await page.locator("#chrome-rail").evaluate((el) => el.scrollTop);
    await expect.poll(pose).not.toBe(before);
    const stormPose = pose();
    if (covered) await page.emulateMedia({ reducedMotion: "no-preference" });
    await handoff.click();
    const katrina = page.getByRole("region", { name: "Eye of the Storm" });
    await expect(katrina.getByText("Recorded · August 2005", { exact: true })).toBeVisible();
    const playback = katrina.getByRole("group", { name: "Eye of the Storm playback" });
    if (covered) {
      await expect(katrina.getByText("Approaching the Gulf of Mexico…")).toBeVisible();
      await expect(playback).toBeHidden();
    }
    await expect(playback.getByRole("button", { name: "Play", exact: true })).toBeVisible();
    await playback.getByRole("button", { name: "Landfall", exact: true }).click();
    await expect(katrina).toContainText("920 hPa");
    if (covered) await page.emulateMedia({ reducedMotion: "reduce" });
    await katrina
      .getByRole("button", { name: covered ? "Back to storm radar" : "Back to live storm" })
      .click();
    await expect(handoff).toBeFocused();
    await expect.poll(pose).toBe(stormPose);
    await expect.poll(() => page.locator("#chrome-rail").evaluate((el) => el.scrollTop)).toBe(returnScroll);
    if (covered) {
      await expect(time).toHaveValue("0");
      await expect(radar.getByRole("button", { name: "Play", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Back to live storm", exact: true }).click();
    }
    await expect(track).toContainText("998 hPa");
    await expect(track.locator("time")).toHaveAttribute("datetime", "2026-11-14T06:00:00.000Z");
    await page.getByRole("button", { name: covered ? "Map" : "Globe", exact: true }).click();
    await expect(track).toContainText("998 hPa");
    if (process.env["EIF_CAPTURE_UI"]) {
      await page.screenshot({ path: test.info().outputPath(`follow-storm-${width}.png`) });
    }
    if (covered) await page.getByRole("button", { name: "Back to previous view" }).click();
    else await page.evaluate(() => history.back());
    await expect(report).toBeFocused();
    await expect.poll(pose).toBe(before);
    await expect(page.getByRole("region", { name: covered ? "Globe" : "Map", exact: true })).toBeVisible();
    expect(
      await canvas!.evaluate((element) => element === document.querySelector("#globe-view canvas")),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}

test("quiet cyclone reports offer both storm radar and Katrina on the shared globe", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "explore" });
  await page.route(/gdacsapi\/api\/events\/geteventlist/, (route) =>
    new URL(route.request().url()).searchParams.get("eventlist") === "TC"
      ? route.fulfill({ json: { type: "FeatureCollection", features: [] } })
      : route.fallback(),
  );
  await page.route("**/public/weather-maps.json", (route) =>
    route.fulfill({ json: { host: "https://tilecache.rainviewer.com", radar: { past: [] } } }),
  );
  await page.goto("/#v=explore&at=-98,30,1.1");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  await openLayer(page, "Tropical cyclones");
  const reports = page.getByRole("region", { name: "Tropical cyclones reports" });
  await expect(reports.getByText("No active cyclones reported in this window.")).toBeVisible();
  const open = reports.getByRole("button", { name: /Open storm radar/ });
  await open.click();
  const radar = page.getByRole("region", { name: "Storm Radar" });
  await radar.getByRole("button", { name: "Back to tropical cyclones" }).click();
  await expect(open).toBeFocused();
  const archive = reports.getByRole("button", { name: /Watch Katrina’s landfall/ });
  await archive.click();
  const katrina = page.getByRole("region", { name: "Eye of the Storm" });
  await expect(katrina.getByText("Recorded · August 2005", { exact: true })).toBeVisible();
  await katrina.getByRole("button", { name: "Back to tropical cyclones" }).click();
  await expect(archive).toBeFocused();
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});
