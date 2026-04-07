import uPlot from "uplot";
import { i18n } from "../i18n";

enum Mode {
  Delta = "Delta",
  Integral = "Integral",
  Mean = "Mean",
  SeriesMean = "SeriesMean",
  Min = "Min",
  Max = "Max",
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
  private readonly modeFunctions: Record<
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

  private u: uPlot | null = null;
  private syncKey: string | null = null;
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
  private tooltip: HTMLTableSectionElement | null = null;
  private tooltipTable: HTMLTableElement | null = null;
  private select: HTMLSelectElement | null = null;

  // Helper object with mode information: formula and keybinding
  private readonly modeInfo: Record<Mode, { formula: string; keybinding: string }> = {
    [Mode.Delta]: {
      formula: "Δy = y₂ - y₁",
      keybinding: "d",
    },
    [Mode.Integral]: {
      formula: "∫ = ∑(y₁ + y₂)/2 × Δx",
      keybinding: "i",
    },
    [Mode.Mean]: {
      formula: "Mean = (y₁ + y₂) / 2",
      keybinding: "m",
    },
    [Mode.SeriesMean]: {
      formula: "Mean = (∑y) / n",
      keybinding: "s",
    },
    [Mode.Min]: {
      formula: "Min = min(y₁...yₙ)",
      keybinding: "k",
    },
    [Mode.Max]: {
      formula: "Max = max(y₁...yₙ)",
      keybinding: "l",
    },
  };

  private updateSelectValue() {
    if (!this.select) {
      return;
    }
    this.select.value = MeasurementDatesPlugin.mode;
  }

  private drawDelta() {
    let cxleft = this.u.valToPos(
      Math.min(MeasurementDatesPlugin.x1, MeasurementDatesPlugin.x2),
      "x",
      true,
    );
    let cxright = this.u.valToPos(
      Math.max(MeasurementDatesPlugin.x1, MeasurementDatesPlugin.x2),
      "x",
      true,
    );

    this.u.ctx.fillStyle = "#c0c0c038";
    this.u.ctx.beginPath();

    const top = this.u.bbox.top;
    const bottom = this.u.bbox.top + this.u.bbox.height;
    this.u.ctx.moveTo(cxleft, bottom);
    this.u.ctx.fillRect(cxleft, top, cxright - cxleft, bottom - top);
    this.u.ctx.strokeStyle = "#696363fd";
    this.u.ctx.lineWidth = 0.5;
    this.u.ctx.strokeRect(cxleft, top, cxright - cxleft, bottom - top);

    let labels: { seriesLabel: string; value: string; color: string }[] = [
      {
        seriesLabel: `Timerange`,
        value: `${((MeasurementDatesPlugin.x2 - MeasurementDatesPlugin.x1) / 3_600_000).toFixed(1)} h`,
        color: "#00000000",
      },
    ];
    this.u.series.forEach((s, i) => {
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

      const seriesY1 = this.u.data[i][idx1] as number | null;
      const seriesY2 = this.u.data[i][idx2] as number | null;

      if (seriesY1 == null || seriesY2 == null) {
        return;
      }
      const labelValue = this.modeFunctions[MeasurementDatesPlugin.mode](idx1, idx2, i);
      let color = "#00000000";
      if (typeof s.stroke === "string") {
        color = s.stroke;
      } else if (typeof s.stroke === "function") {
        const c = s.stroke(this.u, i + 1);
        if (typeof c === "string") color = c;
      }
      labels.push({ seriesLabel: `${s.label}`, value: labelValue, color });
    });
    if (!this.tooltip || !this.tooltipTable) {
      return;
    }

    this.tooltip.innerHTML = "";
    this.tooltipTable.style.display = "table";
    labels.forEach((label) => {
      const row = document.createElement("tr");
      row.classList.add("u-series");

      const th = document.createElement("th");
      const marker = document.createElement("div");
      marker.classList.add("u-marker");
      marker.style.backgroundColor = label.color;
      th.appendChild(marker);

      const labelDiv = document.createElement("div");
      labelDiv.classList.add("u-label");
      labelDiv.textContent = `${label.seriesLabel}:`;
      th.appendChild(labelDiv);
      row.appendChild(th);

      const td = document.createElement("td");
      td.classList.add("u-value");
      td.textContent = label.value;
      td.style.display = "inline-block";
      row.appendChild(td);

      this.tooltip.appendChild(row);
    });
  }

  public plugin(): uPlot.Plugin {
    return {
      hooks: {
        init: (u: uPlot) => {
          this.u = u;
          this.syncKey = u.cursor.sync.key;
          u.over.tabIndex = -1; // required for key handlers
          u.over.style.outlineWidth = "0"; // prevents yellow input box outline when in focus

          const legend = document.createElement("table");
          legend.classList.add("u-legend");
          legend.classList.add("u-inline");
          legend.style.borderBottom = "2px solid rgb(221, 221, 221)";
          legend.style.display = "none"; // Hide by default
          this.tooltipTable = legend;

          // Create header section with combobox and help button
          const thead = legend.createTHead();
          const headerRow = document.createElement("tr");

          const headerCell = document.createElement("th");
          headerCell.style.padding = "8px";
          headerCell.style.textAlign = "left";
          headerCell.colSpan = 2;

          const headerContainer = document.createElement("div");
          headerContainer.style.display = "flex";
          headerContainer.style.alignItems = "center";
          headerContainer.style.gap = "0px";

          // Combobox
          this.select = document.createElement("select");
          this.select.classList.add("toggle-btn");
          this.select.style.borderTopRightRadius = "0px";
          this.select.style.borderBottomRightRadius = "0px";
          this.select.style.padding = "2px 4px";
          this.select.style.cursor = "pointer";

          Object.values(Mode).forEach((mode) => {
            const option = document.createElement("option");
            option.value = mode;
            option.textContent = MeasurementDatesPlugin.modeLabel(mode);
            this.select.appendChild(option);
          });

          this.select.value = MeasurementDatesPlugin.mode;
          this.select.addEventListener("change", (e) => {
            const newMode = (e.target as HTMLSelectElement).value as Mode;
            MeasurementDatesPlugin.mode = newMode;
            this.redraw();
          });

          headerContainer.appendChild(this.select);

          // Help button
          const helpBtn = document.createElement("button");
          helpBtn.classList.add("toggle-btn");
          helpBtn.style.borderTopLeftRadius = "0px";
          helpBtn.style.borderBottomLeftRadius = "0px";
          helpBtn.style.borderLeftWidth = "0px";
          helpBtn.style.padding = "2px 4px";
          helpBtn.textContent = "?";

          // Help modal
          const helpModal = document.createElement("div");
          helpModal.style.position = "fixed";
          helpModal.style.top = "0";
          helpModal.style.left = "0";
          helpModal.style.width = "100%";
          helpModal.style.height = "100%";
          helpModal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
          helpModal.style.display = "none";
          helpModal.style.alignItems = "center";
          helpModal.style.justifyContent = "center";
          helpModal.style.zIndex = "10000";

          const modalContent = document.createElement("div");
          modalContent.style.backgroundColor = "white";
          modalContent.style.padding = "20px";
          modalContent.style.maxHeight = "80vh";
          modalContent.style.overflowY = "auto";
          modalContent.style.maxWidth = "900px";

          const modalTitle = document.createElement("h3");
          modalTitle.textContent = i18n.message("linea:measurement-dates:usage:title");
          modalTitle.style.marginTop = "0";
          modalContent.appendChild(modalTitle);

          const escapeHint = document.createElement("p");
          escapeHint.innerHTML = `<strong>${i18n.message("linea:measurement-dates:usage:exit")}:</strong> ${i18n.message("linea:measurement-dates:usage:keybinding:press")} <kbd style="background: #f0f0f0; padding: 2px 4px; border-radius: 2px; font-family: monospace;">Escape</kbd>`;
          modalContent.appendChild(escapeHint);

          Object.entries(this.modeInfo).forEach(([mode, info]) => {
            const modeContainer = document.createElement("div");
            modeContainer.style.marginBottom = "16px";
            modeContainer.style.paddingBottom = "12px";
            modeContainer.style.borderBottom = "1px solid #eee";

            const modeTitle = document.createElement("strong");
            modeTitle.textContent = `${MeasurementDatesPlugin.modeLabel(mode)}`;
            modeTitle.style.display = "block";
            modeTitle.style.marginBottom = "4px";

            const formula = document.createElement("div");
            formula.style.fontFamily = "monospace";
            formula.style.fontSize = "12px";
            formula.style.backgroundColor = "#f5f5f5";
            formula.style.padding = "6px";
            formula.style.borderRadius = "3px";
            formula.style.marginBottom = "4px";
            formula.textContent = info.formula;

            const keybinding = document.createElement("div");
            keybinding.style.fontSize = "12px";
            keybinding.style.color = "#666";
            keybinding.innerHTML = `<strong>${i18n.message("linea:measurement-dates:usage:keybinding")}:</strong> ${i18n.message("linea:measurement-dates:usage:keybinding:press")} <kbd style="background: #f0f0f0; padding: 2px 4px; border-radius: 2px; font-family: monospace;">${info.keybinding}</kbd>`;

            modeContainer.appendChild(modeTitle);
            modeContainer.appendChild(formula);
            modeContainer.appendChild(keybinding);
            modalContent.appendChild(modeContainer);
          });

          const closeBtn = document.createElement("button");
          closeBtn.textContent = "Close";
          closeBtn.style.marginTop = "16px";
          closeBtn.style.padding = "8px 16px";
          closeBtn.style.borderRadius = "4px";
          closeBtn.style.border = "1px solid #ccc";
          closeBtn.style.cursor = "pointer";
          closeBtn.style.backgroundColor = "#f0f0f0";
          closeBtn.addEventListener("click", () => {
            helpModal.style.display = "none";
          });
          modalContent.appendChild(closeBtn);

          helpModal.appendChild(modalContent);
          document.body.appendChild(helpModal);

          helpBtn.addEventListener("click", () => {
            helpModal.style.display = "flex";
          });

          helpModal.addEventListener("click", (e) => {
            if (e.target === helpModal) {
              helpModal.style.display = "none";
            }
          });

          headerContainer.appendChild(helpBtn);
          headerCell.appendChild(headerContainer);
          headerRow.appendChild(headerCell);
          thead.appendChild(headerRow);

          this.tooltip = legend.createTBody();
          u.root.insertBefore(legend, u.root.lastChild);

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
                  this.redraw();
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
                MeasurementDatesPlugin.clearDatums(u);
              } else if (e.key == "x") {
                MeasurementDatesPlugin.clearDatums(u);
              } else if (e.key == "m") {
                MeasurementDatesPlugin.mode = Mode.Mean;
                this.updateSelectValue();
              } else if (e.key == "i") {
                MeasurementDatesPlugin.mode = Mode.Integral;
                this.updateSelectValue();
              } else if (e.key == "d") {
                MeasurementDatesPlugin.mode = Mode.Delta;
                this.updateSelectValue();
              } else if (e.key == "s") {
                MeasurementDatesPlugin.mode = Mode.SeriesMean;
                this.updateSelectValue();
              } else if (e.key == "k") {
                MeasurementDatesPlugin.mode = Mode.Min;
                this.updateSelectValue();
              } else if (e.key == "l") {
                MeasurementDatesPlugin.mode = Mode.Max;
                this.updateSelectValue();
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
              this.redraw();
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
                MeasurementDatesPlugin.drawDatumLine(u, MeasurementDatesPlugin.x1, "#fd0000");
              }

              if (MeasurementDatesPlugin.x2 != null) {
                MeasurementDatesPlugin.drawDatumLine(u, MeasurementDatesPlugin.x2, "#0026ff");
              }
            }

            if (
              MeasurementDatesPlugin.x1 != null &&
              MeasurementDatesPlugin.x2 != null &&
              MeasurementDatesPlugin.dataIdxs1 != null &&
              MeasurementDatesPlugin.dataIdxs2 != null
            ) {
              this.updateSelectValue();
              this.drawDelta();
            }

            u.ctx.restore();
          } else {
            if (this.tooltipTable) {
              this.tooltipTable.style.display = "none";
            }
          }
        },
      },
    };
  }

  redraw() {
    if (this.syncKey) {
      for (const u0 of uPlot.sync(this.syncKey).plots) {
        u0.redraw();
      }
    } else {
      this.u.redraw();
    }
  }

  delta(dataIdx1: number | null, dataIdx2: number | null, seriesIdx: number | null): string {
    if (this.u == null) {
      return "n/a";
    }
    const unit = MeasurementDatesPlugin.resolveUnit(this.u.series[seriesIdx].label as string);
    const value = this.u.data[seriesIdx][dataIdx2] - this.u.data[seriesIdx][dataIdx1];
    return `${i18n.number(value, {}, unit)}`;
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

  private static modeLabel(mode: string): string {
    switch (mode) {
      case Mode.Delta:
        return i18n.message("linea:measurement-dates:delta");
      case Mode.Mean:
        return i18n.message("linea:measurement-dates:mean");
      case Mode.SeriesMean:
        return i18n.message("linea:measurement-dates:seriesmean");
      case Mode.Integral:
        return i18n.message("linea:measurement-dates:integral");
      case Mode.Min:
        return i18n.message("linea:measurement-dates:min");
      case Mode.Max:
        return i18n.message("linea:measurement-dates:max");
      default:
        return MeasurementDatesPlugin.mode;
    }
  }

  private static drawDatumLine = (u: uPlot, x: number, color: string) => {
    let cx = u.valToPos(x, "x", true);

    u.ctx.strokeStyle = color;
    u.ctx.beginPath();

    const top = u.bbox.top;
    const bottom = u.bbox.top + u.bbox.height;
    u.ctx.moveTo(cx, bottom);
    u.ctx.lineTo(cx, top);

    u.ctx.stroke();
  };

  private static clearDatums = (u: uPlot) => {
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
