import { useRef, useState } from "react";

export interface FindPosition {
  query: string;
  result: string;
  scroll: number;
}

export function useFindReturn() {
  const [position, restore] = useState<FindPosition | null>(null);
  const departure = useRef<FindPosition | null>(null);
  return {
    position,
    restore,
    departure,
    launch(from: FindPosition, next: () => void) {
      departure.current = from;
      try {
        next();
      } finally {
        departure.current = null;
        restore(null);
      }
    },
  };
}
