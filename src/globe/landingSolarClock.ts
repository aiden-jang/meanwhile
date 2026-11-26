let minutes = 0;
const subscribers = new Set<() => void>();

export const solarOffsetMinutes = () => minutes;

export function setSolarOffsetMinutes(value: number) {
  if (!Number.isFinite(value)) return;
  const next = Math.max(-360, Math.min(360, Math.round(value)));
  if (minutes === next) return;
  minutes = next;
  subscribers.forEach((notify) => notify());
}

export function subscribeLandingSun(notify: () => void) {
  subscribers.add(notify);
  return () => {
    subscribers.delete(notify);
  };
}

export function landingSolarTime(at: number, offset: number) {
  return at + offset * 60_000;
}
