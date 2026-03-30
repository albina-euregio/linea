import uPlot from "uplot";
/**
 *  inspired by https://leeoniya.github.io/uPlot/demos/measure-datums.html
 *  enhanced:
 * - supports two datums to measure delta between them
 * - Integration of parameters over time
 */
export class MeasurementDatumPlugin {
  public static datumsPlugin() {
    let x1: number | null = null;
    let x2: number | null = null;
    let y1: number | null = null;
    let y2: number | null = null;
    let dataIdxs1: (number | null)[] = null;
    let dataIdxs2: (number | null)[] = null;

    const drawDatum = (u: uPlot, x: number, y: number, color: string) => {
      let cx = u.valToPos(x, "x", true);
      let cy = u.valToPos(y, "y", true);
      let rad = 10;

      u.ctx.strokeStyle = color;
      u.ctx.beginPath();

      u.ctx.arc(cx, cy, rad, 0, 2 * Math.PI);

      u.ctx.moveTo(cx - rad - 5, cy);
      u.ctx.lineTo(cx + rad + 5, cy);
      u.ctx.moveTo(cx, cy - rad - 5);
      u.ctx.lineTo(cx, cy + rad + 5);

      u.ctx.stroke();
    };

    const clearDatums = (u: uPlot) => {
      x1 = x2 = y1 = y2 = null;
      dataIdxs1 = dataIdxs2 = null;
      u.redraw();
    };

    const drawDelta = (u: uPlot) => {
      let labels = [`𝚫y: ${(y2 - y1).toPrecision(3)}`];

      u.series.forEach((s, i) => {
        if (i == 0) {
          return;
        }
        const idx1 = dataIdxs1[i];
        const idx2 = dataIdxs2[i];

        if (idx1 == null || idx2 == null) {
          return;
        }

        const seriesY1 = u.data[i][idx1] as number | null;
        const seriesY2 = u.data[i][idx2] as number | null;

        if (seriesY1 == null || seriesY2 == null) {
          return;
        }

        const integral = ((seriesY2 - seriesY1) * (x2 - x1)) / 3600_000;
        labels.push(`${s.label}: ${integral.toPrecision(3)}`);
      });

      const lineHeight = 14;
      let xPos = u.valToPos((x1 + x2) / 2, "x", true);
      let yPos = u.valToPos((y1 + y2) / 2, "y", true) - (labels.length / 2) * lineHeight;
      const maxWidth = Math.max(...labels.map((l) => u.ctx.measureText(l).width));
      const padding = 4;
      const rectHeight = labels.length * lineHeight + padding * 2;
      const rectWidth = maxWidth + padding * 2;
      u.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      u.ctx.fillRect(xPos - rectWidth / 2, yPos - padding, rectWidth, rectHeight);
      u.ctx.textAlign = "center";
      u.ctx.textBaseline = "middle";
      u.ctx.fillStyle = "black";
      labels.forEach((label, index) => {
        u.ctx.fillText(label, xPos, yPos + index * lineHeight);
      });
    };

    return {
      hooks: {
        init: (u: uPlot) => {
          u.over.tabIndex = -1; // required for key handlers
          u.over.style.outlineWidth = "0"; // prevents yellow input box outline when in focus

          u.over.addEventListener(
            "keydown",
            (e) => {
              if (e.key == "Escape") {
                clearDatums(u);
              } else {
                const { left, top } = u.cursor;

                if (left >= 0 && top >= 0) {
                  if (e.key == "1") {
                    x1 = u.posToVal(left, "x");
                    y1 = u.posToVal(top, "y");
                    dataIdxs1 = [...u.cursor.idxs];
                    u.redraw();
                  } else if (e.key == "2") {
                    x2 = u.posToVal(left, "x");
                    y2 = u.posToVal(top, "y");
                    dataIdxs2 = [...u.cursor.idxs];
                    u.redraw();
                  }
                }
              }
              if (e.key == "d") {
                clearDatums(u);
              }
            },
            true,
          );
        },
        draw: (u: uPlot) => {
          if (x1 != null || x2 != null) {
            u.ctx.save();

            u.ctx.lineWidth = 2;

            if (x1 != null) {
              drawDatum(u, x1, y1, "blue");
            }

            if (x2 != null) {
              drawDatum(u, x2, y2, "orange");
            }

            if (x1 != null && x2 != null && dataIdxs1 != null && dataIdxs2 != null) {
              drawDelta(u);
            }

            u.ctx.restore();
          }
        },
      },
    };
  }
}
