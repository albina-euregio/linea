import uPlot from "uplot";
import { i18n } from "../i18n";

enum Mode {
  Delta = "Delta",
  Integral = "Integral",
  Mean = "Mean",
  SeriesMean = "SeriesMean",
  Min = "Min",
  "Max" = "Max",
}

/**
 *  inspired by https://leeoniya.github.io/uPlot/demos/measure-datums.html
 *  enhanced:
 * - supports two datums to measure delta between them
 * - Integration of parameters over time
 * - Different modes of measurement (delta, integral, mean, series mean)
 *
 * Keybindings:
 * - Click on the chart to move the cursor to set border '1' (blue) and border '2' (orange)
 * - Press 'd' to switch to delta mode
 * - Press 'i' to switch to integral mode
 * - Press 'm' to switch to mean mode
 * - Press 's' to switch to series mean mode
 * - Press 'x' to clear datums
 * - Press 'Escape' to clear datums
 */
export class MeasurementDatesPlugin {
  ModeFunctions: Record<
    Mode,
    (dataIdx1: number | null, dataIdx2: number | null, seriesIdx: number | null) => string
  > = {
    [Mode.Delta]: (dataIdx1, dataIdx2, seriesIdx) => this.delta(dataIdx1, dataIdx2, seriesIdx),
    [Mode.Integral]: (dataIdx1, dataIdx2, seriesIdx) =>
      this.integrateSeries(dataIdx1, dataIdx2, seriesIdx),
    [Mode.Mean]: (dataIdx1, dataIdx2, seriesIdx) => this.mean(dataIdx1, dataIdx2, seriesIdx),
    [Mode.SeriesMean]: (dataIdx1, dataIdx2, seriesIdx) =>
      this.seriesMean(dataIdx1, dataIdx2, seriesIdx),
    [Mode.Min]: (dataIdx1, dataIdx2, seriesIdx) => this.min(dataIdx1, dataIdx2, seriesIdx),
    [Mode.Max]: (dataIdx1, dataIdx2, seriesIdx) => this.max(dataIdx1, dataIdx2, seriesIdx),
  };

  public u: uPlot | null = null;
  public syncKey: string | null = null;
  private isDragging: boolean = false;
  public static x1: number | null = null;
  public static x2: number | null = null;
  public static y1: number | null = null;
  public static y2: number | null = null;
  public static dataIdxs1: (number | null)[] = null;
  public static dataIdxs2: (number | null)[] = null;
  public static mode: Mode = Mode.Delta;
  public static isKeyboardSelection: boolean = false;
  public mode: Mode = Mode.Delta;

  public plugin(): uPlot.Plugin {
    const drawDatumLine = (u: uPlot, x: number, color: string) => {
      let cx = u.valToPos(x, "x", true);

      u.ctx.strokeStyle = color;
      u.ctx.beginPath();

      const top = u.bbox.top;
      const bottom = u.bbox.top + u.bbox.height;
      u.ctx.moveTo(cx, bottom);
      u.ctx.lineTo(cx, top);

      u.ctx.stroke();
    };

    const clearDatums = (u: uPlot) => {
      for (const u0 of uPlot.sync(u.cursor.sync.key).plots) {
        MeasurementDatesPlugin.x1 =
          MeasurementDatesPlugin.x2 =
          MeasurementDatesPlugin.y1 =
          MeasurementDatesPlugin.y2 =
            null;
        MeasurementDatesPlugin.dataIdxs1 = MeasurementDatesPlugin.dataIdxs2 = null;
        u0.redraw();
      }
    };

    const drawDelta = (u: uPlot) => {
      let cxleft = u.valToPos(
        Math.min(MeasurementDatesPlugin.x1, MeasurementDatesPlugin.x2),
        "x",
        true,
      );
      let cxright = u.valToPos(
        Math.max(MeasurementDatesPlugin.x1, MeasurementDatesPlugin.x2),
        "x",
        true,
      );

      u.ctx.fillStyle = "#c0c0c038";
      u.ctx.beginPath();

      const top = u.bbox.top;
      const bottom = u.bbox.top + u.bbox.height;
      u.ctx.moveTo(cxleft, bottom);
      u.ctx.lineTo(cxright, top);
      u.ctx.fillRect(cxleft, top, cxright - cxleft, bottom - top);

      let title = "";
      switch (MeasurementDatesPlugin.mode) {
        case Mode.Delta:
          title = i18n.message("linea:measurement-dates:delta");
          break;
        case Mode.Mean:
          title = i18n.message("linea:measurement-dates:mean");
          break;
        case Mode.SeriesMean:
          title = i18n.message("linea:measurement-dates:seriesmean");
          break;
        case Mode.Integral:
          title = i18n.message("linea:measurement-dates:integral");
          break;
        case Mode.Min:
          title = i18n.message("linea:measurement-dates:min");
          break;
        case Mode.Max:
          title = i18n.message("linea:measurement-dates:max");
          break;
      }
      let labels = [
        title,
        `Timerange: ${((MeasurementDatesPlugin.x2 - MeasurementDatesPlugin.x1) / 3_600_000).toFixed(1)} h`,
      ];

      u.series.forEach((s, i) => {
        if (
          i == 0 ||
          s.label == i18n.message("linea:parameter:SH:potential") ||
          s.label == i18n.message("linea:parameter:snowcover")
        ) {
          return;
        }

        const idx1 = MeasurementDatesPlugin.dataIdxs1[i];
        const idx2 = MeasurementDatesPlugin.dataIdxs2[i];

        if (idx1 == null || idx2 == null) {
          return;
        }

        const seriesY1 = u.data[i][idx1] as number | null;
        const seriesY2 = u.data[i][idx2] as number | null;

        if (seriesY1 == null || seriesY2 == null) {
          return;
        }
        const labelValue = this.ModeFunctions[MeasurementDatesPlugin.mode](idx1, idx2, i);
        labels.push(`${s.label}: ${labelValue}`);
      });

      const lineHeight = 14;
      let xPos = u.valToPos((MeasurementDatesPlugin.x1 + MeasurementDatesPlugin.x2) / 2, "x", true);
      let yPos =
        u.valToPos((MeasurementDatesPlugin.y1 + MeasurementDatesPlugin.y2) / 2, "y", true) -
        (labels.length / 2) * lineHeight;
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
          this.syncKey = u.cursor.sync.key;
          u.over.tabIndex = -1; // required for key handlers
          u.over.style.outlineWidth = "0"; // prevents yellow input box outline when in focus

          u.over.addEventListener("mousedown", (e: MouseEvent) => {
            if (e.ctrlKey && e.button === 0) {
              u.cursor.drag.x = false; // disable default zooming behavior when dragging with ctrl
              this.isDragging = true;
              MeasurementDatesPlugin.isKeyboardSelection = false;
              const { left, top } = u.cursor;
              if (left >= 0 && top >= 0) {
                MeasurementDatesPlugin.x1 = u.posToVal(left, "x");
                MeasurementDatesPlugin.y1 = u.posToVal(top, "y");
                MeasurementDatesPlugin.dataIdxs1 = [...u.cursor.idxs];
              }
            }
          });

          u.over.addEventListener(
            "mousemove",
            (e: MouseEvent) => {
              if (this.isDragging && e.ctrlKey) {
                const { left, top } = u.cursor;
                if (left >= 0 && top >= 0) {
                  MeasurementDatesPlugin.x2 = u.posToVal(left, "x");
                  MeasurementDatesPlugin.y2 = u.posToVal(top, "y");
                  MeasurementDatesPlugin.dataIdxs2 = [...u.cursor.idxs];
                  // Redraw all synced plots
                  if (this.syncKey) {
                    for (const u0 of uPlot.sync(this.syncKey).plots) {
                      u0.redraw();
                    }
                  } else {
                    u.redraw();
                  }
                }
              }
            },
            { passive: true },
          );

          u.over.addEventListener(
            "mouseup",
            () => {
              if (this.isDragging) {
                this.isDragging = false;
                setTimeout(() => {
                  u.cursor.drag.x = true; // re-enable default zooming behavior after dragging
                }, 100);
              }
            },
            { passive: true },
          );

          u.over.addEventListener(
            "keydown",
            (e) => {
              if (e.key == "Escape") {
                clearDatums(u);
              } else if (e.key == "x") {
                clearDatums(u);
              } else if (e.key == "m") {
                MeasurementDatesPlugin.mode = Mode.Mean;
                this.mode = Mode.Mean;
              } else if (e.key == "i") {
                MeasurementDatesPlugin.mode = Mode.Integral;
                this.mode = Mode.Integral;
              } else if (e.key == "d") {
                MeasurementDatesPlugin.mode = Mode.Delta;
                this.mode = Mode.Delta;
              } else if (e.key == "s") {
                MeasurementDatesPlugin.mode = Mode.SeriesMean;
                this.mode = Mode.SeriesMean;
              } else if (e.key == "k") {
                MeasurementDatesPlugin.mode = Mode.Min;
                this.mode = Mode.Min;
              } else if (e.key == "l") {
                MeasurementDatesPlugin.mode = Mode.Max;
                this.mode = Mode.Max;
              } else {
                const { left, top } = u.cursor;

                if (left >= 0 && top >= 0) {
                  if (e.key == "1") {
                    MeasurementDatesPlugin.isKeyboardSelection = true;
                    MeasurementDatesPlugin.x1 = u.posToVal(left, "x");
                    MeasurementDatesPlugin.y1 = u.posToVal(top, "y");
                    MeasurementDatesPlugin.dataIdxs1 = [...u.cursor.idxs];
                  } else if (e.key == "2") {
                    MeasurementDatesPlugin.isKeyboardSelection = true;
                    MeasurementDatesPlugin.x2 = u.posToVal(left, "x");
                    MeasurementDatesPlugin.y2 = u.posToVal(top, "y");
                    MeasurementDatesPlugin.dataIdxs2 = [...u.cursor.idxs];
                  }
                }
              }

              // Redraw all synced plots
              if (this.syncKey) {
                for (const u0 of uPlot.sync(this.syncKey).plots) {
                  u0.redraw();
                }
              } else {
                u.redraw();
              }
            },
            true,
          );
        },
        draw: (u: uPlot) => {
          if (MeasurementDatesPlugin.x1 != null || MeasurementDatesPlugin.x2 != null) {
            u.ctx.save();

            u.ctx.lineWidth = 2;

            if (MeasurementDatesPlugin.isKeyboardSelection) {
              if (MeasurementDatesPlugin.x1 != null) {
                drawDatumLine(u, MeasurementDatesPlugin.x1, "#fd0000");
              }

              if (MeasurementDatesPlugin.x2 != null) {
                drawDatumLine(u, MeasurementDatesPlugin.x2, "#0026ff");
              }
            }

            if (
              MeasurementDatesPlugin.x1 != null &&
              MeasurementDatesPlugin.x2 != null &&
              MeasurementDatesPlugin.dataIdxs1 != null &&
              MeasurementDatesPlugin.dataIdxs2 != null
            ) {
              drawDelta(u);
            }

            u.ctx.restore();
          }
        },
      },
    };
  }

  delta(dataIdx1: number | null, dataIdx2: number | null, seriesIdx: number | null): string {
    if (this.u == null) {
      return "Δy: n/a";
    }
    const unit = MeasurementDatesPlugin.resolveUnit(this.u.series[seriesIdx].label as string);
    const value = this.u.data[seriesIdx][dataIdx2] - this.u.data[seriesIdx][dataIdx1];
    return `Δy: ${i18n.number(value, {}, unit)}`;
  }

  mean(dataIdx1: number | null, dataIdx2: number | null, seriesIdx: number | null): string {
    if (this.u == null) {
      return "n/a";
    }
    const unit = MeasurementDatesPlugin.resolveUnit(this.u.series[seriesIdx].label as string);
    const value = (this.u.data[seriesIdx][dataIdx1] + this.u.data[seriesIdx][dataIdx2]) / 2;
    return `${i18n.number(value, {}, unit)}`;
  }

  seriesMean(dataIdx1: number | null, dataIdx2: number | null, seriesIdx: number | null): string {
    if (this.u == null) {
      return "n/a";
    }
    const dataMinIdx = Math.min(dataIdx1, dataIdx2);
    const dataMaxIdx = Math.max(dataIdx1, dataIdx2);
    const dataSlice = this.u.data[seriesIdx].slice(dataMinIdx, dataMaxIdx + 1) as number[];

    const sum = dataSlice.reduce((acc, val) => acc + val, 0);
    const mean = sum / dataSlice.length;
    const unit = MeasurementDatesPlugin.resolveUnit(this.u.series[seriesIdx].label as string);
    return `${i18n.number(mean, {}, unit)}`;
  }

  min(dataIdx1: number | null, dataIdx2: number | null, seriesIdx: number | null): string {
    if (this.u == null) {
      return "n/a";
    }
    const dataMinIdx = Math.min(dataIdx1, dataIdx2);
    const dataMaxIdx = Math.max(dataIdx1, dataIdx2);
    const dataSlice = this.u.data[seriesIdx].slice(dataMinIdx, dataMaxIdx + 1) as number[];

    const min = Math.min(...dataSlice.filter((v): v is number => v != null));
    const unit = MeasurementDatesPlugin.resolveUnit(this.u.series[seriesIdx].label as string);
    return `${i18n.number(min, {}, unit)}`;
  }

  max(dataIdx1: number | null, dataIdx2: number | null, seriesIdx: number | null): string {
    if (this.u == null) {
      return "n/a";
    }
    const dataMinIdx = Math.min(dataIdx1, dataIdx2);
    const dataMaxIdx = Math.max(dataIdx1, dataIdx2);
    const dataSlice = this.u.data[seriesIdx].slice(dataMinIdx, dataMaxIdx + 1) as number[];

    const max = Math.max(...dataSlice.filter((v): v is number => v != null));
    const unit = MeasurementDatesPlugin.resolveUnit(this.u.series[seriesIdx].label as string);
    return `${i18n.number(max, {}, unit)}`;
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
    const dataMinIdx = Math.min(dataIdx1, dataIdx2);
    const dataMaxIdx = Math.max(dataIdx1, dataIdx2);
    const dataSlice = this.u.data[seriesIdx].slice(dataMinIdx, dataMaxIdx + 1) as number[];

    // Simple numerical integration using the Riemann sum
    const seriesLabel = this.u.series[seriesIdx].label as string;
    const isPSUM = seriesLabel == i18n.message("linea:parameter:PSUM");
    let integral = 0;
    if (isPSUM) {
      for (let i = 1; i < dataSlice.length; i++) {
        const y0 = dataSlice[i - 1];
        const y1 = dataSlice[i];

        // PSUM already stores accumulated precipitation since 07:00 local time.
        // Sum positive increments; when the series resets, continue from current value.
        const diff = y1 - y0;
        integral += diff >= 0 ? diff : y1;
      }
    } else {
      for (let i = 1; i < dataSlice.length; i++) {
        const x0 = this.u.data[0][dataMinIdx + i - 1] as number;
        const x1 = this.u.data[0][dataMinIdx + i] as number;
        const y0 = dataSlice[i - 1];
        const y1 = dataSlice[i];
        integral += ((y0 + y1) / 2) * (x1 - x0);
      }
    }

    const integralValue = isPSUM ? integral : integral / 3_600_000;
    const unit = MeasurementDatesPlugin.resolveUnit(seriesLabel);
    const [number, integratedUnit] = MeasurementDatesPlugin.integrateUnit(integralValue, unit);
    return `∫: ${i18n.number(number, {}, integratedUnit)}`;
  }

  static integrateUnit(integratedValue: number, unit: Unit | ""): [number, IntegratedUnits] {
    switch (unit) {
      case "°C":
        return [integratedValue, "℃ h"];
      case "km∕h":
        return [integratedValue * 1000, "m"]; // convert km∕h * h = km to m
      case "%":
        return [integratedValue, "% h"];
      case "W∕m²":
        return [Math.round(integratedValue * 3600 * 1e-6), "MJ∕m²"]; // convert W/m² * h to MJ/m²
      case "°":
        return [integratedValue, "° h"];
      case "":
        return [integratedValue, "days"];
      case "mm":
        return [integratedValue, "mm"];
      case "cm":
        return [integratedValue, "cm h"];
      default:
        return [integratedValue, "h"];
    }
  }

  static resolveUnit(seriesLabel: string): Unit | "" {
    if (
      seriesLabel == i18n.message("linea:parameter:TA") ||
      seriesLabel == i18n.message("linea:parameter:TD") ||
      seriesLabel == i18n.message("linea:parameter:TSS") ||
      seriesLabel == i18n.message("linea:parameter:TEMP") ||
      seriesLabel == i18n.message("linea:parameter:TEMP_min") ||
      seriesLabel == i18n.message("linea:parameter:TEMP_max") ||
      seriesLabel == i18n.message("linea:parameter:TEMP_median")
    ) {
      return "°C";
    } else if (
      seriesLabel == i18n.message("linea:parameter:VW") ||
      seriesLabel == i18n.message("linea:parameter:VW_MAX")
    ) {
      return "km∕h";
    } else if (seriesLabel == i18n.message("linea:parameter:RH")) {
      return "%";
    } else if (seriesLabel == i18n.message("linea:parameter:ISWR")) {
      return "W∕m²";
    } else if (seriesLabel == i18n.message("linea:parameter:DW")) {
      return "°";
    } else if (seriesLabel == i18n.message("linea:parameter:NS")) {
      return "cm";
    } else if (seriesLabel == i18n.message("linea:parameter:DATAPOINTS:amount")) {
      return "";
    } else if (seriesLabel == i18n.message("linea:parameter:PSUM")) {
      return "mm";
    } else if (
      seriesLabel == i18n.message("linea:parameter:HS") ||
      seriesLabel == i18n.message("linea:parameter:HS_max") ||
      seriesLabel == i18n.message("linea:parameter:HS_min") ||
      seriesLabel == i18n.message("linea:parameter:HS_median")
    ) {
      return "cm";
    } else {
      return "1";
    }
  }
}
type Unit =
  // temperature
  | "K"
  | "°C"
  // length
  | "m"
  | "cm"
  | "mm"
  // 1
  | "1"
  | "%"
  | "°"
  // speed
  | "m∕s"
  | "km∕h"
  // intensity (power per area)
  | "W∕m²";
type IntegratedUnits =
  | "m"
  | "°h"
  | "℃ h"
  | "% h"
  | "MJ∕m²"
  | "cm h"
  | "mm"
  | "h"
  | "m h"
  | "days"
  | "° h";
