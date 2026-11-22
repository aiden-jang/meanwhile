import type { PanelReturn } from "./panelReturn";

interface HistoryPanel extends PanelReturn {
  query: string;
}

export function readHistoryPanel(): HistoryPanel | undefined {
  const value = history.state?.observatoryPanel as Partial<HistoryPanel> | undefined;
  if (
    value &&
    (value.scrollTarget === "chrome-rail" || value.scrollTarget === "observatory-intro") &&
    typeof value.scroll === "number" &&
    Number.isFinite(value.scroll) &&
    typeof value.focus === "string" &&
    typeof value.query === "string"
  )
    return { scrollTarget: value.scrollTarget, scroll: value.scroll, focus: value.focus, query: value.query };
  return undefined;
}

export function captureHistoryPanel(): HistoryPanel {
  const scrollTarget = document.querySelector('[data-presentation="explore"]')
    ? "chrome-rail"
    : "observatory-intro";
  return {
    scrollTarget,
    scroll: document.getElementById(scrollTarget)?.scrollTop ?? 0,
    focus: document.activeElement?.id ?? "",
    query: document.querySelector<HTMLInputElement>("#story-search-input")?.value ?? "",
  };
}

export function rememberHistoryQuery(query: string) {
  const panel = readHistoryPanel();
  if (!panel || panel.query === query || !document.getElementById("story-search-input")) return;
  history.replaceState({ ...history.state, observatoryPanel: { ...panel, query } }, "");
}
