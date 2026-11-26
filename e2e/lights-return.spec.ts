import { devices, expect, test, type Locator } from "@playwright/test";
import { installFeeds, openStories, saveImageButton, revealStoryTools, selectScene } from "./feeds";

test("Lights Return compares NASA recovery periods and returns to the same After Dark globe", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installFeeds(page, { presentation: "fresh" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // The baseline also appears in discovery; fail an image loaded only by the replay.
  await page.route(/\/a\/maria-early-[^/]+\.webp$/, (route) => route.abort(), { times: 1 });
  await page.goto("/");
  const canvas = page.locator("#globe-view canvas");
  const original = await canvas.elementHandle();
  await selectScene(page, "After Dark");
  await openStories(page);
  const open = page.getByRole("button", { name: "Lights Return", exact: true });
  await open.click();
  const panel = page.getByRole("region", { name: "Lights Return" });
  await expect(panel.getByRole("button", { name: "Back to stories" })).toBeFocused();
  await expect(panel.getByRole("status", { name: "Image loading status" })).toHaveText(
    "NASA’s archived images couldn’t load.",
  );
  await panel.getByRole("button", { name: "Retry images" }).click();
  await expect(panel.getByRole("button", { name: "Early aftermath", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await panel.getByRole("button", { name: "Island replay", exact: true }).click();
  const stage = panel.locator(".replay-stage");
  const periodTitle = panel.locator("[data-lights-period] h3");
  await expect(stage.locator(".stage-readout")).toContainText("Before Maria");
  await expect(await saveImageButton(page)).toBeEnabled();
  const period = panel.getByRole("slider", { name: "Night-light period" });
  const compare = panel.getByRole("button", { name: "Compare with before" });
  await expect(compare).toBeDisabled();
  await period.press("ArrowRight");
  await expect(periodTitle).toHaveText("Early aftermath");
  await expect(period).toHaveAttribute("aria-valuetext", /20 Sep – 20 Nov 2017/);
  await compare.click();
  const divider = panel.getByRole("slider", { name: "Before and after divider" });
  await expect(divider).toBeInViewport();
  await divider.press("End");
  await expect(stage.locator(".stage-readout")).toContainText("Before Maria");
  await divider.press("Home");
  await expect(stage.locator(".stage-readout")).toContainText("Early aftermath");
  await divider.press("ArrowRight");
  await expect(divider).toHaveValue("1");
  await expect(panel.locator(".lights-dates")).toContainText("Pre-storm baseline");
  const anchor = stage.getByText("Ponce", { exact: true });
  await expect(anchor).toBeVisible();
  const before = (await anchor.boundingBox())!;
  await divider.press("ArrowRight");
  const after = (await anchor.boundingBox())!;
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(2);
  await panel.getByRole("button", { name: "Map", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Map", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(divider).toHaveValue("2");
  await period.press("End");
  await expect(periodTitle).toHaveText("Months 5–6");
  await expect(period).toHaveAttribute("aria-valuetext", /21 Jan – 20 Mar 2018/);
  await page.setViewportSize({ width: 812, height: 375 });
  await expect(period).toBeInViewport();
  await panel.getByRole("button", { name: "Replay" }).click();
  await expect(periodTitle).toHaveText("Before Maria");
  await expect(periodTitle).toHaveText("Early aftermath");
  await panel.getByRole("button", { name: "Pause" }).click();
  await expect(period).toHaveValue("1");
  await page.keyboard.press("Escape");
  await expect(open).toBeFocused();
  await revealStoryTools(page);
  await expect(page.getByRole("button", { name: "Tonight’s Sky", exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await open.click();
  await expect(stage.getByText("Approaching the island", { exact: true })).toBeVisible();
  await expect(periodTitle).toHaveText("Early aftermath");
  await expect(period).toHaveValue("1");
  await expect(panel.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await period.press("End");
  await compare.click();
  await divider.press("End");
  await expect(stage.locator(".stage-readout")).toContainText("Before Maria");
  await panel.getByRole("button", { name: "Back to stories" }).click();
  await expect(open).toBeFocused();
  expect(await canvas.evaluate((element, prior) => element === prior, original)).toBe(true);
  expect(errors).toEqual([]);
});

for (const mobile of [false, true]) {
  const projection = mobile ? "Map" : "Globe";
  test(`Lights Return drags the comparison on the ${projection.toLowerCase()} and restores an exact place reading`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      ...(mobile ? devices["Pixel 7"] : {}),
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      await installFeeds(page, { presentation: "fresh", empty: true });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (entry) => {
        if (entry.type() === "error" && /WebGLProgram|Shader Error/.test(entry.text()))
          errors.push(entry.text());
      });
      await page.goto(
        "/#v=observe&story=lights&choice=1&chapter=lens:san-juan&p=" + projection.toLowerCase(),
      );
      const panel = page.getByRole("region", { name: "Lights Return", exact: true });
      const button = (name: string) => panel.getByRole("button", { name, exact: true });
      const main = panel.getByRole("region", { name: "Compare Puerto Rico" });
      const canvas = page.locator("#globe-view canvas");
      const original = await canvas.elementHandle();
      const lens = button("Move the before-Maria lens");
      const lensPoint = async () => {
        await expect(lens).toHaveAttribute("data-positioned", "");
        const bounds = await lens.boundingBox();
        if (!bounds) throw new Error("The lens is outside the scene.");
        return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      };
      const marker = button("Ponce on the scene");
      await expect(marker).toBeVisible();
      const cameraMark = await marker.boundingBox();
      const start = await lensPoint();
      const end = { x: start.x - (mobile ? 35 : 57), y: start.y + 32 };
      const touch = mobile ? await context.newCDPSession(page) : undefined;
      const activate = (control: Locator) => (mobile ? control.tap() : control.click());
      if (touch) {
        await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
        await expect(lens).toHaveAttribute("data-grabbing", "");
        for (let step = 1; step <= 5; step++)
          await touch.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
              {
                x: start.x + ((end.x - start.x) * step) / 5,
                y: start.y + ((end.y - start.y) * step) / 5,
              },
            ],
          });
        await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      } else {
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await expect(lens).toHaveAttribute("data-grabbing", "");
        await page.mouse.move(end.x, end.y, { steps: 5 });
        await page.mouse.up();
      }
      const opener = button("Inspect this place");
      await expect(opener).toBeVisible();
      await expect(lens).not.toHaveAttribute("data-grabbing", "");
      await expect
        .poll(async () => {
          const point = await lensPoint();
          return Math.hypot(point.x - start.x, point.y - start.y);
        })
        .toBeGreaterThan(22);
      expect(await marker.boundingBox()).toEqual(cameraMark);
      const chapter = () => page.evaluate(() => new URLSearchParams(location.hash.slice(1)).get("chapter"));
      await expect.poll(chapter).toMatch(/^lens:-\d+\.\d+,\d+\.\d+$/);
      const keptPlace = await chapter();
      const late = main.getByRole("button", { name: "Months 5–6", exact: true });
      await activate(late);
      await expect(late).toHaveAttribute("aria-pressed", "true");
      await expect(page).toHaveURL(/choice=3/);

      await opener.scrollIntoViewIfNeeded();
      const rail = panel.locator("#observatory-intro");
      await rail.evaluate((node) => {
        node.scrollTop += 9;
      });
      const scroll = () => rail.evaluate((node) => node.scrollTop);
      const savedScroll = await scroll();
      // Capture the departure on opening the reading, after the final touch move has been drawn.
      const departure = await lensPoint();
      await activate(opener);
      const reading = panel.getByRole("region", { name: "Night lights at this place" });
      await expect(reading.getByRole("heading", { name: "Pinned location" })).toBeVisible();
      await expect(reading.getByText("21 Jan – 20 Mar 2018")).toBeVisible();
      const crops = await reading
        .getByRole("img")
        .evaluateAll((nodes) => nodes.map((node) => (node as HTMLCanvasElement).toDataURL()));
      expect(crops).toHaveLength(2);
      expect(crops[0]).not.toBe(crops[1]);
      await activate(reading.getByRole("button", { name: "Early aftermath", exact: true }));
      await expect(page).toHaveURL(/choice=1/);
      const next = mobile ? "Globe" : "Map";
      await activate(button(next));
      await expect(button(next)).toHaveAttribute("aria-pressed", "true");
      await canvas.dispatchEvent("wheel", { deltaY: -120, clientX: departure.x, clientY: departure.y });
      await activate(button("Back to comparison"));
      await expect(opener).toBeFocused();
      await expect(button(projection)).toHaveAttribute("aria-pressed", "true");
      await expect(main.getByRole("button", { name: "Months 5–6", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect.poll(chapter).toBe(keptPlace);
      await expect.poll(scroll).toBe(savedScroll);
      await expect
        .poll(async () => {
          const after = await lensPoint();
          return Math.hypot(after.x - departure.x, after.y - departure.y);
        })
        .toBeLessThan(1);
      await activate(main.getByRole("button", { name: "Ponce", exact: true }));
      await expect(button("Inspect Ponce")).toBeVisible();
      expect(await canvas.evaluate((node, previous) => node === previous, original)).toBe(true);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
