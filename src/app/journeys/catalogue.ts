import { auroraJourney } from "./auroraJourney";
import { stormJourney } from "./stormJourney";

export const onward: Record<string, readonly [string, string]> = {
  epic: ["orbit", "Compare a distant photograph with a predicted low-Earth orbit."],
  deep: ["seafloor", "Look at the present-day terrain above those moving plates."],
  swell: ["drifter", "Compare wave motion with a recorded ocean-current journey."],
  orbit: ["sky", "Find the Moon and planets above your saved city."],
  drifter: ["float", "Move from a surface track to measured water below it."],
  iceberg: ["glacier", "Compare drifting ice with satellite-measured land ice motion."],
  smoke: ["air", "See current air-quality readings; they are not readings from the 2023 smoke event."],
  tsunami: ["tide", "Compare the recorded 2010 wave with present-day harbor measurements."],
  rain: ["river", "Look at current river gauges; these are separate observations, not a flood forecast."],
  tide: ["swell", "Compare water level at a harbor with waves measured offshore."],
  lightning: ["megaflash", "Slow down a single, record-setting flash from 2017."],
  wind: ["atmospheric-river", "Follow forecast moisture transport as well as wind."],
  river: ["water", "Zoom out from a river gauge to California’s 2011–2017 water-storage record."],
  air: ["smoke", "Revisit the satellite record of the June 2023 smoke crossing."],
  seafloor: ["float", "Explore an independent Argo profile of the water above the seafloor."],
  apophis: ["comet", "Compare the predicted 2029 flyby with NEOWISE’s 2020 path."],
  glacier: ["iceberg", "Follow A-68A’s separate journey through the Southern Ocean."],
  "atmospheric-river": ["rain", "Compare forecast transport with delayed satellite rain estimates."],
  eclipse: ["shadow", "Switch from the March 2025 lunar eclipse to the August 2027 solar eclipse."],
  nino: ["reef", "Compare the 1997–1998 ocean section with coral heat-stress observations."],
  bloom: ["drifter", "Follow a recorded surface-current track through another part of the ocean."],
  reef: ["nino", "Look below the surface in the 1997–1998 tropical Pacific record."],
  aral: ["water", "Compare visible shoreline loss with a different satellite measure: water storage."],
  spring: ["bloom", "Compare seasonal land greening with the 2024 North Atlantic bloom."],
  fault: ["rupture", "Compare Ridgecrest with the larger 2011 Tōhoku rupture."],
  dust: ["smoke", "Compare two satellite records of material crossing a continent or ocean."],
  comet: ["apophis", "Follow a different orbit: Apophis’s predicted 2029 close approach."],
  fire: ["smoke", "Compare the 2021 fire detections with a separate 2023 smoke event."],
  ice: ["iceberg", "Move from regional sea-ice extent to a single Antarctic iceberg’s journey."],
  north: ["aurora", "See the current aurora forecast around the magnetic poles."],
  ozone: ["ice", "Compare two different polar records; their dates and measurements differ."],
  water: ["river", "Return to current USGS river gauges."],
  rupture: ["tsunami", "Compare Tōhoku’s fault with the separately recorded 2010 Chile tsunami."],
  katrina: ["lights", "See a different hurricane’s aftermath: Maria in Puerto Rico, 2017."],
  tonga: ["megaflash", "Explore another rapid atmospheric event through satellite detections."],
  megaflash: ["lightning", "Return to recent GOES lightning detections."],
  kilauea: ["tide", "Compare permanent coastal change with a harbor’s changing water level."],
  lights: ["katrina", "Follow an independent hurricane track: Katrina in 2005."],
  shadow: [
    "eclipse",
    "Compare the 2027 solar eclipse with the calculated geometry of the 2025 lunar eclipse.",
  ],
  sky: ["moonfall", "Leave tonight’s sky for Apollo 17’s recorded 1972 traverse."],
  moonfall: ["sky", "Return to the Moon and planets above your saved city tonight."],
  meteors: ["sky", "Check the Moon and planets in the same saved city."],
  aurora: ["sun", "Inspect solar measurements upstream; they are not an aurora guarantee."],
  sun: ["aurora", "Compare the solar measurements with NOAA’s separate aurora forecast."],
  radar: ["rain", "Compare regional radar scans with delayed satellite rainfall estimates."],
  float: ["drifter", "Compare the vertical profile with a recorded surface-current track."],
};

export interface JourneyStep {
  id: string;
  prompt: string;
  context: string;
}
export interface Journey {
  id: string;
  title: string;
  summary: string;
  ending: string;
  guide?: readonly string[];
  steps: readonly JourneyStep[];
}

export const journeys: readonly Journey[] = [
  {
    id: "above-earth",
    title: "One night above Earth",
    guide: ["Calculated city sky", "Apollo 17 rover route", "Predicted ISS pass"],
    summary: "Your sky, the lunar surface, and a satellite passing overhead.",
    ending: "The sky changes with your city and time. Return on another night to compare it.",
    steps: [
      {
        id: "sky",
        prompt: "Pick your city and scrub the night. Find when the Moon clears the horizon.",
        context: "Calculated Moon and planet positions for the selected city and night.",
      },
      {
        id: "moonfall",
        prompt: "Descend to Taurus–Littrow, then follow the rover through the valley.",
        context: "NASA lunar terrain and Apollo 17’s December 1972 route; this is an archive, not tonight.",
      },
      {
        id: "orbit",
        prompt: "Switch to Local sky and compare the predicted ISS path with your horizon.",
        context: "A current ISS orbit prediction. Visibility depends on sunlight and your location.",
      },
    ],
  },
  {
    id: auroraJourney,
    title: "Follow the aurora",
    guide: ["Auroral oval", "Solar wind", "Magnetic north"],
    summary:
      "Trace the forecast around Earth, follow the solar wind upstream, and compare true and magnetic north.",
    ending:
      "The oval is a forecast, the instruments measure the Sun and solar wind, and the pole trace is a historical field model.",
    steps: [
      {
        id: "aurora",
        prompt: "Fly through the forecast.",
        context: "NOAA OVATION model chance and forecast valid time.",
      },
      {
        id: "sun",
        prompt: "Read an upstream sample.",
        context: "NOAA solar-wind and GOES X-ray measurements each have their own timestamp.",
      },
      {
        id: "north",
        prompt: "Compare the two compass needles.",
        context: "NOAA and IAGA’s historical magnetic field model. The angle refers to your selected city.",
      },
    ],
  },
  {
    id: stormJourney,
    title: "From Radar to Recovery",
    guide: ["Recent radar scans", "NOAA’s 2005 best track", "NASA’s 2017 night lights"],
    summary: "Read recent radar, follow Katrina to Louisiana, and see where lights returned after Maria.",
    ending:
      "Radar shows precipitation, the best track records storm intensity, and nighttime imagery shows a later hurricane’s effect on power and daily life.",
    steps: [
      {
        id: "radar",
        prompt: "Scrub recent scans to see how precipitation moved.",
        context: "Recent composites from RainViewer or NOAA, depending on coverage.",
      },
      {
        id: "katrina",
        prompt: "Follow Katrina to Louisiana, then compare the offshore peak with the Buras landfall.",
        context: "Gulf of Mexico · August 2005 · NOAA HURDAT2 best track.",
      },
      {
        id: "lights",
        prompt: "Slide between the baseline and a recovery period to see where lights returned.",
        context: "Puerto Rico · Hurricane Maria, September 2017 · NASA Black Marble.",
      },
    ],
  },
  {
    id: "water-in-motion",
    title: "Water in Motion",
    guide: ["NOAA forecast", "NASA satellite estimate", "USGS gauge reading"],
    summary: "Moisture in the air, rain from orbit, and water at a river gauge.",
    ending:
      "Forecast transport, satellite estimates, and gauge readings measure different parts of the water cycle. They are not one synchronized forecast.",
    steps: [
      {
        id: "atmospheric-river",
        prompt: "Follow the moisture toward the coast, then inspect the forecast there.",
        context: "Model output with its own run and valid times.",
      },
      {
        id: "rain",
        prompt: "Scrub the satellite frames and watch where precipitation appears.",
        context: "Satellite estimates arrive after observation and have their own timestamps.",
      },
      {
        id: "river",
        prompt: "Pick a gauge and drag the chart to read its rise or fall.",
        context: "These are independent river measurements from the basin you choose.",
      },
    ],
  },
  {
    id: "surface-to-seafloor",
    title: "Surface to Seafloor",
    summary: "Follow a drifting buoy, read the water below it, and descend to the Mariana Trench.",
    guide: ["Surface track", "Water profile", "Seafloor terrain"],
    ending: "A surface track, a water profile, and a depth grid answer different questions about the ocean.",
    steps: [
      {
        id: "drifter",
        prompt: "Play the buoy’s track or pick a fix to read how fast it moved.",
        context: "NOAA drifter fixes. Float Dive opens a separate Argo profile in the North Atlantic.",
      },
      {
        id: "float",
        prompt: "Follow the rise, then scrub the float to compare depths.",
        context: "Measurements at the float’s position. Next, cross to the Mariana Trench.",
      },
      {
        id: "seafloor",
        prompt: "Descend to the trench and drag the depth chart to read the terrain.",
        context: "GEBCO grid depths along an authored route in the western Pacific.",
      },
    ],
  },
  {
    id: "through-the-air",
    title: "Through the Air",
    guide: ["Dust profile", "Smoke scans", "Air pressure"],
    summary: "Follow Saharan dust, wildfire smoke and a pressure wave around the planet.",
    ending:
      "A lidar slice shows height, satellite scans show the plume from above, and a barometer records the passing pressure wave.",
    steps: [
      {
        id: "dust",
        prompt: "Open the lidar slice and drag across it to inspect the plume’s height.",
        context: "Tropical Atlantic · June 2020 · NASA AIRS and CALIPSO.",
      },
      {
        id: "smoke",
        prompt: "Scrub the satellite scans and see where the smoke moves between observations.",
        context: "Eastern Canada and the US · June 2023 · NOAA GOES-16.",
      },
      {
        id: "tonga",
        prompt: "Follow the pressure wave, then pick a station and scrub its recorded pulse.",
        context: "Pacific Ocean · January 2022 · NOAA GOES-17 and ground pressure.",
      },
    ],
  },
  {
    id: "ice-in-motion",
    title: "Ice in Motion",
    guide: ["Sea-ice extent", "Glacier velocity", "Iceberg tracks"],
    summary: "Start over the Arctic, sample one Greenland glacier, then follow an iceberg’s fragments.",
    ending:
      "Sea-ice extent, glacier speed and tracked iceberg positions each measure a different kind of change.",
    steps: [
      {
        id: "ice",
        prompt: "Drag the extent chart to see the Arctic ice edge change through the season.",
        context: "Arctic Ocean · 2012 daily extent and the 1981–2010 reference · NOAA and NSIDC.",
      },
      {
        id: "glacier",
        prompt: "Follow Jakobshavn’s ice toward the fjord. Compare years at the same point along the trace.",
        context: "West Greenland · 2013 and 2024 annual velocity · NASA ITS_LIVE.",
      },
      {
        id: "iceberg",
        prompt: "Play the breakup, then pick a fragment to inspect its recorded route.",
        context: "Southern Ocean · 2020–2021 · A‑68A’s separate satellite track record.",
      },
    ],
  },
  {
    id: "reading-the-coast",
    title: "Reading the coast",
    guide: ["USGS shoreline survey", "NOAA model and buoy record", "NOAA harbor observations"],
    summary: "New land, a passing wave, and the daily rise and fall of water.",
    ending:
      "A coastline can change permanently or appear to move with the water. These three independent records reveal the difference.",
    steps: [
      {
        id: "kilauea",
        prompt: "Follow the lava to Kapoho Bay and compare the shore before and after the flow.",
        context: "USGS flow maps from the 2018 Kīlauea eruption in Hawaiʻi.",
      },
      {
        id: "tsunami",
        prompt: "Follow the wave across the Pacific and look for its arrival in the pressure record.",
        context: "NOAA’s separate 2010 Chile tsunami record; this wave was not caused by Kīlauea.",
      },
      {
        id: "tide",
        prompt: "Choose a harbor, play the readings, and optionally listen to its measured water level.",
        context:
          "Recent NOAA harbor measurements and tide predictions; their timestamps are shown in the view.",
      },
    ],
  },
];
