import * as v from "valibot";
import { LineaPlot } from "./src/linea-plot";
import { PROVIDERS } from "./src/data/providers";
import { fetchOrThrow } from "./src/data/fetchOrThrow";
import { FeatureCollectionSchema } from "./src/schema/listing";

// proxied to dev.avalanche.report by the dev server, see vite.config.ts
const response = await fetchOrThrow("/eaws_weather_stations/linea.geojson");
const providerIDs = PROVIDERS.filtered((c) => c.regions.includes("AT-07")).providers.map(
  (p) => p.dataProviderID,
);
const features = v
  .parse(FeatureCollectionSchema, await response.json())
  .features.filter((f) => providerIDs.includes(f.properties.dataProviderID!));
features.sort((f1, f2) => f1.properties.name.localeCompare(f2.properties.name));
const preselectedStation = new URLSearchParams(location.search).get("station");
document.querySelector("nav details")!.toggleAttribute("open", !preselectedStation);
features.forEach((feature) => {
  const button = document.createElement("button");
  button.innerText = feature.properties.shortName ?? feature.properties.name.slice(0, 8);
  button.title = feature.properties.name;
  button.onclick = (e) => {
    Array.from(document.getElementsByTagName("linea-plot")).forEach((plot, i) => {
      if (i > 0) plot.remove();
      const features = [];
      if (e.ctrlKey) {
        features.push(...JSON.parse(plot.getAttribute(LineaPlot.FEATURES) || "[]"));
      }
      features.push(feature);
      plot.setAttribute(LineaPlot.FEATURES, JSON.stringify(features));
    });
  };
  document.querySelector("nav .stations")!.append(button);
  if (preselectedStation && preselectedStation === (feature.properties.shortName ?? feature.id)) {
    button.click();
  }
});
