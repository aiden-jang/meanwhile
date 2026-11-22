export const goldenGate = {
  id: "9414290",
  label: "San Francisco · Golden Gate",
  lat: 37.8063,
  lon: -122.4659,
} as const;

export const chileTsunami = {
  lon: -72.898,
  lat: -36.122,
  label: "Central Chile",
} as const;

export const tidePorts = [
  { id: "8518750", label: "New York · The Battery", lat: 40.7006, lon: -74.0142 },
  goldenGate,
  { id: "1612340", label: "Honolulu Harbor", lat: 21.3067, lon: -157.867 },
  { id: "8443970", label: "Boston Harbor", lat: 42.3548, lon: -71.0534 },
  { id: "9447130", label: "Seattle", lat: 47.6026, lon: -122.3393 },
] as const;
