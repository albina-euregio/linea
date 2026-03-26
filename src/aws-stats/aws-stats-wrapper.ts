import "./observations-chart";
import "./danger-rating-altitude-chart";
import "./danger-rating-distribution";
import css from "./aws-stats-wrapper.css?raw";
import { BulletinData, Observations } from "./datastore";
import { fetchSMET } from "../data/smet-data";
import { StationData } from "../data/station-data";
import type { AbstractChart } from "./abstract-chart";
import type { Bulletin } from "../schema/caaml";

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

class AwsStats extends HTMLElement {
  constructor() {
    super();
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
          await results.loadObservations(this.getAttribute("observations") || "");
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

    if (this.getAttribute("bulletin-urls")) {
      loadPromises.push(
        (async () => {
          try {
            const bulletinUrls = this.getAttribute("bulletin-urls")
              ? JSON.parse(this.getAttribute("bulletin-urls")!)
              : [];
            const bulletinData: Bulletin[] = [];

            for (const url of bulletinUrls) {
              const bulletins = await BulletinData.loadBulletins(
                url,
                this.getAttribute("start-date")!,
                this.getAttribute("end-date")!,
              );
              bulletinData.push(...bulletins);
            }

            const bulletins = new BulletinData(bulletinData);
            for (const chart of charts) {
              chart.setAttribute(
                "bulletins",
                JSON.stringify(
                  this.getAttribute("bulletin-filter-micro-region") != "all"
                    ? bulletins.filterForMicroRegions(
                        JSON.parse(this.getAttribute("bulletin-filter-micro-region")!),
                      ).bulletins
                    : bulletinData,
                ),
              );
              chart.setAttribute(
                "bulletin-filter-micro-region",
                this.getAttribute("bulletin-filter-micro-region") ?? "",
              );
            }
          } catch (error) {
            console.error("Failed to load bulletin data:", error);
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
        if (this.hasAttribute("blog-urls")) {
          for (const chart of charts) {
            chart.setAttribute("blog-urls", this.getAttribute("blog-urls")!);
          }
        }
      })(),
    );
    await Promise.all(loadPromises);

    // Remove loader and append chart
    loader.remove();
    for (const chart of charts) {
      this.appendChild(chart);
    }
  }
}

customElements.define("aws-stats-wrapper", AwsStats);
