import { expect, test, type Page } from "@playwright/test";
import { installFeeds, openStories, revealStoryTools, selectScene } from "./feeds";
import { installOrbit } from "./fixtures/orbit";

async function installSun(page: Page, windAvailable = true, xrayAge = 1, now?: number) {
  await installFeeds(page, { presentation: "fresh", empty: true, ...(now ? { now, auroraAt: now } : {}) });
  const requests = { wind: 0, xray: 0 };
  await page.route("**/json/rtsw/rtsw_wind_1m.json", (route) => {
    requests.wind++;
    if (!windAvailable) return route.fulfill({ status: 503, body: "" });
    const time_tag = new Date((now ?? Date.now()) - 2 * 60_000).toISOString().slice(0, -1);
    return route.fulfill({
      json: [
        { time_tag, active: true, source: "SOLAR1", proton_speed: 412, proton_density: 5.2 },
        {
          time_tag: new Date(Date.parse(time_tag + "Z") - 60_000).toISOString(),
          active: true,
          source: "SOLAR1",
          proton_speed: 388,
          proton_density: 4.9,
        },
        { time_tag, active: false, source: "ACE", proton_speed: 550, proton_density: 3.8 },
      ],
    });
  });
  await page.route("**/json/goes/primary/xrays-6-hour.json", (route) => {
    requests.xray++;
    return route.fulfill({
      json: [
        {
          time_tag: new Date((now ?? Date.now()) - xrayAge * 60_000).toISOString(),
          satellite: 18,
          energy: "0.1-0.8nm",
          flux: 1.23e-6,
        },
      ],
    });
  });
  return requests;
}

test("Sun Watch loads on demand and flies back to Earth inside After Dark", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requests = await installSun(page);
  await page.goto("/");
  await selectScene(page, "After Dark");
  await openStories(page);
  await revealStoryTools(page);
  await expect(page.locator("#open-aurora-overflight")).toBeEnabled();
  expect(requests).toEqual({ wind: 0, xray: 0 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Sun Watch", exact: true }).click();
  const stage = page.getByRole("region", { name: "Sun Watch readings" });
  await expect(page.getByRole("heading", { name: "Sun Watch", exact: true })).toBeVisible();
  await expect(stage.getByText("Earth · After Dark")).toBeVisible();
  await stage.getByRole("button", { name: "Start solar flight" }).click();
  await expect(stage.getByText("NASA SDO archive · 10 Sep 2025")).toBeVisible();
  await expect(stage.getByText("412", { exact: true })).toBeVisible();
  await expect(stage.getByText("1.23e-6", { exact: true })).toBeVisible();
  await expect(stage.getByText("Solar wind · schematic view")).toBeVisible();
  await expect(stage.getByRole("button", { name: "Replay", exact: true })).toBeVisible();
  await expect(stage.getByText("Earth · After Dark")).toBeVisible();
  expect(requests).toEqual({ wind: 1, xray: 1 });
  await revealStoryTools(page);
  await page.locator("#open-aurora-overflight").click();
  await expect(stage).toBeHidden();
  await expect(page.getByRole("group", { name: "Globe readout" })).toContainText("30% model chance");
});

test("Follow the aurora restores the ISS, oval, solar readings and compass with one canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const now = Date.parse("2026-11-06T16:00:00Z");
  await installOrbit(page);
  await installSun(page, true, 1, now);
  await page.goto("/#v=observe&story=orbit&journey=above-earth&stop=2&city=Tokyo");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  const journey = page.getByRole("region", { name: "Current journey", exact: true });
  const pass = page.getByRole("region", { name: "Orbital Pass", exact: true });
  await journey.getByRole("button", { name: "Watch the pass", exact: true }).click();
  await pass.getByRole("button", { name: /Peak altitude/ }).click();
  const passTime = pass.getByRole("slider", { name: "Predicted pass time" });
  const time = await passTime.getAttribute("aria-valuetext");
  expect(time).toMatch(/JST|GMT\+9/);
  await journey.getByRole("button", { name: "See the finding", exact: true }).click();
  const handoff = pass.getByRole("button", { name: "Explore the aurora", exact: true });
  await handoff.click();

  await expect(journey).toContainText("Follow the aurora");
  const next = journey.getByRole("button", { name: "Read the solar wind", exact: true });
  await expect(next).toBeInViewport({ ratio: 1 });
  const forecast = page.locator(".aurora-journey-reading time");
  await expect(forecast).toHaveAttribute("datetime", new Date(now).toISOString());
  const ovalMap = page.getByRole("group", { name: "Aurora projection" }).getByRole("button", { name: "Map" });
  await ovalMap.click();
  await next.click();

  const solar = page.getByRole("region", { name: "Sun Watch readings" });
  const wind = solar.getByRole("slider", { name: "Wind sample" });
  await wind.press("Home");
  const heldWind = await wind.getAttribute("aria-valuetext");
  expect(heldWind).toContain("388");
  await expect(solar.locator(".aurora-held-time time")).toHaveAttribute(
    "datetime",
    new Date(now).toISOString(),
  );
  const xray = solar.getByRole("button", { name: "GOES X-rays", exact: true });
  await xray.click();
  await expect(
    solar.getByRole("region", { name: "GOES X-ray measurements" }).locator("time"),
  ).toHaveAttribute("datetime", new Date(now - 60_000).toISOString());

  const nextNorth = journey.getByRole("button", { name: "Follow magnetic north", exact: true });
  await expect(nextNorth).toBeInViewport({ ratio: 1 });
  await nextNorth.click();
  const north = page.getByRole("region", { name: "Wandering North", exact: true });
  await expect(north.getByRole("combobox", { name: "City" })).toHaveValue("Tokyo");
  const year = north.getByRole("button", { name: "1970", exact: true });
  await year.click();
  const compass = north.locator(".story-compass figcaption");
  const angle = await compass.innerText();
  await expect(compass).toContainText("Tokyo magnetic declination");
  const previous = journey.getByRole("button", { name: "Previous view", exact: true });
  await previous.click();
  await expect(xray).toHaveAttribute("aria-pressed", "true");
  await solar.getByRole("button", { name: "Solar wind", exact: true }).click();
  await expect(wind).toHaveAttribute("aria-valuetext", heldWind!);
  await nextNorth.click();
  await expect(year).toHaveAttribute("aria-pressed", "true");
  await expect(compass).toHaveText(angle, { useInnerText: true });
  await previous.click();
  await previous.click();
  await expect(ovalMap).toHaveAttribute("aria-pressed", "true");
  await expect(forecast).toHaveAttribute("datetime", new Date(now).toISOString());
  await journey.getByRole("button", { name: "ISS finding", exact: true }).click();
  await expect(journey).toContainText("One night above Earth");
  await expect(passTime).toHaveAttribute("aria-valuetext", time!);
  await expect(handoff).toBeVisible();
  await expect(pass.getByRole("group", { name: "Orbital Pass on the horizon" })).toBeVisible();
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});

test("reduced motion keeps the measurements and aurora available during a solar-wind outage", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installSun(page, false, 20);
  await page.goto("/");
  await selectScene(page, "After Dark");
  await openStories(page);
  const credit = page.getByRole("link", { name: "aiden jang", exact: true });
  await expect(credit).toBeInViewport({ ratio: 1 });
  const creditPosition = await credit.boundingBox();
  await page.getByRole("button", { name: "Sun Watch", exact: true }).click();
  const stage = page.getByRole("region", { name: "Sun Watch readings" });
  await expect(stage.getByText("Earth · After Dark")).toBeVisible();
  await expect(stage.getByText("NOAA feed unavailable")).toBeVisible();
  await expect(stage.getByText(/Latest reading is .* old/)).toBeVisible();
  await expect(stage.getByText("1.23e-6", { exact: true })).toBeVisible();
  expect(await credit.boundingBox()).toEqual(creditPosition);
  await expect(stage.getByRole("button", { name: "Pause", exact: true })).toHaveCount(0);
  await stage.getByRole("button", { name: "Sun", exact: true }).click();
  await expect(stage.getByText("NASA SDO archive · 10 Sep 2025")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  await page.getByRole("button", { name: "Back to stories", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sun Watch", exact: true })).toBeFocused();
  await revealStoryTools(page);
  await expect(page.locator("#open-aurora-overflight")).toBeEnabled();
});

test("Sun Watch holds the aurora edition and projection while a wind sample is inspected", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installSun(page);
  await page.goto("/");
  await selectScene(page, "After Dark");
  await revealStoryTools(page);
  await page.locator("#open-aurora-overflight").click();
  const world = page.getByRole("group", { name: "Globe readout" });
  const forecast = await world.locator("time").getAttribute("datetime");
  const canvas = page.locator("#globe-view canvas");
  const original = await canvas.elementHandle();
  await page.getByRole("group", { name: "Aurora projection" }).getByRole("button", { name: "Map" }).click();
  const depart = page.getByRole("button", { name: "Visit Sun Watch" });
  await depart.click();
  const stage = page.getByRole("region", { name: "Sun Watch readings" });
  await stage.getByRole("slider", { name: "Wind sample" }).press("Home");
  await expect(stage.getByText("388", { exact: true })).toBeVisible();
  await expect(stage.getByRole("region", { name: "GOES X-ray measurements" })).toContainText("1.23e-6");
  await stage.getByRole("button", { name: "Keep this reading" }).click();
  await expect(stage.getByRole("button", { name: "Reading kept" })).toBeDisabled();
  await page.getByRole("button", { name: "Back to the oval" }).click();
  await expect(depart).toBeFocused();
  await expect(world.locator("time")).toHaveAttribute("datetime", forecast!);
  await expect(
    page.getByRole("group", { name: "Aurora projection" }).getByRole("button", { name: "Map" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(await canvas.evaluate((node, prior) => node === prior, original)).toBe(true);
});
