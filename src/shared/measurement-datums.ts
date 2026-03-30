import uPlot from "uplot";

enum Mode {
  Delta = "Delta",
  Integral = "Integral",
  Mean = "Mean",
  SeriesMean = "SeriesMean",
}

/**
 *  inspired by https://leeoniya.github.io/uPlot/demos/measure-datums.html
 *  enhanced:
 * - supports two datums to measure delta between them
 * - Integration of parameters over time
 * - Different modes of measurement (delta, integral, mean, series mean)
 *
 * Keybindings:
 * - Click on the chart to move the cursor to set datum '1' (blue) and datum '2' (orange)
 * - Press 'd' to switch to delta mode
 * - Press 'i' to switch to integral mode
 * - Press 'm' to switch to mean mode
 * - Press 's' to switch to series mean mode
 * - Press 'x' to clear datums
 * - Press 'Escape' to clear datums
 */
export class MeasurementDatumPlugin {
  ModeFunctions: Record<
    Mode,
    (dataIdx1: number | null, dataIdx2: number | null, seriesIdx: number | null) => string
  > = {
    [Mode.Delta]: () => `𝚫y: ${(this.y2 - this.y1).toPrecision(3)}`,
    [Mode.Integral]: (dataIdx1, dataIdx2, seriesIdx) =>
      this.integrateSeries(dataIdx1, dataIdx2, seriesIdx),
    [Mode.Mean]: () => `Mean: ${((this.y2 + this.y1) / 2).toPrecision(3)}`,
    [Mode.SeriesMean]: (dataIdx1, dataIdx2, seriesIdx) =>
      this.seriesMean(dataIdx1, dataIdx2, seriesIdx),
  };

  public u: uPlot | null = null;
  public x1: number | null = null;
  public x2: number | null = null;
  public y1: number | null = null;
  public y2: number | null = null;
  public dataIdxs1: (number | null)[] = null;
  public dataIdxs2: (number | null)[] = null;
  public mode: Mode = Mode.Delta;

  public datumsPlugin(): uPlot.Plugin {
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
      this.x1 = this.x2 = this.y1 = this.y2 = null;
      this.dataIdxs1 = this.dataIdxs2 = null;
      u.redraw();
    };

    const drawDelta = (u: uPlot) => {
      let labels = [this.ModeFunctions[this.mode](null, null, null)];

      u.series.forEach((s, i) => {
        if (i == 0) {
          return;
        }
        const idx1 = this.dataIdxs1[i];
        const idx2 = this.dataIdxs2[i];

        if (idx1 == null || idx2 == null) {
          return;
        }

        const seriesY1 = u.data[i][idx1] as number | null;
        const seriesY2 = u.data[i][idx2] as number | null;

        if (seriesY1 == null || seriesY2 == null) {
          return;
        }

        const labelValue = this.ModeFunctions[this.mode](idx1, idx2, i);
        labels.push(`${s.label}: ${labelValue}`);
      });

      const lineHeight = 14;
      let xPos = u.valToPos((this.x1 + this.x2) / 2, "x", true);
      let yPos = u.valToPos((this.y1 + this.y2) / 2, "y", true) - (labels.length / 2) * lineHeight;
      const maxWidth = Math.max(...labels.map((l) => u.ctx.measureText(l).width));
      const padding = 4;
      const rectHeight = labels.length * lineHeight + padding * 2;
      const rectWidth = maxWidth + padding * 2;
      u.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      u.ctx.fillRect(xPos - rectWidth / 2, yPos - padding * 2.5, rectWidth, rectHeight);
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
          this.u = u;
          u.over.tabIndex = -1; // required for key handlers
          u.over.style.outlineWidth = "0"; // prevents yellow input box outline when in focus

          u.over.addEventListener(
            "keydown",
            (e) => {
              if (e.key == "Escape") {
                clearDatums(u);
              } else if (e.key == "x") {
                clearDatums(u);
              } else if (e.key == "m") {
                this.mode = Mode.Mean;
              } else if (e.key == "i") {
                this.mode = Mode.Integral;
              } else if (e.key == "d") {
                this.mode = Mode.Delta;
              } else if (e.key == "s") {
                this.mode = Mode.SeriesMean;
              } else {
                const { left, top } = u.cursor;

                if (left >= 0 && top >= 0) {
                  if (e.key == "1") {
                    this.x1 = u.posToVal(left, "x");
                    this.y1 = u.posToVal(top, "y");
                    this.dataIdxs1 = [...u.cursor.idxs];
                  } else if (e.key == "2") {
                    this.x2 = u.posToVal(left, "x");
                    this.y2 = u.posToVal(top, "y");
                    this.dataIdxs2 = [...u.cursor.idxs];
                  }
                }
              }
              u.redraw();
            },
            true,
          );
        },
        draw: (u: uPlot) => {
          if (this.x1 != null || this.x2 != null) {
            u.ctx.save();

            u.ctx.lineWidth = 2;

            if (this.x1 != null) {
              drawDatum(u, this.x1, this.y1, "blue");
            }

            if (this.x2 != null) {
              drawDatum(u, this.x2, this.y2, "orange");
            }

            if (
              this.x1 != null &&
              this.x2 != null &&
              this.dataIdxs1 != null &&
              this.dataIdxs2 != null
            ) {
              drawDelta(u);
            }

            u.ctx.restore();
          }
        },
      },
    };
  }

  seriesMean(dataIdx1: number | null, dataIdx2: number | null, seriesIdx: number | null): string {
    if (this.u == null) {
      return "SeriesMean: n/a";
    }

    if (dataIdx1 == null || dataIdx2 == null || seriesIdx == null) {
      return `Timerange: ${((this.x2 - this.x1) / 3_600_000).toFixed(1)} h`;
    }
    const dataMinIdx = Math.min(dataIdx1, dataIdx2);
    const dataMaxIdx = Math.max(dataIdx1, dataIdx2);
    const dataSlice = this.u.data[seriesIdx].slice(dataMinIdx, dataMaxIdx + 1) as number[];

    const sum = dataSlice.reduce((acc, val) => acc + val, 0);
    const mean = sum / dataSlice.length;
    return `SeriesMean: ${mean.toFixed(2)}`;
  }

  /**
   * Performs a simple integration with Riemann
   */
  integrateSeries(
    dataIdx1: number | null,
    dataIdx2: number | null,
    seriesIdx: number | null,
  ): string {
    if (this.u == null) {
      return "∫: n/a";
    }

    if (dataIdx1 == null || dataIdx2 == null || seriesIdx == null) {
      return `Timerange: ${((this.x2 - this.x1) / 3_600_000).toFixed(1)} h`;
    }
    const dataMinIdx = Math.min(dataIdx1, dataIdx2);
    const dataMaxIdx = Math.max(dataIdx1, dataIdx2);
    const dataSlice = this.u.data[seriesIdx].slice(dataMinIdx, dataMaxIdx + 1) as number[];

    // Simple numerical integration using the Riemann sum
    let integral = 0;
    for (let i = 1; i < dataSlice.length; i++) {
      const x0 = this.u.data[0][dataMinIdx + i - 1] as number;
      const x1 = this.u.data[0][dataMinIdx + i] as number;
      const y0 = dataSlice[i - 1];
      const y1 = dataSlice[i];
      integral += ((y0 + y1) / 2) * (x1 - x0);
    }
    const integralInHours = integral / 3_600_000;
    return `∫: ${integralInHours.toFixed(3)} unit*h`;
  }
}
