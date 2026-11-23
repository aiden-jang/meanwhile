export const weatherOrigins = {
  "live-storm-katrina": "Back to live storm",
  "storm-radar-katrina": "Back to storm radar",
  "quiet-cyclones-katrina": "Back to tropical cyclones",
  "quiet-cyclones-radar": "Back to tropical cyclones",
} as const;

export function weatherOrigin(trigger: string) {
  return Object.hasOwn(weatherOrigins, trigger)
    ? weatherOrigins[trigger as keyof typeof weatherOrigins]
    : undefined;
}

export const isKatrinaHandoff = (trigger: string | null | undefined) =>
  !!trigger && trigger.endsWith("-katrina") && weatherOrigin(trigger) !== undefined;
