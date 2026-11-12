import uPlot from "uplot";
import { i18n } from "../i18n";

enum Mode {
  Delta = "Delta",
  Integral = "Integral",
  Median = "Median",
  Mean = "SeriesMean",
  Min = "Min",
  Max = "Max",
}

const modeByKey: Record<string, Mode | undefined> = {
  d: Mode.Delta,
  i: Mode.Integral,
  m: Mode.Median,
  s: Mode.Mean,
  k: Mode.Min,
  l: Mode.Max,
};

/**
 * The x value (timestamp) of the data point under the cursor, or `null` if the cursor is outside of the plot.
 */
function cursorX(u: uPlot | null): number | null {
  const idx = u?.cursor.idx;
  if (u == null || idx == null || (u.cursor.left ?? -1) < 0) {
    return null;
  }
  return u.data[0][idx] ?? null;
}

/**
 * The analyzer selection shared by all plots of one view (e.g. all stations of the station view).
 *
 * The borders are stored as x values (timestamps) and not as data indices: the data of a plot is
 * replaced whenever the date range changes, and synced plots of different stations have different
 * timestamps, so each plot resolves the indices from its own data when drawing.
 */
export class MeasurementSelection {
  x1: number | null = null;
  x2: number | null = null;
  mode: Mode = Mode.Delta;
  isKeyboardSelection: boolean = false;
  readonly #plots = new Set<uPlot>();
  /** the plot the mouse was over last, its cursor determines the borders set by keyboard */
  #activePlot: uPlot | null = null;

  register(u: uPlot) {
    this.#plots.add(u);
    u.over.addEventListener("mouseenter", () => (this.#activePlot = u), { passive: true });
  }

  unregister(u: uPlot) {
    this.#plots.delete(u);
    if (this.#activePlot === u) {
      this.#activePlot = null;
    }
  }

  /**
   * Handles the analyzer keybindings, see {@link MeasurementDatesPlugin}.
   *
   * @returns `true` if the event was consumed, i.e. a border was set with the cursor inside a plot
   */
  handleKeyEvent(e: KeyboardEvent): boolean {
    const hasBorder = this.x1 != null || this.x2 != null;
    const mode = modeByKey[e.key];
    if (e.key == "Escape" || e.key == "x") {
      if (hasBorder) {
        this.clear();
      }
      // don't consume, Escape also closes other popups
      return false;
    } else if (mode) {
      this.mode = mode;
      if (hasBorder) {
        this.redraw();
      }
      return true;
    } else if (e.key == "1" || e.key == "2") {
      const x = cursorX(this.#activePlot);
      if (x == null) {
        // not over a plot, leave the key to the date range shortcuts
        return false;
      }
      this.isKeyboardSelection = true;
      if (e.key == "1") {
        this.x1 = x;
      } else {
        this.x2 = x;
      }
      this.redraw();
      return true;
    }
    return false;
  }

  clear() {
    this.x1 = this.x2 = null;
    this.isKeyboardSelection = false;
    this.redraw();
  }

  redraw() {
    for (const u of this.#plots) {
      u.redraw(false, false);
    }
  }
}

/**
 *  inspired by https://leeoniya.github.io/uPlot/demos/measure-datums.html
 *  enhanced:
 * - supports two datums to measure delta between them
 * - Integration of parameters over time
 * - Different modes of measurement (delta, integral, mean, series mean)
 *
 * Keybindings, handled by {@link MeasurementSelection.handleKeyEvent} via the key listener of `linea-plot`:
 * - Ctrl + drag to select a time range
 * - Press '1' (red) or '2' (blue) to set a border at the cursor
 * - Press 'd' for delta, 'i' for integral, 'm' for median, 's' for mean, 'k' for min and 'l' for max
 * - Press 'x' or 'Escape' to clear the borders
 */
export class MeasurementDatesPlugin {
  private readonly modeFunctions: Record<
    Mode,
    (dataIdx1: number | null, dataIdx2: number | null, seriesIdx: number | null) => string
  > = {
    [Mode.Delta]: (dataIdx1, dataIdx2, seriesIdx) => this.delta(dataIdx1, dataIdx2, seriesIdx),
    [Mode.Integral]: (dataIdx1, dataIdx2, seriesIdx) =>
      this.integrateSeries(dataIdx1, dataIdx2, seriesIdx),
    [Mode.Median]: (dataIdx1, dataIdx2, seriesIdx) => this.median(dataIdx1, dataIdx2, seriesIdx),
    [Mode.Mean]: (dataIdx1, dataIdx2, seriesIdx) => this.mean(dataIdx1, dataIdx2, seriesIdx),
    [Mode.Min]: (dataIdx1, dataIdx2, seriesIdx) => this.min(dataIdx1, dataIdx2, seriesIdx),
    [Mode.Max]: (dataIdx1, dataIdx2, seriesIdx) => this.max(dataIdx1, dataIdx2, seriesIdx),
  };

  private u: uPlot | null = null;
  private isDragging: boolean = false;
  private tooltip: HTMLTableSectionElement | null = null;
  private tooltipTable: HTMLTableElement | null = null;
  private select: HTMLSelectElement | null = null;
  private helpModal: HTMLDivElement | null = null;

  constructor(private readonly selection: MeasurementSelection) {}

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
    [Mode.Median]: {
      formula: `${i18n.message("linea:measurement-dates:median")} = med(y₁...yₙ)`,
      keybinding: "m",
    },
    [Mode.Mean]: {
      formula: `${i18n.message("linea:measurement-dates:mean")} = (y₁ + ... + yₙ) / n`,
      keybinding: "s",
    },
    [Mode.Min]: {
      formula: `${i18n.message("linea:measurement-dates:min")} = min(y₁...yₙ)`,
      keybinding: "k",
    },
    [Mode.Max]: {
      formula: `${i18n.message("linea:measurement-dates:max")} = max(y₁...yₙ)`,
      keybinding: "l",
    },
  };

  private updateSelectValue() {
    if (!this.select) {
      return;
    }
    this.select.value = this.selection.mode;
  }

  private drawDelta(x1: number, x2: number) {
    const xs = this.u.data[0];
    if (xs.length === 0 || Math.max(x1, x2) < xs[0] || Math.min(x1, x2) > xs[xs.length - 1]) {
      // the selection lies outside of the currently loaded data of this plot
      this.hideTooltip();
      return;
    }
    // resolve the indices from the data of this plot, see MeasurementSelection
    const idx1 = this.u.valToIdx(x1);
    const idx2 = this.u.valToIdx(x2);

    let cxleft = this.u.valToPos(Math.min(x1, x2), "x", true);
    let cxright = this.u.valToPos(Math.max(x1, x2), "x", true);

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
        seriesLabel: i18n.message("linea:measurement-dates:timerange"),
        value: i18n.number((x2 - x1) / 3_600_000, {
          style: "unit",
          unit: "hour",
        }),
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

      const seriesY1 = this.u.data[i][idx1] as number | null;
      const seriesY2 = this.u.data[i][idx2] as number | null;

      if (seriesY1 == null || seriesY2 == null) {
        return;
      }
      const labelValue = this.modeFunctions[this.selection.mode](idx1, idx2, i);
      let color = "#00000000";
      if (typeof s.stroke === "string") {
        color = s.stroke;
      } else if (typeof s.stroke === "function") {
        const c = s.stroke(this.u, i);
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
          this.selection.register(u);

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
          this.select.style.height = "20px";
          this.select.style.boxSizing = "border-box";
          this.select.style.padding = "1px 3px";
          this.select.style.alignmentBaseline = "middle";
          this.select.style.cursor = "pointer";

          Object.values(Mode).forEach((mode) => {
            const option = document.createElement("option");
            option.value = mode;
            option.textContent = MeasurementDatesPlugin.modeLabel(mode);
            this.select.appendChild(option);
          });

          this.select.value = this.selection.mode;
          this.select.addEventListener("change", (e) => {
            const newMode = (e.target as HTMLSelectElement).value as Mode;
            this.selection.mode = newMode;
            this.selection.redraw();
          });
          headerContainer.appendChild(this.select);

          // Close button
          const closeAnalyzerBtn = document.createElement("button");
          closeAnalyzerBtn.textContent = "×";
          closeAnalyzerBtn.classList.add("toggle-btn");
          closeAnalyzerBtn.style.borderRadius = "0px";
          closeAnalyzerBtn.style.borderLeftWidth = "0px";
          closeAnalyzerBtn.style.height = "20px";
          closeAnalyzerBtn.style.boxSizing = "border-box";
          headerContainer.appendChild(closeAnalyzerBtn);

          // Help button
          const helpBtn = document.createElement("button");
          helpBtn.classList.add("toggle-btn");
          helpBtn.style.borderTopLeftRadius = "0px";
          helpBtn.style.borderBottomLeftRadius = "0px";
          helpBtn.style.borderLeftWidth = "0px";
          helpBtn.style.height = "20px";
          helpBtn.style.boxSizing = "border-box";
          helpBtn.textContent = "?";
          headerContainer.appendChild(helpBtn);

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
          this.helpModal = helpModal;
          const modalHost = (u.root.closest("linea-plot") as HTMLElement | null) ?? u.root;
          modalHost.appendChild(helpModal);

          closeAnalyzerBtn.addEventListener("click", () => {
            this.selection.clear();
          });

          helpBtn.addEventListener("click", () => {
            helpModal.style.display = "flex";
          });

          helpModal.addEventListener("click", (e) => {
            if (e.target === helpModal) {
              helpModal.style.display = "none";
            }
          });

          headerCell.appendChild(headerContainer);
          headerRow.appendChild(headerCell);
          thead.appendChild(headerRow);

          this.tooltip = legend.createTBody();
          u.root.insertBefore(legend, u.root.lastChild);

          u.over.addEventListener("mousedown", (e: MouseEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.button === 0) {
              u.cursor.drag.x = false; // disable default zooming behavior when dragging with ctrl
              this.isDragging = true;
              this.selection.isKeyboardSelection = false;
              const x = cursorX(this.u);
              if (x != null) {
                this.selection.x1 = x;
              }
            }
          });

          u.over.addEventListener(
            "mousemove",
            (e: MouseEvent) => {
              if (this.isDragging && (e.ctrlKey || e.metaKey)) {
                const x = cursorX(this.u);
                if (x != null && x !== this.selection.x2) {
                  this.selection.x2 = x;
                  this.selection.redraw();
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
        },
        draw: (u: uPlot) => {
          const { x1, x2, isKeyboardSelection } = this.selection;
          if (x1 == null && x2 == null) {
            this.hideTooltip();
            return;
          }
          u.ctx.save();
          u.ctx.lineWidth = 2;

          if (isKeyboardSelection) {
            if (x1 != null) {
              MeasurementDatesPlugin.drawDatumLine(u, x1, "#fd0000");
            }
            if (x2 != null) {
              MeasurementDatesPlugin.drawDatumLine(u, x2, "#0026ff");
            }
          }

          if (x1 != null && x2 != null) {
            this.updateSelectValue();
            this.drawDelta(x1, x2);
          } else {
            this.hideTooltip();
          }

          u.ctx.restore();
        },
        destroy: (u: uPlot) => {
          this.selection.unregister(u);
          this.helpModal?.remove();
          this.helpModal = null;
          this.u = null;
        },
      },
    };
  }

  private hideTooltip() {
    if (this.tooltipTable) {
      this.tooltipTable.style.display = "none";
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

  median(dataIdx1: number | null, dataIdx2: number | null, seriesIdx: number | null): string {
    if (this.u == null) {
      return "n/a";
    }
    const dataMinIdx = Math.min(dataIdx1, dataIdx2);
    const dataMaxIdx = Math.max(dataIdx1, dataIdx2);
    const values = this.u.data[seriesIdx]
      .slice(dataMinIdx, dataMaxIdx + 1)
      .filter((v): v is number => v != null)
      .sort((a, b) => a - b);

    if (values.length === 0) {
      return "n/a";
    }

    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
    const unit = MeasurementDatesPlugin.resolveUnit(this.u.series[seriesIdx].label as string);
    return `${i18n.number(median, {}, unit)}`;
  }

  mean(dataIdx1: number | null, dataIdx2: number | null, seriesIdx: number | null): string {
    if (this.u == null) {
      return "n/a";
    }
    const dataMinIdx = Math.min(dataIdx1, dataIdx2);
    const dataMaxIdx = Math.max(dataIdx1, dataIdx2);
    const dataSlice = Array.from(this.u.data[seriesIdx].slice(dataMinIdx, dataMaxIdx + 1)).filter(
      (v): v is number => v != null,
    );
    if (dataSlice.length === 0) {
      return "n/a";
    }

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
    const dataSlice = Array.from(this.u.data[seriesIdx].slice(dataMinIdx, dataMaxIdx + 1)).filter(
      (v): v is number => v != null,
    );
    if (dataSlice.length === 0) {
      return "n/a";
    }

    const min = dataSlice.reduce((a, b) => Math.min(a, b));
    const unit = MeasurementDatesPlugin.resolveUnit(this.u.series[seriesIdx].label as string);
    return `${i18n.number(min, {}, unit)}`;
  }

  max(dataIdx1: number | null, dataIdx2: number | null, seriesIdx: number | null): string {
    if (this.u == null) {
      return "n/a";
    }
    const dataMinIdx = Math.min(dataIdx1, dataIdx2);
    const dataMaxIdx = Math.max(dataIdx1, dataIdx2);
    const dataSlice = Array.from(this.u.data[seriesIdx].slice(dataMinIdx, dataMaxIdx + 1)).filter(
      (v): v is number => v != null,
    );
    if (dataSlice.length === 0) {
      return "n/a";
    }

    const max = dataSlice.reduce((a, b) => Math.max(a, b));
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
    const dataSlice = this.u.data[seriesIdx].slice(dataMinIdx, dataMaxIdx + 1);

    // Simple numerical integration using the Riemann sum
    const seriesLabel = this.u.series[seriesIdx].label as string;
    const isPSUM = seriesLabel == i18n.message("linea:parameter:PSUM");
    let integral = 0;
    if (isPSUM) {
      for (let i = 1; i < dataSlice.length; i++) {
        const y0 = dataSlice[i - 1];
        const y1 = dataSlice[i];
        if (y0 == null || y1 == null) {
          continue;
        }

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
        if (y0 == null || y1 == null) {
          continue;
        }
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
      case Mode.Median:
        return i18n.message("linea:measurement-dates:median");
      case Mode.Mean:
        return i18n.message("linea:measurement-dates:mean");
      case Mode.Integral:
        return i18n.message("linea:measurement-dates:integral");
      case Mode.Min:
        return i18n.message("linea:measurement-dates:min");
      case Mode.Max:
        return i18n.message("linea:measurement-dates:max");
      default:
        return mode;
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

  static integrateUnit(
    integratedValue: number,
    unit: AnalyzerUnit | "",
  ): [number, AnalyzerIntegratedUnit] {
    switch (unit) {
      case "°C":
        return [integratedValue, "℃ h"];
      case "km∕h":
        return [integratedValue, "km"]; // convert km∕h * h = km to m
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

  static resolveUnit(seriesLabel: string): AnalyzerUnit | "" {
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
export type AnalyzerUnit =
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
export type AnalyzerIntegratedUnit =
  | "km"
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
