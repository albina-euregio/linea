import uPlot from "uplot";

export const cursorOpts: uPlot.Cursor = {
  lock: true,
  focus: {
    prox: -1,
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
    click: (_self, e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
    },
  },
};
