import { expect, test } from "@playwright/test";
import { installFeeds } from "./feeds";

for (const width of [1440, 320]) {
  test(`the story picks open directly and restore the catalogue at ${width}px`, async ({
    page,
    hasTouch,
  }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 });
    await installFeeds(page, { presentation: "fresh", empty: true });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const canvas = await page.locator("#globe-view canvas").elementHandle();
    await page.getByRole("button", { name: "All stories", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Stories", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const catalogue = page.getByRole("region", { name: "Story catalogue", exact: true });
    const search = catalogue.getByRole("searchbox", { name: "Find a story" });
    const picks = catalogue.getByRole("region", { name: "Start here" });
    const more = catalogue.getByRole("heading", { name: "More stories", exact: true });
    await expect(catalogue).toBeVisible();
    await expect(page.locator("#observatory-intro")).toHaveCount(0);
    await picks.getByRole("button", { name: "More stories", exact: true }).click();
    await expect(more).toBeFocused();
    await expect(more).toBeInViewport();
    await expect(
      more.evaluate((heading) => {
        const rect = heading.getBoundingClientRect();
        return heading.contains(document.elementFromPoint(rect.left + 6, rect.top + rect.height / 2));
      }),
    ).resolves.toBe(true);
    await expect(catalogue.locator(".catalogue-more .story-choice > button").first()).toHaveText(
      "Tonga’s shockwave",
    );
    await expect(search).toBeInViewport({ ratio: 1 });

    const rail = page.locator("#chrome-rail");
    const choices = [
      { title: "Float Dive", control: page.getByRole("slider", { name: "Ascent depth" }) },
      { title: "Moonfall", control: page.getByRole("combobox", { name: "Rover traverse" }) },
      { title: "Kīlauea", control: page.getByRole("slider", { name: "Compare before and after" }) },
    ];
    for (const { title, control } of choices) {
      const entry = picks.getByRole("button", { name: title, exact: true });
      await expect(catalogue.getByRole("button", { name: title, exact: true })).toHaveCount(1);
      if (title === "Kīlauea") {
        await page.getByRole("button", { name: "Map", exact: true }).click();
      }
      const firstVisitAtTop = title === "Float Dive" && width === 1440;
      const prep = await entry.evaluate((row, atTop) => {
        const panel = row.closest("#chrome-rail")!;
        const tools = panel.querySelector(panel.clientHeight < 360 ? ".story-search-line" : ".story-tools")!;
        const delta = row.getBoundingClientRect().top - tools.getBoundingClientRect().bottom;
        panel.scrollTop = atTop ? 0 : Math.max(4, panel.scrollTop + delta - 14);
        return panel.scrollTop;
      }, firstVisitAtTop);
      if (firstVisitAtTop) expect(prep).toBe(0);
      else expect(prep).toBeGreaterThan(0);
      const rowOffset = () =>
        entry.evaluate(
          (row) => row.getBoundingClientRect().top - row.closest("#chrome-rail")!.getBoundingClientRect().top,
        );
      await expect(entry).toBeEnabled();
      const position = await entry.evaluate((row) => {
        const { x, y, width, height } = row.getBoundingClientRect();
        const point = { x: x + width / 2, y: y + height / 2 };
        return row.contains(document.elementFromPoint(point.x, point.y)) ? point : null;
      });
      expect(position).not.toBeNull();
      const before = await rowOffset();
      // Use the visible point directly so test-driver scrolling does not alter the departure position.
      if (hasTouch) await page.touchscreen.tap(position!.x, position!.y);
      else await page.mouse.click(position!.x, position!.y);
      await expect(control).toBeVisible();
      if (title === "Moonfall") expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      if (title === "Float Dive") {
        await expect(control).toHaveValue("0");
        const cue = page.getByText("Drag to change depth", { exact: true });
        await expect(cue).toBeInViewport({ ratio: 1 });
        await page.getByRole("slider", { name: "Float depth", exact: true }).press("ArrowUp");
        await expect(cue).toHaveCount(0);
      }
      if (title === "Kīlauea") {
        await expect(control).toHaveValue("48");
        await expect(page.getByRole("region", { name: "Map", exact: true })).toBeVisible();
      }
      expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(
        true,
      );
      if (title === "Moonfall") await page.goBack();
      else await page.getByRole("button", { name: "Back to stories", exact: true }).click();
      await expect(entry).toBeFocused();
      await expect.poll(async () => Math.abs((await rowOffset()) - before)).toBeLessThanOrEqual(1);
      if (width === 320 && title === "Float Dive") {
        // A late line wrap in Continue must leave the returned story at the same height.
        const caption = rail.locator(".story-continue small");
        const height = () => caption.evaluate((el) => el.getBoundingClientRect().height);
        const initialHeight = await height();
        const wrapCaption = await page.addStyleTag({
          content: ".story-continue small { inline-size: 10ch }",
        });
        await expect.poll(height).toBeGreaterThan(initialHeight);
        await expect.poll(async () => Math.abs((await rowOffset()) - before)).toBeLessThanOrEqual(1);
        await wrapCaption.evaluate((style) => style.remove());
        await expect.poll(async () => Math.abs((await rowOffset()) - before)).toBeLessThanOrEqual(1);
      }
    }
    await expect(rail.locator(".story-continue")).toContainText("Kīlauea");
    await expect(search).toBeInViewport({ ratio: 1 });
    await search.fill("Rupture");
    await expect(
      page
        .getByRole("region", { name: "Search results" })
        .getByRole("button", { name: "Rupture Reveal", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("a shared story gives context, holds its moment, and ends with a finding @dev", async ({ page }) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#v=observe&story=aral&t=1325376000000&p=map");
  const panel = page.getByRole("region", { name: "Vanishing Sea", exact: true });
  await expect(panel.getByRole("complementary", { name: "About this shared view" })).toContainText(
    "Opened paused at the 2011 annual water classification",
  );
  await expect(panel.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  const slider = panel.getByRole("slider");
  const selected = await slider.inputValue();
  await expect(slider).toHaveValue(selected);
  await slider.focus();
  await slider.press("End");
  await expect(panel.getByRole("region", { name: "What this view showed" })).toContainText(
    "Missing observations are not dry land",
  );
  const year = panel.getByRole("region", { name: "What this view showed" }).locator("time");
  await expect(year).toHaveText("2021");
  await expect(year).toHaveAttribute("datetime", "2021");
  await expect(panel.getByText("Up next", { exact: true })).toBeVisible();
  await panel.getByRole("region", { name: "What this view showed" }).scrollIntoViewIfNeeded();
  if (process.env["EIF_CAPTURE_UI"])
    await page.screenshot({ path: test.info().outputPath("story-finding.png") });
});

test("native sharing has a story title and cancellation stays quiet @dev", async ({ page }) => {
  await installFeeds(page, { empty: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { value: () => true });
    Object.defineProperty(navigator, "share", {
      value: async (data: ShareData) => {
        (window as unknown as { shared: ShareData }).shared = data;
        throw new DOMException("Cancelled", "AbortError");
      },
    });
  });
  await page.goto("/#story=aral&t=1325376000000");
  const panel = page.getByRole("region", { name: "Vanishing Sea", exact: true });
  await expect(panel.getByRole("slider")).toBeVisible();
  await panel.getByRole("button", { name: "Share this moment", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { shared?: ShareData }).shared?.title))
    .toBe("Vanishing Sea · meanwhile.");
  await expect(panel.getByRole("status", { name: "Sharing status" })).toBeEmpty();
  await expect(panel.getByRole("textbox", { name: "Story link" })).toBeHidden();
});

test("catalogue entry and Find keep their purpose after a journey", async ({ page }) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const find = page.getByRole("button", { name: "Find", exact: true });
  const globalSearch = page.getByRole("searchbox", { name: "Search places, stories and layers" });
  await find.click();
  await globalSearch.fill("radar");
  await expect(page.locator("[data-find-primary]")).toContainText("Storm radar");
  await globalSearch.press("Enter");
  await expect(page.locator("#layer-inspector-title")).toHaveText("Storm radar");
  await page.getByRole("button", { name: "Back to Find", exact: true }).click();
  await globalSearch.fill("Fiji");
  await globalSearch.press("Enter");
  await expect(page.getByRole("region", { name: "Earthquake cutaway" })).toBeVisible();
  await page.getByRole("button", { name: "Back to Find", exact: true }).click();
  await expect(globalSearch).toHaveValue("Fiji");
  await globalSearch.fill("Ice in Motion");
  await globalSearch.press("Enter");
  await expect(page.getByRole("region", { name: "Current journey", exact: true })).toContainText(
    "Ice in Motion",
  );
  await page.reload();
  await page.locator(".zone-head .wordmark").click();
  await page.getByRole("button", { name: "All stories", exact: true }).click();
  const search = page.getByRole("searchbox", { name: "Find a story" });
  await expect(page.locator(".catalogue-picks")).toBeVisible();
  await search.fill("ice");
  const journeys = page.getByRole("button", { name: "Journeys", exact: true });
  await journeys.click();
  await expect(page.locator("#journeys-panel")).toBeVisible();
  await journeys.click();
  await expect(search).toHaveValue("ice");
  await expect(page.getByRole("region", { name: "Search results" })).toContainText("Ice Line");
});

test("Saved holds a playing story and resumes it on dismissal", async ({ page }) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/#v=observe&story=seafloor");
  const slider = page.getByRole("slider", { name: "Flight progress" });
  const transport = page.locator(".story-dock .story-playback");
  await expect(slider).toBeVisible();
  if ((await transport.innerText()).trim() !== "Pause") await transport.click();
  await expect(transport).toHaveText("Pause");
  await page.locator("#open-saved-observations").click();
  const saved = page.getByRole("dialog", { name: "Saved observations" });
  await expect(saved).toBeVisible();
  await expect(transport).toHaveAttribute("data-playback-start", "true");
  const held = await slider.inputValue();
  await expect(saved.getByRole("button", { name: "Browse stories" })).toBeVisible();
  expect(await slider.inputValue()).toBe(held);
  await saved.getByRole("button", { name: "Close saved observations" }).click();
  await expect(transport).toHaveText("Pause");
  await expect(slider).not.toHaveValue(held);
});

test("Dust Curtain restores the catalogue row through story Back and browser Back", async ({
  page,
  hasTouch,
}) => {
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/");
  await page.getByRole("button", { name: "All stories", exact: true }).click();
  const row = page.getByRole("button", { name: "Dust Curtain", exact: true });
  const position = () => row.evaluate((el) => el.getBoundingClientRect().top);
  await row.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  for (const back of [
    () => page.getByRole("button", { name: "Back to stories" }).click(),
    () => page.goBack(),
  ]) {
    const before = await position();
    const point = await row.evaluate((button) => {
      const { x, y, width, height } = button.getBoundingClientRect();
      const center = { x: x + width / 2, y: y + height / 2 };
      return button.contains(document.elementFromPoint(center.x, center.y)) ? center : null;
    });
    expect(point).not.toBeNull();
    if (hasTouch) await page.touchscreen.tap(point!.x, point!.y);
    else await page.mouse.click(point!.x, point!.y);
    await expect(page.getByRole("heading", { name: "Dust Curtain", exact: true })).toBeVisible();
    await back();
    await expect(row).toBeFocused();
    await expect.poll(async () => Math.abs((await position()) - before)).toBeLessThanOrEqual(1);
  }
});

test("the Moon shortcut opens a visible path for the selected city and restores its row in Map", async ({
  page,
  hasTouch,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.clock.setFixedTime(new Date("2026-11-09T10:00:00Z"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("eif.sky-city", "Tokyo"));
  await installFeeds(page, { presentation: "fresh", empty: true });
  await page.goto("/");
  const canvas = await page.locator("#globe-view canvas").elementHandle();
  await page.getByRole("button", { name: "All stories", exact: true }).click();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  const rail = page.locator("#chrome-rail");
  const shortcut = rail.getByRole("button", { name: "Drag the Moon", exact: true });
  await shortcut.evaluate((row) => {
    const panel = row.closest("#chrome-rail")!;
    panel.scrollTop += row.getBoundingClientRect().top - panel.getBoundingClientRect().top - 165;
  });
  await expect(shortcut).toBeInViewport({ ratio: 1 });
  const offset = () =>
    shortcut.evaluate(
      (row) => row.getBoundingClientRect().top - row.closest("#chrome-rail")!.getBoundingClientRect().top,
    );
  const heldRow = await offset();
  const point = (await shortcut.boundingBox())!;
  if (hasTouch) await page.touchscreen.tap(point.x + point.width / 2, point.y + point.height / 2);
  else await page.mouse.click(point.x + point.width / 2, point.y + point.height / 2);

  const sky = page.getByRole("region", { name: "Tonight’s Sky", exact: true });
  await expect(sky.getByRole("combobox", { name: "City" })).toHaveValue("Tokyo");
  const moon = page.getByRole("slider", { name: "Moon along its path" });
  await expect(moon).toBeInViewport({ ratio: 1 });
  const time = sky.getByRole("slider", { name: "City local time" });
  await expect(time).toHaveAttribute("aria-valuetext", /Nov 12/);
  const minute = await time.inputValue();
  await moon.press("ArrowRight");
  await expect(time).not.toHaveValue(minute);
  const scrubbed = await time.inputValue();

  await sky.locator("#open-moonfall").click();
  await expect(page.getByRole("combobox", { name: "Rover traverse" })).toBeVisible();
  await page.getByRole("button", { name: "Back to Tonight’s Sky" }).click();
  await expect(time).toHaveValue(scrubbed);
  await sky.getByRole("button", { name: "Back to stories" }).click();
  await expect(page.locator("#globe-view")).toHaveAttribute("aria-label", "Map");
  await expect(shortcut).toBeFocused();
  await expect.poll(async () => Math.abs((await offset()) - heldRow)).toBeLessThanOrEqual(1);
  expect(await canvas!.evaluate((node) => node === document.querySelector("#globe-view canvas"))).toBe(true);
});
