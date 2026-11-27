import { useCallback, useEffect, useRef, useState } from "react";
import { createSiren, type Siren } from "./sound";

export function useNewsSound() {
  /* Build the AudioContext on the press. Built without a user gesture it starts suspended and drops
  every later tone in silence: the toggle says on and nothing is heard. */
  const [sound, setSound] = useState(false);
  const siren = useRef<Siren | null>(null);
  useEffect(() => {
    if (!sound) {
      siren.current?.close();
      siren.current = null;
      return undefined;
    }
    try {
      siren.current = createSiren();
    } catch {
      siren.current = null;
    }
    return () => {
      siren.current?.close();
      siren.current = null;
    };
  }, [sound]);
  const onNews = useCallback((magnitudes: number[]) => {
    siren.current?.play(magnitudes);
  }, []);
  return { sound, setSound, onNews };
}
