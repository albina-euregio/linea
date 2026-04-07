import "./observations-chart";
import "./danger-rating-altitude-chart";
import "./danger-rating-distribution";
import css from "./aws-stats-wrapper.css?raw";
import { Observations } from "./datastore";
import { fetchSMET } from "../data/smet-data";
import { StationData } from "../data/station-data";
import type { AbstractChart } from "./abstract-chart";
import { AwsStatsExportModal } from "./aws-stats-export-modal";
import { i18n } from "../i18n";

export function parseDateBoundary(date: string | null, isEnd: boolean): number | null {
  if (!date) return null;
  const suffix = isEnd ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const timestamp = Date.parse(`${date}${suffix}`);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function filterWeatherByDate(
  result: StationData,
  startDate: string | null,
  endDate: string | null,
): StationData {
  // FIXME use StationData.filter

  const start = parseDateBoundary(startDate, false);
  const end = parseDateBoundary(endDate, true);

  if (start == null && end == null) {
    return result;
  }

  const indices: number[] = [];
  result.timestamps.forEach((timestamp, index) => {
    if ((start == null || timestamp >= start) && (end == null || timestamp <= end)) {
      indices.push(index);
    }
  });

  const filteredValues = Object.fromEntries(
    Object.entries(result.values).map(([key, values]) => [
      key,
      indices.map((index) => values[index]),
    ]),
  ) as StationData["values"];

  return new StationData(
    result.station,
    result.altitude,
    indices.map((index) => result.timestamps[index]),
    result.units,
    filteredValues,
  );
}

export class AwsStats extends HTMLElement {
  readonly exportModal!: AwsStatsExportModal;
  charts: AbstractChart[] = [];

  constructor() {
    super();
    this.exportModal = new AwsStatsExportModal(document.createElement("div"), this);
  }

  connectedCallback() {
    if (!this.getAttribute("chart-type")) {
      console.error("chart-type attribute is required on aws-stats.");
      return;
    }
    this.render();
  }

  async render() {
    const style = document.createElement("style");
    style.textContent = css;
    this.appendChild(style);
    const charttypes = this.getAttribute("chart-type")!.split(",");
    const charts: AbstractChart[] = [];
    for (const charttype of charttypes) {
      charts.push(document.createElement(charttype) as AbstractChart);
    }

    const loader = document.createElement("div");
    loader.className = "aws-loader";
    loader.innerHTML = `
            <div class="spinner"></div>
            <p>Loading data...</p>
        `;
    this.appendChild(loader);

    const loadPromises: Promise<void>[] = [];

    if (this.getAttribute("observations")) {
      loadPromises.push(
        (async () => {
          const results: Observations = new Observations();
          let attr = this.getAttribute("filter-micro-region");
          const filterMicroRegions: string[] = [];
          if (!attr || attr == "all") {
          } else {
            const regions = JSON.parse(attr);
            if (Array.isArray(regions)) {
              filterMicroRegions.push(...regions);
            }
          }
          await results.loadObservations(
            this.getAttribute("observations") || "",
            filterMicroRegions,
          );
          for (const chart of charts) {
            chart.setAttribute("observations", JSON.stringify(results.observations));
          }
        })(),
      );
    }

    if (this.getAttribute("stationsrc")) {
      loadPromises.push(
        (async () => {
          try {
            const result: StationData = await fetchSMET(this.getAttribute("stationsrc") || "");
            const filteredResult = filterWeatherByDate(
              result,
              this.getAttribute("start-date"),
              this.getAttribute("end-date"),
            );
            for (const chart of charts) {
              chart.setAttribute("weather", JSON.stringify(filteredResult));
            }
          } catch (error) {
            console.error("Failed to load weather station data:", error);
          }
        })(),
      );
    }

    if (this.getAttribute("region-code")) {
      loadPromises.push(
        (async () => {
          for (const chart of charts) {
            chart.setAttribute("region-code", this.getAttribute("region-code")!);
          }
        })(),
      );
    }

    if (this.getAttribute("bulletins")) {
      loadPromises.push(
        (async () => {
          for (const chart of charts) {
            chart.setAttribute("bulletins", this.getAttribute("bulletins")!);
          }
        })(),
      );
    }

    if (this.getAttribute("danger-source-variants")) {
      loadPromises.push(
        (async () => {
          for (const chart of charts) {
            chart.setAttribute(
              "danger-source-variants",
              this.getAttribute("danger-source-variants")!,
            );
          }
        })(),
      );
    }

    loadPromises.push(
      (async () => {
        if (this.hasAttribute("virtual-trainings")) {
          for (const chart of charts) {
            chart.setAttribute("virtual-trainings", this.getAttribute("virtual-trainings")!);
          }
        }
        if (this.hasAttribute("field-trainings")) {
          for (const chart of charts) {
            chart.setAttribute("field-trainings", this.getAttribute("field-trainings")!);
          }
        }
        if (this.hasAttribute("start-date")) {
          for (const chart of charts) {
            chart.setAttribute("start-date", this.getAttribute("start-date")!);
          }
        }
        if (this.hasAttribute("end-date")) {
          for (const chart of charts) {
            chart.setAttribute("end-date", this.getAttribute("end-date")!);
          }
        }
        if (this.hasAttribute("blogs")) {
          for (const chart of charts) {
            chart.setAttribute("blogs", this.getAttribute("blogs")!);
          }
        }
        if (this.hasAttribute("filter-micro-region")) {
          for (const chart of charts) {
            chart.setAttribute("filter-micro-region", this.getAttribute("filter-micro-region")!);
          }
        }
      })(),
    );
    await Promise.all(loadPromises);

    // Remove loader and append chart
    loader.remove();

    const menubar = document.createElement("div");
    menubar.className = "menubar";

    const exportBtn = document.createElement("button");
    exportBtn.textContent = i18n.message("linea:controls:value:export");
    exportBtn.addEventListener("click", () => this.exportModal.show());
    menubar.appendChild(exportBtn);
    this.appendChild(menubar);
    this.appendChild(this.exportModal.modal);
    for (const chart of charts) {
      this.appendChild(chart);
      this.charts.push(chart);
    }
  }
}

customElements.define("aws-stats-wrapper", AwsStats);
