import { AbstractChart, type PlotInformation } from "./abstract-chart";
import type { Bulletin } from "../schema/caaml";
import uPlot from "uplot";
import { opts_danger_rating_altitude } from "./series-options/danger-rating-altitude-opts";
import type { AwsExportChartConfiguration } from "./aws-stats-export-modal";
import { BulletinData } from "./datastore";

interface DangerRatingAltitudePlotInformation extends PlotInformation {
  minX: number;
  maxX: number;
  maxY: number;
  microRegionName: string;
}

export class DangerRatingAltitudeChart extends AbstractChart {
  async onConnected(): Promise<void> {
    this.parseBulletins(this.getAttribute("bulletins"));
  }

  private parseElevationBound(bound: string | undefined, fallback: number) {
    if (!bound) {
      return fallback;
    }
    if (bound === "treeline") {
      return 1800;
    }
    const parsed = Number(bound);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private normalizeDanger(value: string) {
    const normalized = value.replace("_", " ");
    return normalized;
  }

  async render(): Promise<void> {
    if (this.plot) {
      this.plot.destroy();
      this.plot = null;
    }
    if (this.container) {
      this.container.remove();
    }

    const lowerBound = Number(this.getAttribute("lower-bound") ?? "0");
    const upperBound = Number(this.getAttribute("upper-bound") ?? "3500");

    if (this.bulletins.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "No bulletin data available";
      empty.style.padding = "16px";
      this.appendChild(empty);
      return;
    }

    const bulletinData = new BulletinData(this.bulletins);
    const filteredBulletins = bulletinData.filterForMicroRegions(this.filterMicroRegions).bulletins;

    const byDay = new Map<string, Bulletin>();
    for (const bulletin of filteredBulletins) {
      const dateSource = bulletin.validTime?.endTime;
      if (!dateSource) {
        continue;
      }
      const dayKey = new Date(dateSource).toISOString().split("T")[0];
      if (!byDay.has(dayKey)) {
        byDay.set(dayKey, bulletin);
      }
    }

    const days = Array.from(byDay.keys()).sort();
    const xValues: number[] = [];
    const timeSeries: number[] = [];
    const dangers: string[] = [];
    const layers: Array<{ lowerBound: number; upperBound: number }> = [];

    for (const day of days) {
      const timestamp = new Date(`${day}T00:00:00Z`).getTime();
      const bulletin = byDay.get(day);
      if (!bulletin) {
        continue;
      }

      const ratings = [...(bulletin.dangerRatings ?? [])].sort((a, b) => {
        const aLower = this.parseElevationBound(a.elevation?.lowerBound, lowerBound);
        const bLower = this.parseElevationBound(b.elevation?.lowerBound, lowerBound);
        return aLower - bLower;
      });

      if (ratings.length === 0) {
        xValues.push(timestamp);
        timeSeries.push(timestamp);
        dangers.push("unknown");
        layers.push({ lowerBound, upperBound });
        continue;
      }

      for (const rating of ratings) {
        xValues.push(timestamp);
        timeSeries.push(timestamp);
        dangers.push(this.normalizeDanger(rating.mainValue));
        layers.push({
          lowerBound: this.parseElevationBound(rating.elevation?.lowerBound, lowerBound),
          upperBound: this.parseElevationBound(rating.elevation?.upperBound, upperBound),
        });
      }
    }

    if (xValues.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "No data points to display";
      empty.style.padding = "16px";
      this.appendChild(empty);
      return;
    }

    const data = [
      xValues,
      timeSeries,
      dangers as unknown as number[],
      layers as unknown as number[],
    ] as uPlot.AlignedData;

    this.plotInformation = {
      data,
      minX: Math.min(...xValues),
      maxX: Math.max(...xValues) + 12 * 60 * 60 * 1000,
      maxY: Math.max(...layers.map((l) => l.upperBound)),
      microRegionName:
        bulletinData.regionIdToName(this.filterMicroRegions[0] ?? "") || "Unknown Region",
    } as DangerRatingAltitudePlotInformation;
    this.plotData(this.plotInformation as DangerRatingAltitudePlotInformation);
  }

  plotData(plotInformation: DangerRatingAltitudePlotInformation): void {
    const optsWithRange: uPlot.Options = {
      ...opts_danger_rating_altitude,
      title: `${opts_danger_rating_altitude.title} – ${plotInformation.microRegionName}`,
      scales: {
        x: { time: true, auto: false, range: [plotInformation.minX, plotInformation.maxX] },
        y: { auto: false, range: [0, plotInformation.maxY] },
      },
    };
    const plot = this.createPlot(optsWithRange, plotInformation.data);
    plot.root.addEventListener("dblclick", () => this.resetZoom());
  }

  private resetZoom() {
    if (!this.plot) {
      return;
    }
    const lowerBound = Number(this.getAttribute("lower-bound") ?? "0");
    const upperBound = Number(this.getAttribute("upper-bound") ?? "3500");

    if (this.bulletins.length === 0) {
      return;
    }

    const allTimestamps = this.bulletins
      .map((b) => new Date(b.publicationTime ?? b.validTime?.startTime ?? "").getTime())
      .filter((ts) => !Number.isNaN(ts));

    if (allTimestamps.length === 0) {
      return;
    }

    const minX = Math.min(...allTimestamps) - 12 * 60 * 60 * 1000;
    const maxX = Math.max(...allTimestamps) + 36 * 60 * 60 * 1000;

    this.plot.setScale("x", { min: minX, max: maxX });
    this.plot.setScale("y", { min: lowerBound, max: upperBound });
  }

  get exportConfiguration(): AwsExportChartConfiguration {
    return {
      ...super.exportConfiguration,
      pngLegend: false,
    };
  }
}

customElements.define("aws-danger-rating-altitude", DangerRatingAltitudeChart);
