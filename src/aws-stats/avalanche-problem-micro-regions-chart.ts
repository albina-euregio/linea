import uPlot, { type Plugin } from "uplot";
import { AbstractChart, type PlotInformation } from "./abstract-chart";
import { BulletinData } from "./datastore";
import { opts_avalanche_problem_micro_regions } from "./series-options/avalanche-problem-micro-regions-opts";
import { i18n, type messagesEN_t } from "../i18n";
import { colorForPercentage } from "./series-options/colorizer";
import type { AvalancheProblemType } from "../schema/caaml";

interface AvalancheProblemPlotInformation extends PlotInformation {
  range: uPlot.Scale.Range;
  splits: number[];
  values: string[];
}

export class AvalancheProblemMicroRegionsChart extends AbstractChart {
  static readonly avalancheProblemTypes: AvalancheProblemType[] = [
    "persistent_weak_layers",
    "new_snow",
    "wind_slab",
    "wet_snow",
    "gliding_snow",
    "cornices",
    "no_distinct_avalanche_problem",
  ];

  async onConnected(): Promise<void> {
    this.parseBulletins(this.getAttribute("bulletins"));
  }

  async render(): Promise<void> {
    if (this.plot) {
      this.plot.destroy();
      this.plot = null;
    }
    if (this.container) {
      this.container.remove();
    }

    const bulletinData = new BulletinData(this.bulletins);
    const avalancheProblems = bulletinData.affectedMicroRegionsPerAvalancheProblemPerDay();
    console.log(avalancheProblems);

    const data: number[][] = [];
    const splits: number[] = [];
    const values: string[] = [];
    let counter = 0;
    AvalancheProblemMicroRegionsChart.avalancheProblemTypes.forEach((problemType) => {
      if (avalancheProblems.ratings[problemType].filter((v) => !!v || v !== 0).length == 0) {
        return;
      }
      values.push(
        i18n.message(
          `linea:yearly:avalancheproblemmicroregions:series:${problemType}` as messagesEN_t,
        ),
      );
      splits.push(++counter);
      data.push(avalancheProblems.ratings[problemType]);
    });
    console.log("AvalancheProblemMicroRegionsChart - data prepared for plotting", {
      splits,
      values,
      data,
    });
    const pi = {
      range: [0.5, splits[splits.length - 1] + 0.5],
      splits: splits,
      values: values,
      data: [avalancheProblems.timestamps, ...data] as uPlot.AlignedData,
    } as AvalancheProblemPlotInformation;

    this.plotInformation = pi;
    this.plotData(pi);
  }

  plotData(plotInformation: AvalancheProblemPlotInformation): void {
    const opts: uPlot.Options = {
      ...opts_avalanche_problem_micro_regions,
      plugins: [
        ...(opts_avalanche_problem_micro_regions.plugins ?? []),
        this.avalancheProblemPlugin,
      ],
    };
    opts.scales!.y.range = plotInformation.range;
    opts.axes[1].splits = plotInformation.splits;
    opts.axes[1].values = plotInformation.splits.map((_split) => "");
    // opts.axes[1].values = plotInformation.values;
    this.createPlot(opts, plotInformation.data);
  }

  avalancheProblemPlugin: Plugin = {
    hooks: {
      draw: (u: uPlot) => {
        const { ctx } = u;
        const xData = u.data[0] as number[];

        ctx.save();
        ctx.beginPath();
        ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
        ctx.clip();

        for (let xi = 0; xi < xData.length; xi++) {
          const xPos = Math.round(u.valToPos(xData[xi], "x", true));

          for (let avalancheProblem = 1; avalancheProblem <= 8; avalancheProblem++) {
            const problemSeries = u.data[avalancheProblem] as (number | null)[];
            const percentage = problemSeries?.[xi] ?? 0;
            if (!percentage || Number.isNaN(percentage)) {
              continue;
            }

            ctx.fillStyle = colorForPercentage(percentage);

            const xEnd = Math.round(u.valToPos(xData[xi] + 24 * 60 * 60 * 1000, "x", true));
            const yPos = Math.round(u.valToPos(avalancheProblem - 0.5, "y", true));
            const yEnd = Math.round(u.valToPos(avalancheProblem + 0.5, "y", true));

            ctx.fillRect(xPos, yEnd, xEnd - xPos, yPos - yEnd);
          }
        }

        ctx.restore();

        const barWidth = 12;
        const barHeight = u.bbox.height - 2;
        const barX = Math.round(u.bbox.left + u.bbox.width + 30 - barWidth - 8);
        const barY = Math.round(u.bbox.top + 2);
        const gradient = ctx.createLinearGradient(0, barY + barHeight, 0, barY);

        gradient.addColorStop(0, colorForPercentage(0));
        gradient.addColorStop(0.5, colorForPercentage(50));
        gradient.addColorStop(1, colorForPercentage(100));

        ctx.save();
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, barWidth, barHeight);

        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = "#333";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("100%", barX + barWidth + 6, barY);
        ctx.textBaseline = "middle";
        ctx.fillText("50%", barX + barWidth + 6, barY + barHeight / 2);
        ctx.textBaseline = "bottom";
        ctx.fillText("0%", barX + barWidth + 6, barY + barHeight);
        ctx.restore();
      },
    },
  };
}

customElements.define("aws-avalanche-problem-micro-regions", AvalancheProblemMicroRegionsChart);
