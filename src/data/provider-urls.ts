// kept separate from the provider modules so that importing a URL does not pull in a provider
export const GEOSPHERE_URL =
  "https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min";

export const SLF_URL = Object.freeze({
  STATIONS: "https://measurement-api.slf.ch/public/api/imis/stations",
  STATION: "https://measurement-api.slf.ch/public/api/imis/station/",
  SNOW_HEIGHT:
    "https://public-meas-data-v2.slf.ch/public/station-data/timepoint/SNOW_HEIGHT/current/geojson",
  TEMPERATURE_AIR:
    "https://public-meas-data-v2.slf.ch/public/station-data/timepoint/TEMPERATURE_AIR/current/geojson",
  TEMPERATURE_SNOW_SURFACE:
    "https://public-meas-data-v2.slf.ch/public/station-data/timepoint/TEMPERATURE_SNOW_SURFACE/current/geojson",
  WIND_MEAN:
    "https://public-meas-data-v2.slf.ch/public/station-data/timepoint/WIND_MEAN/current/geojson",
});
