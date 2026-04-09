import icon1 from "../assets/Icon-Avalanche-Problem-Persistent-Weak-Layer-EAWS.svg";
import icon2 from "../assets/Icon-Avalanche-Problem-New-Snow-EAWS.svg";
import icon3 from "../assets/Icon-Avalanche-Problem-Wind-Slab-EAWS.svg";
import icon4 from "../assets/Icon-Avalanche-Problem-Wet-Snow-EAWS.svg";
import icon5 from "../assets/Icon-Avalanche-Problem-Gliding-Snow-EAWS.svg";
import icon6 from "../assets/Icon-Avalanche-Problem-Cornices.svg";
import icon7 from "../assets/Icon-Avalanche-Problem-No-Distinct-Avalanche-Problem-EAWS.svg";
import type { AvalancheProblemType } from "../schema/caaml";

const avalancheProblemTypes: AvalancheProblemType[] = [
  "persistent_weak_layers",
  "new_snow",
  "wind_slab",
  "wet_snow",
  "gliding_snow",
  "cornices",
  "no_distinct_avalanche_problem",
];
const iconUrls = [icon1, icon2, icon3, icon4, icon5, icon6, icon7];
export const LOADED_AVALANCHE_PROBLEM_ICONS = new Map<AvalancheProblemType, HTMLImageElement>();

function preloadIcons() {
  iconUrls.forEach((url, index) => {
    const img = new Image();
    img.src = url;
    LOADED_AVALANCHE_PROBLEM_ICONS.set(avalancheProblemTypes[index], img);
  });
}
preloadIcons();
