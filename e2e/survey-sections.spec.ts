import { test, expect, type Locator } from "@playwright/test";
import { installFeeds } from "./feeds";

async function pointAt(path: Locator, fraction: number) {
  return path.evaluate((node, f) => {
    const el = node as SVGPathElement;
    const pt = el.getPointAtLength(el.getTotalLength() * f).matrixTransform(el.getScreenCTM()!);
    return { x: pt.x, y: pt.y };
  }, fraction);
}

test("the measured trench accepts a reversible scroll and a floor drag without moving the camera @dev", async ({
  page,
  hasTouch,
}) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#v=observe&story=seafloor");
  const scene = page.getByRole("region", { name: "Seafloor Flight", exact: true });
  const trace = scene.locator("[data-bed]"),
    time = scene.getByRole("slider", { name: "Flight progress" });
  await expect(trace).toHaveAttribute("d", /^M/);
  const camera = () => page.evaluate(() => Reflect.get(window, "__globe").state());
  const canvas = await page.locator("#globe-view canvas[data-engine]").elementHandle();
  const start = await camera();
  const q = await pointAt(trace, 0.32);
  if (hasTouch) await page.touchscreen.tap(q.x, q.y);
  else {
    await page.mouse.move(q.x, q.y);
    await page.mouse.wheel(0, 215);
  }
  await expect.poll(async () => Number(await time.inputValue())).toBeGreaterThan(10);
  if (hasTouch) {
    const top = await pointAt(trace, 0);
    await page.touchscreen.tap(top.x, top.y);
  } else await page.mouse.wheel(0, -215);
  await expect(time).toHaveValue("0");
  expect(await camera()).toEqual(start);
  const a = await pointAt(trace, 0.15),
    b = await pointAt(trace, 0.6);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 10 });
  await page.mouse.up();
  await expect.poll(async () => Number(await time.inputValue())).toBeGreaterThan(20);
  const held = await time.inputValue();
  await scene.getByRole("button", { name: "Map", exact: true }).click();
  await expect(time).toHaveValue(held);
  expect(
    await canvas!.evaluate((el) => el === document.querySelector("#globe-view canvas[data-engine]")),
  ).toBe(true);
});

test("touching the seafloor holds the guided descent and resumes from the same sounding", async ({
  page,
  hasTouch,
}) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#p=map&v=observe&story=seafloor");
  const panel = page.getByRole("region", { name: "Seafloor Flight", exact: true });
  const progress = panel.getByRole("slider", { name: "Flight progress" });
  await panel.getByRole("button", { name: "Begin the descent" }).click();
  await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThan(0);
  const point = await pointAt(panel.locator("[data-pick]"), 0.42);
  if (hasTouch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
  const resume = page.getByRole("button", { name: "Resume journey", exact: true });
  await expect(resume).toBeVisible();
  const held = Number(await progress.inputValue());
  await expect(panel.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await resume.click();
  await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThan(held);
  await expect(panel.getByRole("button", { name: "Map", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("a held buoy shows an actual gap and survives changing month and projection", async ({ page }) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#v=observe&story=nino");
  const panel = page.getByRole("region", { name: "El Niño Pulse", exact: true });
  await panel.getByRole("button", { name: "Inspect buoy 155° W", exact: true }).click();
  const reading = panel.locator(".buoy-line .survey-number");
  await expect(reading).toHaveText("26.01 °C");
  await panel.getByRole("button", { name: "Warm layer shifts", exact: true }).click();
  await expect(reading).toHaveText("No reading");
  await panel.getByRole("button", { name: "Map", exact: true }).click();
  await expect(reading).toHaveText("No reading");
  await panel.getByRole("button", { name: "Early 1997", exact: true }).click();
  await expect(reading).toHaveText("26.01 °C");
});

test("the buoy named on the narrow map has a reachable touch target", async ({ page, hasTouch }) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#p=map&v=observe&story=nino");
  const panel = page.getByRole("region", { name: "El Niño Pulse", exact: true });
  await expect(panel.locator(".buoy-line [data-reading]")).toContainText("155° W · 100 m");
  const buoy = panel.getByRole("button", { name: "Inspect buoy 155° W", exact: true });
  if (hasTouch) await buoy.tap();
  else await buoy.click();
  await expect(buoy).toHaveAttribute("aria-pressed", "true");
  await expect(panel.getByRole("combobox", { name: "Mooring longitude" })).toHaveValue("-155");
});

test("a lidar sample shares its location, height and folded evidence sheet", async ({ page }) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#v=observe&story=dust&chapter=slice:68:24:world");
  const panel = page.getByRole("region", { name: "Dust Curtain", exact: true }),
    face = panel.locator("[data-face]");
  await expect(face).toHaveAttribute("d", /^M/);
  await expect(panel.locator(".lidar-profile")).not.toHaveAttribute("open", "");
  await expect(panel.locator(".survey-number")).toHaveText("3.6 km");
  await expect(panel.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Map", exact: true }).click();
  await panel.getByText("Read the lidar profile", { exact: true }).click();
  await expect(panel.getByRole("slider", { name: "Along the track" })).toHaveValue("68");
  await expect(panel.getByRole("slider", { name: "Profile altitude" })).toHaveValue("24");
});

test("Back restores the held sounding and the reading panel after Find opens another story", async ({
  page,
}) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#v=observe&story=seafloor&chapter=section:flight:58&t=1767268800120");
  const trench = page.getByRole("region", { name: "Seafloor Flight", exact: true });
  const position = trench.getByRole("slider", { name: "Distance along section" });
  await expect(position).toHaveValue("58");
  const panel = trench.locator("#observatory-intro");
  const offset = await panel.evaluate((el) => (el.scrollTop = 245));
  await expect.poll(() => panel.evaluate((el) => el.scrollTop)).toBe(offset);
  await page.getByRole("button", { name: "Find", exact: true }).click();
  const find = page.getByRole("dialog", { name: "Find", exact: true });
  await find.getByRole("searchbox").fill("Dust Curtain");
  await find.locator('[data-find-result="story:dust"]').click();
  await expect(
    page.getByRole("region", { name: "Dust Curtain", exact: true }).locator(".survey-surface"),
  ).toBeVisible();
  await page.goBack();
  await expect(find.getByRole("searchbox")).toHaveValue("Dust Curtain");
  await expect(trench.locator("[data-bed]")).toHaveAttribute("d", /^M/);
  await expect.poll(() => panel.evaluate((el) => el.scrollTop)).toBe(offset);
  await find.getByRole("button", { name: "Close Find" }).click();
  await expect(position).toHaveValue("58");
  await expect.poll(() => panel.evaluate((el) => el.scrollTop)).toBe(offset);
});
