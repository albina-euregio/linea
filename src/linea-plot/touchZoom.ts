import uPlot from "uplot";

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
    function init(u, opts, data) {
      let over = u.over;
      let rect, oxRange, oyRange, xVal, yVal;
      let fr = { x: 0, y: 0, dx: 0, dy: 0 };
      let to = { x: 0, y: 0, dx: 0, dy: 0 };

      function storePos(t, e) {
        let ts = e.touches;

        let t0 = ts[0];
        let t0x = t0.clientX - rect.left;
        let t0y = t0.clientY - rect.top;

        if (ts.length == 1) {
          t.x = t0x;
          t.y = t0y;
          t.d = t.dx = t.dy = 1;
        } else {
          let t1 = e.touches[1];
          let t1x = t1.clientX - rect.left;
          let t1y = t1.clientY - rect.top;

          let xMin = Math.min(t0x, t1x);
          let yMin = Math.min(t0y, t1y);
          let xMax = Math.max(t0x, t1x);
          let yMax = Math.max(t0y, t1y);

          // midpts
          t.y = (yMin + yMax) / 2;
          t.x = (xMin + xMax) / 2;

          t.dx = xMax - xMin;
          t.dy = yMax - yMin;

          // dist
          t.d = Math.sqrt(t.dx * t.dx + t.dy * t.dy);
        }
      }

      let rafPending = false;

      function zoom() {
        rafPending = false;

        let left = to.x;

        let xFactor = fr.dx / to.dx;
        let leftPct = left / rect.width;

        let nxRange = oxRange * xFactor;
        let nxMin = xVal - leftPct * nxRange;
        let nxMax = nxMin + nxRange;

        const plots: uPlot[] = uPlot.sync(u.cursor.sync.key).plots;

        plots.forEach((plot) => {
          plot.setScale("x", {
            min: u.scales.x.min > nxMin ? u.scales.x.min : nxMin,
            max: u.scales.x.max < nxMax ? u.scales.x.max : nxMax,
          });
        });
      }

      function touchmove(e) {
        storePos(to, e);

        if (!rafPending) {
          rafPending = true;
          requestAnimationFrame(zoom);
        }
      }

      over.addEventListener("touchstart", function (e) {
        rect = over.getBoundingClientRect();

        storePos(fr, e);

        oxRange = u.scales.x.max - u.scales.x.min;
        oyRange = u.scales.y.max - u.scales.y.min;

        let left = fr.x;
        let top = fr.y;

        xVal = u.posToVal(left, "x");
        yVal = u.posToVal(top, "y");

        document.addEventListener("touchmove", touchmove, { passive: true });
      });

      over.addEventListener("touchend", function (e) {
        document.removeEventListener("touchmove", touchmove, { passive: true });
      });
    }

    return {
      hooks: {
        init,
      },
    };
  }
}
