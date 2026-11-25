import { expect, test, type Locator } from "@playwright/test";
import { installFeeds, openStories } from "./feeds";

async function center(locator: Locator) {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

for (const touch of [false, true]) {
  test.describe(touch ? "phone touch" : "desktop mouse", () => {
    test.use({
      hasTouch: touch,
      isMobile: touch,
      viewport: touch ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    });

    test("samples the glacier and wipes the years before returning to the exact comparison", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await installFeeds(page, { presentation: "fresh", empty: true });
      await page.goto("/");
      const canvas = page.locator("#globe-view canvas");
      const original = await canvas.elementHandle();
      await openStories(page, "search");
      const search = page.getByRole("searchbox", { name: "Find a story" });
      await search.fill("Glacier Flow");
      const entry = page.locator("#search-story-glacier");
      await entry.scrollIntoViewIfNeeded();
      const entryTop = () => entry.evaluate((el) => el.getBoundingClientRect().top);
      await expect
        .poll(async () => {
          const first = await entryTop();
          await page.waitForTimeout(140);
          return Math.abs((await entryTop()) - first);
        })
        .toBeLessThan(1);
      const previousEntry = await entryTop();
      await entry.click();
      const panel = page.getByRole("region", { name: "Glacier Flow", exact: true });
      const pin = panel.getByRole("button", { name: "Drag sampling pin" });
      const divider = panel.getByRole("slider", { name: "Velocity map divider" });
      const location = panel.getByRole("combobox", { name: "Reading location" });
      const details = panel.getByRole("button", { name: "Inspect this point" });
      const intro = panel.locator("#observatory-intro");
      const scroll = () => intro.evaluate((element) => element.scrollTop);
      const cdp = touch ? await page.context().newCDPSession(page) : null;

      async function drag(control: Locator, from: { x: number; y: number }, to: { x: number; y: number }) {
        if (cdp) {
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
          await expect(control).toHaveAttribute("data-grabbing", "");
          await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [to] });
          await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        } else {
          await page.mouse.move(from.x, from.y);
          await page.mouse.down();
          await expect(control).toHaveAttribute("data-grabbing", "");
          await page.mouse.move(to.x, to.y, { steps: 8 });
          await page.mouse.up();
        }
      }

      for (const projection of ["Globe", "Map"]) {
        await panel.getByRole("button", { name: projection, exact: true }).click();
        await expect(pin).toBeEnabled();
        await divider.fill("50");
        await location.selectOption({ label: "Inland ice" });
        await expect(pin).toHaveAttribute("data-sample", "1342");
        const inland = await center(pin);
        await location.selectOption({ label: "Near the fjord" });
        await expect.poll(async () => distance(await center(pin), inland)).toBeGreaterThan(8);
        const cut = await center(divider);
        await drag(pin, await center(pin), inland);
        await expect(location).toHaveValue("1342");
        await expect(panel.getByText("294 m/year slower in 2024")).toBeVisible();
        await expect(divider).toHaveValue("50");
        expect(distance(await center(divider), cut)).toBeLessThan(1);

        await divider.fill("60");
        await expect.poll(async () => distance(await center(divider), cut)).toBeGreaterThan(4);
        const right = await center(divider);
        await divider.fill("50");
        await expect.poll(async () => distance(await center(divider), cut)).toBeLessThan(1);
        await drag(divider, await center(divider), right);
        await expect(divider).toHaveValue("60");
        await expect(location).toHaveValue("1342");
        const held = await center(pin);
        expect(distance(held, inland)).toBeLessThan(1);

        await details.scrollIntoViewIfNeeded();
        const top = await scroll();
        await details.click();
        const back = panel.getByRole("button", { name: "Back to comparison" });
        await expect(back).toBeFocused();
        await expect(back).toBeInViewport({ ratio: 1 });
        await panel
          .getByRole("button", { name: projection === "Globe" ? "Map" : "Globe", exact: true })
          .click();
        const stage = await center(panel.locator(".replay-stage"));
        await canvas.dispatchEvent("wheel", {
          deltaY: -200,
          clientX: stage.x,
          clientY: stage.y,
          bubbles: true,
          cancelable: true,
        });
        await back.click();
        await expect(details).toBeFocused();
        await expect(panel.getByRole("button", { name: projection, exact: true })).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        await expect(location).toHaveValue("1342");
        await expect(divider).toHaveValue("60");
        await expect.poll(scroll).toBe(top);
        await expect.poll(async () => distance(await center(pin), held)).toBeLessThan(1);
      }
      await pin.press("ArrowLeft");
      await expect(location).toHaveValue("1341");
      await divider.press("ArrowLeft");
      await expect(divider).toHaveValue("59");
      await panel.getByRole("button", { name: "Back to stories" }).click();
      await expect(entry).toBeFocused();
      await expect(search).toHaveValue("Glacier Flow");
      await expect.poll(async () => Math.abs((await entryTop()) - previousEntry)).toBeLessThan(2);
      expect(await canvas.evaluate((node, before) => node === before, original)).toBe(true);
    });
  });
}
