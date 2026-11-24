import { catalogueRowOffset, type PanelReturn } from "./panelReturn";

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
    return {
      scrollTarget: value.scrollTarget,
      scroll: value.scroll,
      focus: value.focus,
      query: value.query,
      rowOffset: Number.isFinite(value.rowOffset) ? value.rowOffset : undefined,
    };
  return undefined;
}

export function captureHistoryPanel(): HistoryPanel {
  const scrollTarget = document.querySelector('[data-presentation="explore"]')
    ? "chrome-rail"
    : "observatory-intro";
  const panel = document.getElementById(scrollTarget);
  const focus = document.activeElement?.closest("#observatory-find")
    ? "open-observatory-find"
    : (document.activeElement?.id ?? "");
  return {
    scrollTarget,
    scroll: panel?.scrollTop ?? 0,
    focus,
    rowOffset: catalogueRowOffset(panel, focus),
    query: document.querySelector<HTMLInputElement>("#story-search-input")?.value ?? "",
  };
}

export function rememberHistoryQuery(query: string) {
  const panel = readHistoryPanel();
  if (!panel || panel.query === query || !document.getElementById("story-search-input")) return;
  history.replaceState({ ...history.state, observatoryPanel: { ...panel, query } }, "");
}
