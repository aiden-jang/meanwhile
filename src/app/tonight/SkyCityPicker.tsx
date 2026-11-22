import { useCallback, useState } from "react";
import { useStoredName } from "../useStored";
import { skyCities } from "./cities";

const names = skyCities.map(({ name }) => name);
const defaultCity = () =>
  skyCities.find(({ zone }) => zone === Intl.DateTimeFormat().resolvedOptions().timeZone) ?? skyCities[0]!;

export function useSkyCity(initial?: string) {
  const [preferred, setPreference] = useStoredName("sky-city", defaultCity().name, names, initial);
  const [restored, restore] = useState<string>();
  const name = restored ?? preferred;
  const select = useCallback(
    (next: string) => {
      restore(undefined);
      setPreference(next);
    },
    [setPreference],
  );
  const city = skyCities.find((city) => city.name === name) ?? skyCities[0]!;
  return { name, city, select, restore };
}

export type SkyCityPreference = ReturnType<typeof useSkyCity>;

export function SkyCityPicker({
  city,
  select,
}: {
  city: string;
  select: (name: string) => void;
}): JSX.Element {
  return (
    <label className="tonight-city">
      <span>City</span>
      <select value={city} onChange={(event) => select(event.currentTarget.value)}>
        {names.map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>
    </label>
  );
}
