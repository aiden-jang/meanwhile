interface ProjectionScene {
  passageWorld?: { optics: { section?: boolean } };
  setMorph: (value: number) => void;
  cutawayOpen: () => boolean;
  controls: { setMorph: (value: number) => void; framingReady: () => boolean };
}

export function createProjectionTravel(scene: ProjectionScene, flat: boolean, section: boolean) {
  let progress = Number(flat);
  let inSection = section;
  const apply = () => {
    const value = progress * progress * (3 - 2 * progress);
    scene.setMorph(value);
    scene.controls.setMorph(value);
  };
  apply();

  return (dt: number, flat: boolean, section: boolean, reduced: boolean): boolean => {
    const target = Number(flat);
    // A local section must stay over its coordinates while the world changes projection.
    const local = section || !!scene.passageWorld?.optics.section;
    const registered = local || inSection;
    inSection = local;
    if (progress === target) return false;
    if (registered || reduced) progress = target;
    else if (!flat || (!scene.cutawayOpen() && scene.controls.framingReady())) {
      progress = Math.max(0, Math.min(1, progress + (flat ? dt : -dt) / 1.45));
    }
    apply();
    return progress !== target;
  };
}
