import type { Ref } from "react";
import { lightsPeriods } from "../../sources/observations/blackMarble";
import { PlaybackButton } from "../PlaybackButton";
import { StoryDock } from "../observations/StoryDock";

export function LightsTimeline({
  index,
  arrived,
  comparing,
  playing,
  split,
  skip,
  play,
  ready,
  seek,
  togglePlay,
  toggleCompare,
  changeSplit,
  openLens,
}: {
  index: number;
  arrived: boolean;
  comparing: boolean;
  playing: boolean;
  split: number;
  skip: Ref<HTMLButtonElement>;
  play: Ref<HTMLButtonElement>;
  ready: () => void;
  seek: (index: number) => void;
  togglePlay: () => void;
  toggleCompare: () => void;
  changeSplit: (position: number) => void;
  openLens: () => void;
}) {
  const period = lightsPeriods[index]!;
  const last = lightsPeriods.length - 1;
  return (
    <>
      <div className="archive-scene-caption" data-lights-period={index}>
        <h3>{period.title}</h3>
        <p>{period.note}</p>
      </div>
      <button className="recovery-replay" type="button" onClick={openLens}>
        Use comparison lens
      </button>
      <StoryDock label="Night-light playback" deferOnShortPhone={!arrived}>
        <div className="lights-transport">
          <div className="observation-transport">
            <span>Night-light period · {period.dates}</span>
            <input
              className="scrub-slider observation-scrub"
              type="range"
              min={0}
              max={last}
              value={index}
              aria-label="Night-light period"
              aria-valuetext={period.title + " · " + period.dates}
              onChange={(event) => seek(event.currentTarget.valueAsNumber)}
            />
            <div className="observatory-actions">
              {!arrived && (
                <button ref={skip} type="button" onClick={ready}>
                  Skip approach
                </button>
              )}
              <PlaybackButton
                className="lights-playback-button"
                playing={playing}
                ended={index === last}
                buttonRef={play}
                onClick={togglePlay}
              />
              <button
                type="button"
                aria-pressed={comparing}
                disabled={!arrived || index === 0}
                onClick={toggleCompare}
              >
                Compare with before
              </button>
            </div>
          </div>
          {comparing && (
            <div className="lights-comparison">
              <div className="lights-dates">
                <div>
                  <strong>Before Maria</strong>
                  <span>{lightsPeriods[0].dates}</span>
                </div>
                <div>
                  <strong>{period.title}</strong>
                  <span>{period.dates}</span>
                </div>
              </div>
              <label>
                <span>Before and after divider</span>
                <input
                  className="scrub-slider"
                  type="range"
                  min={0}
                  max={100}
                  value={split}
                  aria-valuetext={split + "% from left"}
                  onChange={(event) => changeSplit(event.currentTarget.valueAsNumber)}
                />
              </label>
            </div>
          )}
        </div>
      </StoryDock>
    </>
  );
}
