import { fetchAll } from "./src/data/fetch-listing";

const features = await fetchAll((c) => c.regions.includes("AT-07"));
features.sort((f1, f2) => f1.properties.name.localeCompare(f2.properties.name));
features.forEach((feature) => {
  const button = document.createElement("button");
  button.innerText = feature.properties.shortName ?? feature.properties.name.slice(0, 8);
  button.title = feature.properties.name;
  button.onclick = () => {
    Array.from(document.getElementsByTagName("linea-plot")).forEach((plot, i) => {
      if (i > 0) plot.remove();
      plot.setAttribute("src", feature.$smet[0]);
      plot.setAttribute("lazysrc", feature.$smet[1]);
    });
  };
  document.querySelector("nav")!.append(button);
});
