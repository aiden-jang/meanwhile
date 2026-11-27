export interface SceneEntry {
  session: string;
  id: number;
  index: number;
}

export function sceneEntry(): SceneEntry | undefined {
  const entry = history.state?.observatory;
  return entry && Number.isInteger(entry.index) ? entry : undefined;
}

export function returnToScene(target: SceneEntry | undefined) {
  const current = sceneEntry();
  if (!target || current?.session !== target.session || target.index >= current.index) return false;
  history.go(target.index - current.index);
  return true;
}
