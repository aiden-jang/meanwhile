export interface PanelReturn {
  scrollTarget: string;
  scroll: number;
  focus: string;
  fallback?: string;
  rowOffset?: number | undefined;
}

export function catalogueRowOffset(panel: HTMLElement | null, focus: string) {
  const row = document.getElementById(focus);
  if (!panel || !panel.contains(row) || !row?.closest(".story-results")) return;
  return row.getBoundingClientRect().top - panel.getBoundingClientRect().top;
}

export function restorePanel(saved: PanelReturn) {
  const panel = document.getElementById(saved.scrollTarget);
  if (!panel?.getClientRects().length) {
    const outside = document.getElementById(saved.focus);
    if (outside?.getClientRects().length) outside.focus({ preventScroll: true });
    return;
  }
  const target = [saved.focus, saved.fallback, saved.scrollTarget]
    .map((id) => (id ? document.getElementById(id) : null))
    .find((element) => element?.getClientRects().length && !element.hasAttribute("disabled"));
  target?.focus({ preventScroll: true });
  // A newly recorded Continue row can change the height above the selected story.
  const offset = saved.rowOffset;
  if (target?.id === saved.focus && offset !== undefined && panel.contains(target)) {
    const align = () => {
      panel.scrollTop += target.getBoundingClientRect().top - panel.getBoundingClientRect().top - offset;
    };
    align();
    return () => {
      if (document.activeElement === target && panel.contains(target)) align();
    };
  }
  panel.scrollTo(0, saved.scroll);
}
