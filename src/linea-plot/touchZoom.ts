import uPlot from "uplot";
import { OptsHelper } from "./optsHelper";

/**
 * Creates a uPlot plugin that handles touch-based zooming and panning
 * @static
 * @param {any} opts - Plugin options
 * @returns {Object} Plugin object with hooks
 * @returns {Object} returns.hooks - Plugin hooks object
 * @returns {Function} returns.hooks.init - Initialization function that sets up touch event handlers
 *
 * @description
 * This plugin enables multi-touch zoom functionality:
 * - Single touch: Pan the chart
 * - Two-finger touch: Pinch to zoom in/out on the X axis
 *
 * The zoom is synchronized across all plots sharing the same sync key.
 * Respects the original scale boundaries to prevent over-zooming.
 *
 * Modified from: https://leeoniya.github.io/uPlot/demos/zoom-touch.html
 */
export class TouchZoom {
  static touchZoomPlugin(opts) {
    function init(u: uPlot) {
      const over = u.over;
      let rect: DOMRect;
      let oxRange: number, xVal: number;
      let fr = { x: 0, dx: 0, d: 1 }; // first touch
      let to = { x: 0, dx: 0, d: 1 }; // current touch

      let rafPending = false;

      function storePos(t: any, e: TouchEvent) {
        const ts = e.touches;
        const t0 = ts[0];
        const t0x = t0.clientX - rect.left;

        if (ts.length === 1) {
          t.x = t0x;
          t.dx = 1;
          t.d = 1;
        } else {
          const t1 = ts[1];
          const t1x = t1.clientX - rect.left;

          t.x = (t0x + t1x) / 2;
          t.dx = Math.abs(t1x - t0x);
          t.d = Math.sqrt((t1x - t0x) ** 2);
        }
      }

      let selectRerenderTimeout: number | null = null;

      function updatePlots(plots: uPlot[], newMin: number, newMax: number) {
        plots.forEach((plot) => {
          plot.setScale("x", { min: newMin, max: newMax });
        });

        if (selectRerenderTimeout !== null) {
          return;
        }

        selectRerenderTimeout = window.setTimeout(() => {
          plots.forEach((plot) => {
            plot.select.left = plot.valToPos(plot.scales.x.min, "x");
            plot.select.width = plot.valToPos(plot.scales.x.max, "x") - plot.select.left;
            plot.select.top = 0;
            plot.select.height = plot.over.getBoundingClientRect().height;
            plot.hooks.setSelect?.forEach((fn) => fn(plot));
          });

          selectRerenderTimeout = null;
        }, 150);
      }

      function onMove(e: TouchEvent) {
        storePos(to, e);

        if (!rafPending) {
          rafPending = true;
          requestAnimationFrame(() => {
            rafPending = false;

            const plots: uPlot[] = uPlot.sync(u.cursor.sync.key).plots;
            const dataMin = u.data[0][0];
            const dataMax = u.data[0][u.data[0].length - 1];
            const windowWidth = u.scales.x.max - u.scales.x.min;

            if (e.touches.length === 1) {
              // Single-finger PAN
              const dx = to.x - fr.x;
              const shift = (-dx / rect.width) * windowWidth;

              let newMin = Math.max(
                dataMin,
                Math.min(u.scales.x.min + shift, dataMax - windowWidth),
              );
              let newMax = newMin + windowWidth;
              updatePlots(plots, newMin, newMax);
            } else if (e.touches.length === 2) {
              // Two-finger PINCH ZOOM
              const xFactor = fr.dx / to.dx;
              const leftPct = to.x / rect.width;
              const nxRange = windowWidth * xFactor;
              let nxMin =
                u.scales.x.min + (u.scales.x.max - u.scales.x.min) * leftPct - nxRange * leftPct;
              let nxMax = nxMin + nxRange;

              // clamp to data
              nxMin = Math.max(dataMin, nxMin);
              nxMax = Math.min(dataMax, nxMax);
              if (nxMax - nxMin < 5) nxMax = nxMin + 5; // prevent collapsing
              updatePlots(plots, nxMin, nxMax);
            }
          });
        }
      }

      over.addEventListener("touchstart", (e) => {
        rect = over.getBoundingClientRect();
        storePos(fr, e);

        oxRange = u.scales.x.max - u.scales.x.min;
        xVal = u.posToVal(fr.x, "x");

        document.addEventListener("touchmove", onMove, { passive: true });
      });

      over.addEventListener("touchend", () => {
        document.removeEventListener("touchmove", onMove);
      });
    }

    return {
      hooks: { init },
    };
  }
}
