import uPlot from "uplot";

// Create a single sync instance for all charts
const syncCursor = uPlot.sync("weather-charts");

// Define shared cursor options for all charts
export const cursorOpts: uPlot.Cursor = {
  lock: true,
  focus: {
    prox: -1,
  },
  sync: {
    key: syncCursor.key,
    setSeries: false,
    match: [(own, ext) => own == ext, (own, ext) => own == ext],
  },
  points: {
    size: 5,
    width: 2,
  },
  drag: {
    setScale: true,
    x: true,
    y: false,
    dist: 0,
    uni: null,
    click: (self, e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    },
  },
  snap: true,
  showTime: true,
};
