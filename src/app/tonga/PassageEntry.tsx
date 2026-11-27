import { lazy, Suspense, type ReactNode } from "react";
import type { ObservatoryProps } from "../observatoryProps";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { StoryLoading } from "../StoryLoading";
import { pressureSubject } from "../continuity/worldContinuation";
import { honolulu, honoluluReading, passageEntrance, passageRecord } from "./honolulu";
import "./tonga-passage.css";

const Passage = lazy(() =>
  import("./TongaPassage").then(({ TongaPassage: defaultExport }) => ({ default: defaultExport })),
);

export function PassageEntry({
  world,
  deck,
  children,
}: {
  world: ObservatoryProps["world"];
  deck: ObservatoryProps["views"]["observations"];
  children: ReactNode;
}) {
  const navigation = useStoryNavigation();
  const source = navigation?.returnView;
  if (!world || !source || deck.entry !== "tonga" || !passageEntrance(deck.trigger)) return <>{children}</>;
  return (
    <Suspense fallback={<StoryLoading>Opening Tonga…</StoryLoading>}>
      <Passage
        camera={world}
        origin={{ ...source.camera, map: source.flat }}
        initial={deck.session.initial}
        map={deck.map}
        onMap={deck.setMap}
        onView={deck.update}
        remember={deck.session.remember}
        onInspect={(at) =>
          deck.open("tonga", passageRecord, { ...honoluluReading(deck.map), at }, { map: deck.map })
        }
        onExplore={(minute, opener) => navigation.continueAt(pressureSubject(honolulu, minute), opener)}
        onBack={() => history.back()}
      />
    </Suspense>
  );
}
