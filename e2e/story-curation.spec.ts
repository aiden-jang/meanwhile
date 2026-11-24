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
      if (title === "Float Dive") await expect(control).toHaveValue("0");
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
