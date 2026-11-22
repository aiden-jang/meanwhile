import { PlaybackButton } from "../PlaybackButton";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { StoryDock } from "../observations/StoryDock";
import { TimelineTrack } from "../observations/TimelineTrack";
import { END, START, pressureAt, timeIso, timeLabel, type stations } from "./tongaTimeline";
import { keptPressureMinutes } from "./tongaBookmarks";
import type { useTongaPlayback } from "./useTongaPlayback";

export function TongaTimelineDock({
  playback,
  station,
  showReading,
}: {
  playback: ReturnType<typeof useTongaPlayback>;
  station: (typeof stations)[number];
  showReading: boolean;
}) {
  const { minute, ended, view } = playback;
  const navigation = useStoryNavigation();
  const kept = keptPressureMinutes(navigation?.library.saved, station.id);
  const reading = showReading ? pressureAt(station, minute) : null;
  return (
    <StoryDock label="Tonga playback">
      <div className="tonga-time story-dock-time">
        <label htmlFor="tonga-replay-time" className={reading !== null ? "tonga-clock-reading" : undefined}>
          {reading === null ? "Replay time" : `${station.name} · ${reading.toFixed(2)} hPa`}
        </label>
        <time dateTime={timeIso(minute)}>{timeLabel(minute)} UTC</time>
      </div>
      <TimelineTrack
        min={START}
        max={END}
        current={minute}
        valueLabel={`${timeLabel(minute)} UTC`}
        kept={kept}
        landmark={{
          at: station.start,
          label: `${station.name} first reading · ${timeLabel(station.start)} UTC`,
          select: () => playback.seek(station.start, station),
        }}
      >
        <input
          id="tonga-replay-time"
          className="scrub-slider tonga-scrub"
          type="range"
          min={START}
          max={END}
          value={Math.floor(minute)}
          aria-label="Replay time"
          aria-valuetext={`${timeLabel(minute)} UTC`}
          onInput={(event) => playback.scrub(event.currentTarget.valueAsNumber)}
        />
      </TimelineTrack>
      <div className="archive-scene-controls">
        <PlaybackButton
          playing={view.playing}
          ended={ended}
          className="archive-scene-button"
          onClick={playback.toggle}
        />
      </div>
    </StoryDock>
  );
}
