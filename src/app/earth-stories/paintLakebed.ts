import { waterClass } from "./aralSamples";

export function paintLakebed(image: HTMLImageElement, table: Uint8Array, index: number) {
  const sheet = document.createElement("canvas");
  sheet.width = image.naturalWidth;
  sheet.height = image.naturalHeight;
  const ink = sheet.getContext("2d");
  if (!ink) return;
  ink.drawImage(image, 0, 0);
  ink.fillStyle = "#ddb276d9";
  // A small stipple represents one formerly wet, observed non-water sample. Leave all gaps clear.
  for (let cell = 0; cell < table.length / 7; cell++) {
    const offset = table[cell * 7]!;
    if (offset === 255 || waterClass(table, cell, index) !== 1) continue;
    const x = 4 * (cell % 125) + (offset % 4),
      y = 4 * Math.floor(cell / 125) + Math.floor(offset / 4);
    ink.fillRect(x - 0.5, y - 0.5, 2, 2);
  }
  return sheet;
}
