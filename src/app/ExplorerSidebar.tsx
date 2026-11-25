import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useReadingArrival } from "./useReadingArrival";
import { flushSync } from "react-dom";
import { shiftGlobe } from "./presentationMotion";
import { globeFramingRect } from "../globe/globeFraming";
import type { ObservatoryProps } from "./Observatory";
import { Discoveries } from "./visitor/Discoveries";
import { StoriesDrawer } from "./StoriesDrawer";
import { OBSERVATORY_SCENES } from "./SceneEntrances";
import { resetStoryResults } from "./StorySearch";
import { reportAnalytics } from "../../analytics/browser";
import { HonoluluMarker } from "./tonga/HonoluluMarker";
import "./explore-panel.css";

export function ExplorerFold({
  open,
  pane,
  onChange,
}: {
  open: boolean;
  pane: "layers" | "stories";
  onChange: (open: boolean) => void;
}) {
  function change() {
    onChange(!open);
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(open ? "#explorer-fold" : ".explorer-tabs [aria-selected=true]")
        ?.focus({ preventScroll: true }),
    );
  }
  function fold() {
    const scene = document.querySelector<HTMLElement>("#globe-view .globe-scene");
    if (!scene?.animate || document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      change();
      return;
    }
    const from = globeFramingRect(scene);
    scene
      .getAnimations()
      .find((motion) => motion.id === "globe-fold")
      ?.cancel();
    flushSync(change);
    shiftGlobe(scene, from, "globe-fold");
  }
  const label = pane === "stories" ? "Stories" : "Layers";
  return (
    <button
      type="button"
      id="explorer-fold"
      className="explorer-fold"
      onClick={fold}
      aria-expanded={open}
      aria-controls="chrome-rail"
      aria-label={open ? `Hide ${label}` : label}
      title={open ? `Hide ${label}` : `Show ${label}`}
    >
      <span className="explorer-fold-chevron" aria-hidden="true" />
      {!open && label}
    </button>
  );
}

export function ExplorerSidebar({
  context,
  children,
  notices,
  fold,
}: {
  context: ObservatoryProps;
  children: ReactNode;
  notices: ReactNode;
  fold: ReactNode;
}) {
  const { browser, observations } = context.views;
  const scene = OBSERVATORY_SCENES.find(({ id }) => id === browser.category);
  const panel = useRef<HTMLDivElement>(null);
  useReadingArrival(panel, browser.pane, "fade");
  const scrolls = useRef({ layers: 0, stories: 0 });
  const previous = useRef(browser.pane);
  useLayoutEffect(() => {
    const rail = document.getElementById("chrome-rail");
    if (!rail) return;
    let idle = 0;
    const markScroll = () => {
      rail.toggleAttribute("data-scrolled", rail.scrollTop > 0);
      rail.setAttribute("data-scrolling", "");
      clearTimeout(idle);
      idle = window.setTimeout(() => rail.removeAttribute("data-scrolling"), 650);
    };
    rail.toggleAttribute("data-scrolled", rail.scrollTop > 0);
    rail.addEventListener("scroll", markScroll, { passive: true });
    return () => {
      rail.removeEventListener("scroll", markScroll);
      rail.removeAttribute("data-scrolling");
      clearTimeout(idle);
    };
  }, []);
  const layerView = useRef<{ camera: ReturnType<typeof context.explorer.read>; flat: boolean } | null>(null);
  useLayoutEffect(() => {
    if (previous.current === browser.pane) return;
    if (browser.pane === "stories" && !context.views.observing)
      layerView.current = { camera: context.explorer.read(), flat: context.explorer.flat };
    else layerView.current = null;
    const rail = document.getElementById("chrome-rail");
    if (rail) rail.scrollTop = scrolls.current[browser.pane];
    previous.current = browser.pane;
  }, [browser.pane, context.explorer, context.views.observing]);
  const select = (pane: "layers" | "stories") => {
    if (pane === "layers" && browser.pane === "stories" && layerView.current)
      context.explorer.restore(layerView.current.camera, layerView.current.flat);
    scrolls.current[browser.pane] = document.getElementById("chrome-rail")?.scrollTop ?? 0;
    browser.show(pane);
  };
  return (
    <>
      {!context.views.observing && browser.pane === "layers" && (
        <HonoluluMarker map={context.explorer.flat} />
      )}
      <div className="explorer-tabs">
        <div
          className="explorer-tab-options"
          data-pane={browser.pane}
          role="tablist"
          aria-label="Explore panel"
        >
          {(["layers", "stories"] as const).map((pane) => (
            <button
              key={pane}
              id={`explorer-${pane}-tab`}
              type="button"
              role="tab"
              aria-selected={browser.pane === pane}
              aria-controls={`explorer-${pane}`}
              tabIndex={browser.pane === pane ? 0 : -1}
              onClick={() => select(pane)}
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "layers"
                    : event.key === "End"
                      ? "stories"
                      : pane === "layers"
                        ? "stories"
                        : "layers";
                select(next);
                document.getElementById(`explorer-${next}-tab`)?.focus({ preventScroll: true });
              }}
            >
              {pane === "layers" ? "Layers" : "Stories"}
            </button>
          ))}
        </div>
        {fold}
      </div>
      <div
        ref={browser.pane === "layers" ? panel : undefined}
        id="explorer-layers"
        role="tabpanel"
        aria-labelledby="explorer-layers-tab"
        hidden={browser.pane !== "layers"}
      >
        {children}
        {notices}
      </div>
      <div
        ref={browser.pane === "stories" ? panel : undefined}
        id="explorer-stories"
        role="tabpanel"
        aria-labelledby="explorer-stories-tab"
        hidden={browser.pane !== "stories"}
      >
        <h2 className="sr-only">Stories</h2>
        <StoriesDrawer
          browse={browser}
          visible={!context.views.observing}
          scene={browser.category}
          sceneEntry={
            scene && (
              <button
                type="button"
                id="open-story-category-scene"
                className="story-scene-entry"
                disabled={!context.ready}
                onClick={() => {
                  reportAnalytics({ name: "scene_selected", scene: scene.id });
                  context.views.observeScene(() => {
                    observations.setQuery("");
                    context.onScene(scene.id);
                  });
                  document.getElementById(`observatory-entry-${scene.id}`)?.focus({ preventScroll: true });
                }}
              >
                Open {scene.name} scene
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            )
          }
          filter={
            <div className="story-category" role="group" aria-label="Story categories">
              {[{ id: null, name: "All topics" }, ...OBSERVATORY_SCENES].map(({ id, name }) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={browser.category === id}
                  onClick={(event) => {
                    resetStoryResults(event.currentTarget);
                    browser.select(browser.category === id ? null : id);
                  }}
                >
                  <span>{name}</span>
                </button>
              ))}
            </div>
          }
          ready={context.ready}
          observations={observations}
          discoveries={
            <Discoveries
              data={context.discoveries}
              aurora={context.aurora}
              city={context.views.skyCity.city}
            />
          }
          onSelect={() => {
            browser.scroll.current = document.getElementById("chrome-rail")?.scrollTop ?? 0;
          }}
          onDismiss={() => {
            select("layers");
            document.getElementById("explorer-layers-tab")?.focus();
          }}
        />
      </div>
    </>
  );
}
