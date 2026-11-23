import { expect, test } from "@playwright/test";
import { installFeeds, openStories, startJourney } from "./feeds";

test("Through the Air restores the lidar cursor, smoke scan, and Tonga station on one canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  await openStories(page, "all");
  await startJourney(page, "through-the-air");
  const guide = page.getByRole("region", { name: "Current journey", exact: true });
  const button = (name: string) => page.getByRole("button", { name, exact: true });
  const previous = guide.getByRole("button", { name: "Previous view", exact: true });
  const next = (title: string) => guide.getByRole("button", { name: `Next: ${title}`, exact: true });
  const altitude = page.getByRole("slider", { name: "Profile altitude", exact: true });
  const along = page.getByRole("slider", { name: "Along the track" });
  const replay = page.getByRole("slider", { name: "Replay time", exact: true });
  const mapFocus = page.getByRole("combobox", { name: "Map focus", exact: true });
  const pressure = page.getByRole("slider", { name: "Station pressure time", exact: true });
  const station = page.getByRole("combobox", { name: "Ground station", exact: true });

  await expect(guide).toContainText("1 of 3");
  await expect(button("Open lidar slice")).toBeInViewport({ ratio: 1 });
  await button("Map").click();
  await button("Open lidar slice").click();
  await expect(page.getByText("Read the lidar profile", { exact: true }).locator("..")).toHaveAttribute(
    "open",
    "",
  );
  await altitude.press("ArrowUp");
  await along.press("End");
  const heldAlong = await along.inputValue();
  const heldAltitude = await altitude.inputValue();
  await next("Smoke Crossing").click();
  await expect(guide).toContainText("2 of 3");
  await button("Globe").click();
  await mapFocus.selectOption("new-york");
  await replay.press("End");
  await replay.press("ArrowLeft");
  const heldScan = await replay.inputValue();
  await expect(page.getByText("Loading this image…", { exact: false })).toHaveCount(0);
  await next("Tonga’s shockwave").click();
  await expect(guide).toContainText("3 of 3");
  await button("Follow the wave").click();
  await station.selectOption("PHNL");
  await button("Inspect Honolulu’s record").click();
  await pressure.press("ArrowRight");
  const heldPressure = await pressure.inputValue();
  await button("Map").click();
  await previous.click();
  await expect(mapFocus).toHaveValue("new-york");
  await expect(replay).toHaveValue(heldScan);
  await expect(page.getByRole("group", { name: "Smoke Crossing on the globe" })).toBeVisible();
  await previous.click();
  await expect(altitude).toHaveValue(heldAltitude);
  await expect(along).toHaveValue(heldAlong);
  await expect(page.getByRole("group", { name: "Dust Curtain on the map" })).toBeVisible();
  await next("Smoke Crossing").click();
  await expect(replay).toHaveValue(heldScan);
  await next("Tonga’s shockwave").click();
  await expect(station).toHaveValue("PHNL");
  await expect(pressure).toHaveValue(heldPressure);
  await expect(page.getByRole("group", { name: "Tonga’s shockwave on the map" })).toBeVisible();
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});
