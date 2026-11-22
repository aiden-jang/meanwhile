import type { Page } from "@playwright/test";

const primary = "https://celestrak.org/NORAD/elements/gp.php?**";
const mirror = "https://api.wheretheiss.at/v1/satellites/25544/tles?**";
const tle = [
  "ISS (ZARYA)",
  "1 25544U 98067A   26309.85320381  .00006629  00000+0  12749-3 0  9998",
  "2 25544  51.6327 319.0560 0007195 352.5747   7.5134 15.49194530593711",
].join("\n");

export async function installOrbit(page: Page, fallback = false) {
  await page.clock.setFixedTime(new Date("2026-11-06T16:00:00Z"));
  const requests = { primary: 0, mirror: 0 };
  await page.route(primary, (route) => {
    requests.primary++;
    return route.fulfill(fallback ? { status: 403 } : { body: tle });
  });
  await page.route(mirror, (route) => {
    requests.mirror++;
    return route.fulfill({ body: tle });
  });
  return requests;
}

export async function blockOrbit(page: Page) {
  await Promise.all([primary, mirror].map((url) => page.route(url, (route) => route.abort())));
}
