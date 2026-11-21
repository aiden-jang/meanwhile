import type { TongaPhase } from "./TongaWorld";

const lines = {
  discover: ["Tonga’s ", "shockwave."],
  inspect: ["A pulse,", "recorded."],
  kept: ["A moment", "worth keeping."],
  shared: ["A pulse,", "across the Pacific."],
} as const;

export function TongaChapterTitle({ phase, title }: { phase: TongaPhase; title: string }) {
  if (phase === "follow") return <h3>{title}</h3>;
  const [opening, closing] = lines[phase];
  return (
    <h3>
      {opening}
      <br />
      {closing}
    </h3>
  );
}
