import uPlot, { type Plugin } from "uplot";
import { AbstractChart } from "./abstract-chart";
import { BulletinData } from "./datastore";
import { opts_danger_patterns_micro_regions } from "./series-options/danger-pattern-micro-regions-opts";

export class DangerPatternMicroRegionsChart extends AbstractChart {
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
    const dangerPatterns = bulletinData.affectedMicroRegionsPerDangerPatternPerDay();

    const dangerProblemPlugin: Plugin = {
      hooks: {
        draw: (u: uPlot) => {
          const { ctx } = u;
          const xData = u.data[0] as number[];
          const colorForPercentage = (percentage: number): string => {
            const alpha = Math.max(0.2, Math.min(1, percentage / 100));
            return `rgba(65, 8, 230, ${alpha})`;
          };

          ctx.save();
          ctx.beginPath();
          ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
          ctx.clip();

          for (let xi = 0; xi < xData.length; xi++) {
            const xPos = Math.round(u.valToPos(xData[xi], "x", true));

            for (let dangerPattern = 1; dangerPattern <= 10; dangerPattern++) {
              const problemSeries = u.data[dangerPattern] as (number | null)[];
              const percentage = problemSeries?.[xi] ?? 0;
              if (!percentage || Number.isNaN(percentage)) {
                continue;
              }

              ctx.fillStyle = colorForPercentage(percentage);

              const xEnd = Math.round(u.valToPos(xData[xi] + 24 * 60 * 60 * 1000, "x", true));
              const yPos = Math.round(u.valToPos(dangerPattern - 0.5, "y", true));
              const yEnd = Math.round(u.valToPos(dangerPattern + 0.5, "y", true));

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
    const opts: uPlot.Options = {
      ...opts_danger_patterns_micro_regions,
      plugins: [...(opts_danger_patterns_micro_regions.plugins ?? []), dangerProblemPlugin],
    };

    const data: uPlot.AlignedData = [
      dangerPatterns.timestamps,
      ...Object.values(dangerPatterns.ratings),
    ] as uPlot.AlignedData;

    this.createPlot(opts, data);
  }
}

customElements.define("aws-danger-pattern-micro-regions", DangerPatternMicroRegionsChart);
