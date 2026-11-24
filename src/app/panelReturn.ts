export interface PanelReturn {
  scrollTarget: string;
  scroll: number;
  focus: string;
  fallback?: string;
  rowOffset?: number | undefined;
}

export function catalogueRowOffset(panel: HTMLElement | null, focus: string) {
  const row = document.getElementById(focus);
  if (!panel?.scrollTop || !panel.contains(row) || !row?.closest(".catalogue-picks, .catalogue-more")) return;
  return row.getBoundingClientRect().top - panel.getBoundingClientRect().top;
}

export function restorePanel(saved: PanelReturn) {
  const panel = document.getElementById(saved.scrollTarget);
  if (!panel?.getClientRects().length) return;
  panel.scrollTo(0, saved.scroll);
  const target = [saved.focus, saved.fallback, saved.scrollTarget]
    .map((id) => (id ? document.getElementById(id) : null))
    .find((element) => element?.getClientRects().length && !element.hasAttribute("disabled"));
  // A newly recorded Continue row can change the height above the selected story.
  if (target?.id === saved.focus && saved.rowOffset !== undefined && panel.contains(target))
    panel.scrollTop +=
      target.getBoundingClientRect().top - panel.getBoundingClientRect().top - saved.rowOffset;
  target?.focus({ preventScroll: true });
}
