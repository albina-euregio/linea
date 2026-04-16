import { LineaPlot } from "./src/linea-plot";
import { PROVIDERS } from "./src/data/providers";

const { features } = await PROVIDERS.filtered("", (c) =>
  c.regions.includes("AT-07"),
).fetchStationListing();
features.sort((f1, f2) => f1.properties.name.localeCompare(f2.properties.name));
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
  document.querySelector("nav")!.append(button);
});
