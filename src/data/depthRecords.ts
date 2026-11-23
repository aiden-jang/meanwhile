export const depthRecords = [
  {
    id: "us1000gcii",
    title: "Fiji region",
    at: "2018-08-19T00:19:40Z",
    lon: -178.153,
    lat: -18.113,
    depthKm: 600,
    magnitude: 8.2,
    scale: "Mww",
  },
  {
    id: "us2000h9e2",
    title: "South of Levuka, Fiji",
    at: "2018-09-06T15:49:18Z",
    lon: 179.35,
    lat: -18.474,
    depthKm: 670.8,
    magnitude: 7.9,
    scale: "Mww",
  },
  {
    id: "us7000ip1c",
    title: "East of Neiafu, Tonga",
    at: "2022-11-11T11:57:33Z",
    lon: -172.053,
    lat: -18.147,
    depthKm: 16.5,
    magnitude: 5.1,
    scale: "mb",
  },
] as const;

export type DepthRecord = (typeof depthRecords)[number];

export function depthRecord(id: string | null | undefined) {
  return depthRecords.find((event) => event.id === id);
}
