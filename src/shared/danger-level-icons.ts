import icon1 from "..//assets/Icon-Avalanche-Danger-Level-Dry-Snow-1-EAWS.svg";
import icon2 from "../assets/Icon-Avalanche-Danger-Level-Dry-Snow-2-EAWS.svg";
import icon3 from "../assets/Icon-Avalanche-Danger-Level-Dry-Snow-3-EAWS.svg";
import icon4 from "../assets/Icon-Avalanche-Danger-Level-Dry-Snow-4-EAWS.svg";
import icon5 from "../assets/Icon-Avalanche-Danger-Level-Dry-Snow-5-EAWS.svg";

const iconUrls = [icon1, icon2, icon3, icon4, icon5];
export const LOADED_DANGER_LEVEL_ICONS = new Map<number, HTMLImageElement>();
export const DANGER_LEVEL_MAX_SIZE = 80; // Maximum size for the icons in pixels

function preloadIcons() {
  iconUrls.forEach((url, index) => {
    const img = new Image();
    img.src = url;
    LOADED_DANGER_LEVEL_ICONS.set(index + 1, img);
  });
}
preloadIcons();
