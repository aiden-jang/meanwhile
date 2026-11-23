export const stormJourney = "radar-to-recovery";

type StormChapter = {
  label: string;
  path: string;
  description: string;
  next?: string;
  leaving?: string;
};

export const stormChapters: readonly StormChapter[] = [
  {
    label: "Recent radar",
    path: "M9 2a7 7 0 1 0 7 7M9 5a4 4 0 1 0 4 4m-4 0 7-7",
    description: "Recent radar observations",
    next: "Follow Katrina",
    leaving: "Leaving live radar…",
  },
  {
    label: "Katrina",
    path: "M2 10c0-5 6-8 10-6 4 2 2 8-2 8-3 0-4-4-1-5m7 1c0 5-5 8-10 6",
    description: "Hurricane Katrina · Louisiana · 2005",
    next: "Follow Maria’s recovery",
    leaving: "Crossing to Puerto Rico…",
  },
  {
    label: "Recovery",
    path: "M9 1v5m0 6v5M1 9h5m6 0h5M3 3l2 2m8 8 2 2m0-12-2 2m-8 8-2 2",
    description: "Hurricane Maria · Puerto Rico · 2017",
  },
];
