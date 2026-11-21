import type { Page } from "@playwright/test";

export async function installOrbit(page: Page) {
  await page.clock.setFixedTime(new Date("2026-11-06T16:00:00Z"));
  await page.route("https://celestrak.org/NORAD/elements/gp.php?**", (route) =>
    route.fulfill({
      body: [
        "ISS (ZARYA)",
        "1 25544U 98067A   26309.85320381  .00006629  00000+0  12749-3 0  9998",
        "2 25544  51.6327 319.0560 0007195 352.5747   7.5134 15.49194530593711",
      ].join("\n"),
    }),
  );
}
