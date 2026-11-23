import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StoryThumbnail } from "../StoryThumbnail";
import { searchStories } from "../storyIndex";
import { journeys } from "./catalogue";
import { featuredJourney, previewCamera, previewPlaces } from "./previewRoute";
import { useStoryNavigation } from "./StoryNavigation";
import "./journey-picker.css";

const artwork: Record<string, string> = {
  "ice-in-motion": "iceberg",
  "surface-to-seafloor": "float",
  "above-earth": "moonfall",
};
const titles = new Map(searchStories.map(({ id, title }) => [id, title]));

export function JourneyPicker() {
  const navigation = useStoryNavigation();
  const progress = navigation?.journeyProgress;
  const [selected, select] = useState<string>();
  const [preview, setPreview] = useState<"hover" | "pinned" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const latest = useRef(navigation);
  latest.current = navigation;
  const featured = journeys.find(({ id }) => id === (selected ?? progress?.id ?? featuredJourney))!;
  const resume = navigation?.progressFor(featured.id);
  const showDetails = !!selected || !!resume;
  const opening = featured.steps[resume?.step ?? 0]!;
  const unavailable = navigation?.unavailable(opening.id);
  const journeyActive = !!navigation?.browsingStories && !navigation.active;
  const showing = journeyActive && !!preview;
  const map = !!navigation?.previewMap;
  const city = navigation?.previewCity;
  const places = city ? previewPlaces(featured, city) : [];
  const previewLabel = featured.id === "above-earth" ? "Preview sky location" : "Preview route";
  const stage = showing ? document.querySelector(".zones") : null;
  const cameraControl = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!showing || !city) return;
    const camera = previewCamera(previewPlaces(featured, city), map);
    if (!camera) return;
    latest.current?.preview(camera, true, true);
  }, [showing, featured, map, city]);
  useLayoutEffect(() => {
    if (!showing) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest("#stories-panel") &&
        !event.target.closest(".journey-shelf")
      )
        setPreview(null);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      latest.current?.preview(undefined, true, true);
    };
  }, [showing]);
  useLayoutEffect(() => {
    if (!journeyActive) setPreview(null);
    return () => clearTimeout(timer.current);
  }, [journeyActive]);

  function closePreview() {
    clearTimeout(timer.current);
    setPreview(null);
  }

  if (!navigation) return null;
  const id = `journey-${featured.id}`;
  const feature = (
    <div
      className="journey-feature"
      data-previewing={showing || undefined}
      onPointerLeave={() => {
        clearTimeout(timer.current);
        setPreview((current) => (current === "hover" ? null : current));
      }}
    >
      <button
        data-journey-control=""
        type="button"
        className="journey-feature-cover"
        ref={cameraControl}
        disabled={!!unavailable || !places.length}
        aria-pressed={preview === "pinned"}
        onPointerEnter={(event) => {
          clearTimeout(timer.current);
          if (event.pointerType === "mouse")
            timer.current = setTimeout(() => setPreview((current) => current ?? "hover"), 180);
        }}
        onClick={() => setPreview((current) => (current === "pinned" ? null : "pinned"))}
      >
        <span className="journey-shelf-art">
          <StoryThumbnail id={artwork[featured.id] ?? featured.steps[0]!.id} featured />
        </span>
        <span className="journey-shelf-title">
          <strong>{featured.title}</strong>
          <small>{previewLabel}</small>
        </span>
      </button>
      <ol className="journey-shelf-stops" aria-label="Journey stops">
        {featured.steps.map(({ id }, index) => (
          <li key={id} aria-current={resume?.step === index ? "step" : undefined}>
            <span>{index + 1}</span>
            {titles.get(id)}
          </li>
        ))}
      </ol>
      <button
        data-journey-control=""
        type="button"
        className="journey-shelf-start"
        id={id}
        disabled={!!unavailable}
        onClick={() =>
          resume ? navigation.continueJourney(featured.id, id) : navigation.start(featured.id, id)
        }
      >
        <span>{resume ? `Continue ${featured.title}` : "Start journey"}</span>
        {resume ? (
          <small>
            {resume.step + 1} of {featured.steps.length}
          </small>
        ) : (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 10h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        )}
      </button>
      {unavailable && <small className="journey-shelf-status">{unavailable}</small>}
    </div>
  );
  return (
    <section
      className="journey-shelf"
      aria-label="Guided journeys"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !preview) return;
        event.stopPropagation();
        closePreview();
        cameraControl.current?.focus({ preventScroll: true });
      }}
    >
      <div className="journey-shelf-heading">
        <h3>Journeys</h3>
      </div>
      <div id="journey-catalogue" className="journey-shelf-all">
        {[...journeys]
          .sort(
            (a, b) =>
              Number(b.id === (progress?.id ?? featuredJourney)) -
              Number(a.id === (progress?.id ?? featuredJourney)),
          )
          .map((entry) => (
            <Fragment key={entry.id}>
              <button
                id={`select-journey-${entry.id}`}
                data-journey-control=""
                type="button"
                aria-pressed={showDetails && entry.id === featured.id}
                onClick={() => {
                  select(entry.id);
                  setPreview("pinned");
                  requestAnimationFrame(() => document.getElementById(`journey-${entry.id}`)?.focus());
                }}
              >
                <strong>{entry.title}</strong>
                <small>{entry.summary}</small>
                {(!showDetails || entry.id !== featured.id) && (
                  <small>{entry.steps.map(({ id }) => titles.get(id)).join(" · ")}</small>
                )}
              </button>
              {showDetails && entry.id === featured.id && feature}
            </Fragment>
          ))}
      </div>
      {stage &&
        places.length > 0 &&
        createPortal(
          <svg
            key={`${featured.id}:${city?.name}`}
            className="journey-route-preview"
            data-journey-route={places.map(({ lon, lat }) => `${lon},${lat}`).join(";")}
            aria-hidden="true"
          >
            <path fill="none" />
            {places.map(({ number }) => (
              <g key={number}>
                <line />
                <g>
                  <circle r="10" />
                  <text y="0.075em" dominantBaseline="middle" textAnchor="middle">
                    {number}
                  </text>
                </g>
              </g>
            ))}
          </svg>,
          stage,
        )}
    </section>
  );
}
