import type uPlot from "uplot";
import { AbstractChart, type PlotInformation } from "./abstract-chart";
import type { DangerSourceVariant, EAWSMatrixInformation } from "./danger-source-data";
import { DangerSourceVariantService } from "./datastore";
import { COLORS } from "./series-options/colorizer";
import {
  opts_danger_rating_series_base,
  opts_danger_source_variants_matrix_parameter_avalanche_size_value,
  opts_danger_source_variants_matrix_parameter_frequency_value,
  opts_danger_source_variants_matrix_parameter_stability_class_value,
} from "./series-options/danger-source-variants-matrix-parameter-opts";

interface DangerRatingDangerSourceVariantPlotInformation extends PlotInformation {
  variants: string[];
  microRegion: string;
}

export class DangerSourceVariantsMatrixParameter extends AbstractChart {
  private dangerSourceVariants: DangerSourceVariant[] = [];
  private matrixParameterKey: keyof EAWSMatrixInformation;
  private opts: uPlot.Options;

  constructor(matrixParameterKey: keyof EAWSMatrixInformation, opts: uPlot.Options) {
    super();
    this.matrixParameterKey = matrixParameterKey;
    this.opts = opts;
  }

  async onConnected(): Promise<void> {
    this.parseBulletins(this.getAttribute("bulletins"));
    this.dangerSourceVariants = this.parseDangerSourceVariants(
      this.getAttribute("danger-source-variants"),
    );
  }

  async render(): Promise<void> {
    const dsv = new DangerSourceVariantService(this.dangerSourceVariants);
    const { timestamps, matrixParameters } =
      dsv.analysis.activeOrDormant.getMatrixParamtersPerDangerSourceVariantPerDay(
        this.filterMicroRegions[0],
      );
    const plotInformation: DangerRatingDangerSourceVariantPlotInformation = {
      data: [
        timestamps,
        ...Object.values(matrixParameters).map((matrices) =>
          matrices.map((matrix) => matrix[this.matrixParameterKey] || null),
        ),
      ] as uPlot.AlignedData,
      variants: Object.keys(matrixParameters),
      microRegion: this.filterMicroRegions[0],
    };
    this.plotInformation = plotInformation;
    this.plotData(plotInformation);
  }

  plotData(plotInformation: DangerRatingDangerSourceVariantPlotInformation): void {
    this.createPlot(
      {
        ...this.opts,
        title: `${this.opts.title} – ${this.filterMicroRegions[0]}`,
      },
      [plotInformation.data[0]],
    );
    Object.entries(plotInformation.data.slice(1)).forEach(([_variantId, rating], index) => {
      this.addSeries(
        {
          ...opts_danger_rating_series_base,
          stroke: COLORS[index % COLORS.length],
          label: plotInformation.variants[index],
        },
        rating as number[],
      );
    });
  }
}

class DangerSourceVariantsMatrixParameterFrequency extends DangerSourceVariantsMatrixParameter {
  constructor() {
    super("frequencyValue", opts_danger_source_variants_matrix_parameter_frequency_value);
  }
}

class DangerSourceVariantsMatrixParameterAvalancheSize extends DangerSourceVariantsMatrixParameter {
  constructor() {
    super("avalancheSizeValue", opts_danger_source_variants_matrix_parameter_avalanche_size_value);
  }
}

class DangerSourceVariantsMatrixParameterSnowpackStability extends DangerSourceVariantsMatrixParameter {
  constructor() {
    super(
      "snowpackStabilityValue",
      opts_danger_source_variants_matrix_parameter_stability_class_value,
    );
  }
}

customElements.define(
  "aws-danger-source-variants-matrix-parameter-avalanche-size",
  DangerSourceVariantsMatrixParameterAvalancheSize,
);

customElements.define(
  "aws-danger-source-variants-matrix-parameter-frequency",
  DangerSourceVariantsMatrixParameterFrequency,
);

customElements.define(
  "aws-danger-source-variants-matrix-parameter-stability",
  DangerSourceVariantsMatrixParameterSnowpackStability,
);
