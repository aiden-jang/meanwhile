import { expect, test } from "@playwright/test";
import { installFeeds } from "./feeds";

for (const width of [1440, 844, 320]) {
  test(`the Pacific descent keeps its globe and exact return at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : width === 844 ? 390 : 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installFeeds(page, { presentation: "fresh", empty: true });
    await page.addInitScript(() => localStorage.setItem("eif.landingRotation", "0"));
    await page.goto("/#v=observe&at=-121,41,1.17");
    const canvas = page.locator("#globe-view canvas");
    const original = await canvas.elementHandle();
    const pose = () => page.evaluate(() => new URLSearchParams(location.hash.slice(1)).get("at"));
    await expect.poll(pose).toBe("-121,41,1.17");
    const feature = page.getByRole("button", { name: "Through the Pacific", exact: true });
    const browse = page.getByRole("button", { name: "All stories", exact: true });
    await expect(feature).toBeInViewport({ ratio: 1 });
    await expect(feature).toHaveAccessibleDescription("From orbit to the seafloor");
    await expect(browse).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("button", { name: "Follow nightfall", exact: true })).toHaveCount(0);
    if (width === 320) {
      const subjects = await page.getByRole("group", { name: "Explore by subject" }).boundingBox();
      const footer = await page.locator(".creator-credit").boundingBox();
      expect(subjects!.y + subjects!.height, "subject links clear the legal footer").toBeLessThanOrEqual(
        footer!.y,
      );
    }
    if (width === 1440) await page.emulateMedia({ reducedMotion: "no-preference" });
    await feature.click();

    const descent = page.getByRole("dialog", { name: "Through the Pacific" });
    const depth = descent.getByRole("slider", { name: "Descent position" });
    await expect(depth).toHaveValue("0");
    await expect(depth).toBeInViewport({ ratio: 1 });
    if (width === 1440) {
      const stage = (await descent.boundingBox())!;
      await page.mouse.move(950, 160);
      await page.mouse.down();
      await page.mouse.move(950, 160 + stage.height * 0.65 * 0.43, { steps: 8 });
      await page.mouse.up();
    } else await descent.getByRole("button", { name: "Waterline" }).click();
    await expect(descent).toHaveAttribute("data-region", "Waterline");
    await depth.press("End");
    await expect(depth).toHaveValue("1000");
    await descent.getByRole("button", { name: /Recorded profile/ }).click();
    const profile = descent.getByRole("region", { name: "Station ALOHA" });
    await expect(profile).toContainText("1.52 °C");
    await expect(profile).toContainText("4,802 dbar");
    await expect(profile).toBeInViewport({ ratio: 1 });
    await expect(profile.getByRole("button", { name: "Surface at Station ALOHA" })).toBeInViewport({
      ratio: 1,
    });
    await expect.poll(pose).toBe("-121,41,1.17");
    await descent.getByRole("button", { name: "Back", exact: true }).click();
    await expect(feature).toBeFocused();
    expect(await canvas.evaluate((node, previous) => node === previous, original)).toBe(true);
    await expect.poll(pose).toBe("-121,41,1.17");
    await browse.click();
    await expect(page.getByRole("region", { name: "Story catalogue" })).toBeVisible();
    await expect(page.locator("#open-story-tonga")).toBeVisible();
  });
}

for (const { width, height } of [
  { width: 320, height: 568 },
  { width: 844, height: 390 },
]) {
  test(`scene entrances keep their controls in reach at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installFeeds(page, { presentation: "fresh", empty: true });
    await page.goto("/");
    const subjects = page.getByRole("group", { name: "Explore by subject" });
    const depthShortcut = subjects.getByRole("button", { name: "Below the Surface", exact: true });
    await depthShortcut.click();
    const fiji = page.getByRole("region", { name: "Beneath Fiji", exact: true });
    await expect(fiji.getByRole("heading", { name: "Fiji", exact: true })).toBeInViewport({ ratio: 1 });
    const depth = fiji.getByRole("slider", { name: "Descend beneath the waterline" });
    await expect(depth).toBeInViewport({ ratio: 1 });
    await depth.press("End");
    await expect(fiji.getByRole("link", { name: "USGS record" })).toBeInViewport({ ratio: 1 });
    const backFromFiji = fiji.getByRole("button", { name: "Back to previous view" });
    await expect(backFromFiji).toBeInViewport({ ratio: 1 });
    await backFromFiji.click();
    await expect(depthShortcut).toBeFocused();

    const afterDark = subjects.getByRole("button", { name: "After Dark", exact: true });
    await afterDark.click();
    await expect(page.getByRole("heading", { name: "Tonight’s Sky", exact: true })).toBeInViewport({
      ratio: 1,
    });
    await expect(page.getByRole("slider", { name: "City local time", exact: true })).toBeInViewport({
      ratio: 1,
    });
    await expect(subjects).toBeInViewport({ ratio: 1 });
    const back = page.getByRole("button", { name: "Back to the Observatory", exact: true });
    await expect(back).toBeInViewport({ ratio: 1 });
    await back.click();
    await expect(afterDark).toBeFocused();
  });
}

test("the first Float Dive completes its cinematic rise without stretching playback", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.route("https://erddap.marine.ie/**", (route) =>
    route.fulfill({ json: { table: { rows: [] } } }),
  );
  await page.goto("/");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  await page.getByRole("button", { name: "All stories", exact: true }).click();
  await page.locator("#open-story-float").click();
  const panel = page.getByRole("region", { name: "Float Dive", exact: true });
  const play = page
    .getByRole("group", { name: "Float Dive playback" })
    .getByRole("button", { name: "Play", exact: true });
  await play.press("Enter");
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeFocused();
  await expect(panel.getByRole("region", { name: "What this profile showed" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    panel.getByRole("heading", { name: "The warmest water was below the surface." }),
  ).toBeInViewport({ ratio: 1 });
  await expect(panel.locator(".float-observation")).toContainText("62 m · 6.90 °C");
  await expect(page.getByRole("button", { name: "Replay", exact: true })).toBeVisible();
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});

for (const width of [1440, 390]) {
  test(`the first Float Dive connects its location, finding and kept return at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installFeeds(page, { presentation: "fresh", empty: true });
    await page.route("https://erddap.marine.ie/**", (route) =>
      route.fulfill({ json: { table: { rows: [] } } }),
    );
    await page.goto("/");
    const canvas = await page.locator("#globe-view canvas").elementHandle();
    await page.getByRole("button", { name: "All stories", exact: true }).click();
    await page.getByRole("searchbox", { name: "Find a story" }).fill("Float Dive");
    const entry = page.locator("#search-story-float");
    await entry.click();
    const panel = page.getByRole("region", { name: "Float Dive", exact: true });
    await expect(panel.getByRole("heading", { name: "Below the blue." })).toBeVisible();
    await expect(page.locator(".float-place")).toContainText("6901932");
    await expect(panel).toHaveAttribute("data-float-stage", "locate");
    await expect(page.locator(".float-scrub")).toHaveValue("0");
    await expect(page.locator(".float-playback-row")).toBeHidden();
    await panel.getByRole("button", { name: "Follow the rise", exact: true }).click();
    const transport = page.getByRole("group", { name: "Float Dive playback" });
    await expect(transport.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await expect(transport.getByRole("button", { name: "Pause", exact: true })).toBeFocused();
    await expect(panel).toHaveAttribute("data-float-stage", "rise");
    await transport.getByRole("slider", { name: "Ascent depth" }).press("End");
    await expect(panel.getByRole("region", { name: "What this profile showed" })).toBeVisible();
    await expect(panel.getByRole("img", { name: "Temperature through this water column" })).toBeVisible();
    await expect(panel.locator(".float-observation")).toContainText("62 m · 6.90 °C");
    await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBe(0);
    await panel.getByRole("button", { name: "Keep the 62 m reading", exact: true }).click();
    await expect(panel.getByRole("button", { name: "Kept", exact: true })).toBeVisible();
    const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("eif.visits-v2")!).saved[0]);
    expect(kept.position.float.index).toBe(536);
    expect(kept.observation.temperature).toBe(6.896);
    expect(kept.observation.salinity).toBe(34.928);
    const atDeparture = await page.getByRole("slider", { name: "Ascent depth" }).inputValue();
    await panel.getByRole("button", { name: "Return to your place", exact: true }).click();
    await expect(entry).toBeFocused();
    await page.getByRole("searchbox", { name: "Find a story" }).fill("");
    await expect(page.locator("#open-story-float")).toHaveCount(1);
    await expect(page.locator(".story-continue")).toContainText("Continue Float Dive");
    await page.locator(".story-continue").click();
    await expect(page.getByRole("slider", { name: "Ascent depth" })).toHaveValue(atDeparture);
    await page.getByRole("button", { name: "Saved observations and recent visits" }).click();
    await page.getByRole("button", { name: "Reopen this moment", exact: true }).click();
    await expect(page.getByRole("slider", { name: "Ascent depth" })).toHaveValue("536");
    expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(
      true,
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}
