import persistent_weak_layers from "../assets/Icon-Avalanche-Problem-Persistent-Weak-Layer-EAWS.svg";
import new_snow from "../assets/Icon-Avalanche-Problem-New-Snow-EAWS.svg";
import wind_slab from "../assets/Icon-Avalanche-Problem-Wind-Slab-EAWS.svg";
import wet_snow from "../assets/Icon-Avalanche-Problem-Wet-Snow-EAWS.svg";
import gliding_snow from "../assets/Icon-Avalanche-Problem-Gliding-Snow-EAWS.svg";
import cornices from "../assets/Icon-Avalanche-Problem-Cornices.svg";
import no_distinct_avalanche_problem from "../assets/Icon-Avalanche-Problem-No-Distinct-Avalanche-Problem-EAWS.svg";
import { type AvalancheProblemType } from "../schema/caaml";

export const LOADED_AVALANCHE_PROBLEM_ICONS = new Map<AvalancheProblemType, HTMLImageElement>([
  ["persistent_weak_layers", img(persistent_weak_layers)],
  ["new_snow", img(new_snow)],
  ["wind_slab", img(wind_slab)],
  ["wet_snow", img(wet_snow)],
  ["gliding_snow", img(gliding_snow)],
  ["cornices", img(cornices)],
  ["no_distinct_avalanche_problem", img(no_distinct_avalanche_problem)],
  ["new_snow", img(new_snow)],
]);

function img(src: string) {
  const img = new Image();
  img.src = src;
  return img;
}
