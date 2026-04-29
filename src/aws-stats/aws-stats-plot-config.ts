export type AwsstatsDatatype =
  | "observations"
  | "bulletins"
  | "danger-source-variants"
  | "weather"
  | "blogs"
  | "field-trainings"
  | "virtual-trainings"
  | "stress-level"
  | "danger-rating-reference";

export interface AwsstatsPlotConfig {
  id: string;
  parameters: AwsstatsDatatype[];
  describtion: string;
  regions: "all" | "userRegion";
  microRegionCountRange: [number, number];
  supportsFilteringBy: "micro-region" | "region" | "both" | "none";
}

export const CONFIGURED_PLOTS: {
  awsstats: AwsstatsPlotConfig[];
  yearlystats: AwsstatsPlotConfig[];
} = {
  awsstats: [
    {
      id: "aws-danger-rating",
      parameters: ["bulletins"],
      describtion:
        "Plot showing the highest danger rating of the bulletin per day for the selected micro-regions.",
      regions: "all",
      microRegionCountRange: [1, Infinity],
      supportsFilteringBy: "micro-region",
    },
    {
      id: "aws-danger-rating-altitude",
      parameters: ["bulletins"],
      describtion:
        "Plot showing the distribution of the danger ratings with altitude for one micro-region as a heatmap.",
      regions: "all",
      microRegionCountRange: [1, 1],
      supportsFilteringBy: "micro-region",
    },
    {
      id: "aws-danger-rating-danger-source-variants",
      parameters: ["danger-source-variants"],
      describtion: "Plot showing the danger rating of danger source variants for one micro-region.",
      regions: "all",
      microRegionCountRange: [1, 1],
      supportsFilteringBy: "micro-region",
    },
    {
      id: "aws-danger-source-variants-matrix-parameter-stability",
      parameters: ["danger-source-variants"],
      describtion:
        "Plot showing the snowpack stability slider value of danger source variants for one micro-region.",
      regions: "all",
      microRegionCountRange: [1, 1],
      supportsFilteringBy: "micro-region",
    },
    {
      id: "aws-danger-source-variants-matrix-parameter-frequency",
      parameters: ["danger-source-variants"],
      describtion:
        "Plot showing the frequency slider value of danger source variants for one micro-region.",
      regions: "all",
      microRegionCountRange: [1, 1],
      supportsFilteringBy: "micro-region",
    },
    {
      id: "aws-danger-source-variants-matrix-parameter-avalanche-size",
      parameters: ["danger-source-variants"],
      describtion:
        "Plot showing the avalanche size slider value of danger source variants for one micro-region.",
      regions: "all",
      microRegionCountRange: [1, 1],
      supportsFilteringBy: "micro-region",
    },
    {
      id: "aws-avalanche-activity-index",
      parameters: ["observations"],
      describtion: "Plot showing the avalanche activity index for all observations.",
      regions: "all",
      microRegionCountRange: [0, 0],
      supportsFilteringBy: "none",
    },
    {
      id: "aws-observations",
      parameters: ["observations", "weather"],
      describtion:
        "Plot showing the number of avalanches and observations per day for all observations. If weather data is available, the daily precipitation is also shown.",
      regions: "all",
      microRegionCountRange: [0, 0],
      supportsFilteringBy: "none",
    },
  ],
  yearlystats: [
    {
      id: "aws-danger-rating-micro-regions",
      parameters: ["bulletins"],
      describtion:
        "Plot showing the distribution of the highest danger rating per day between all micro regions in the selected region. They are shown as lines.",
      regions: "all",
      microRegionCountRange: [0, 0],
      supportsFilteringBy: "region",
    },
    {
      id: "aws-danger-rating-micro-regions-bars",
      parameters: ["bulletins"],
      describtion:
        "Plot showing the distribution of the highest danger rating per day between all micro regions in the selected region. They are shown as stacked bars.",
      regions: "all",
      microRegionCountRange: [0, 0],
      supportsFilteringBy: "region",
    },
    {
      id: "aws-danger-pattern-micro-regions",
      parameters: ["bulletins"],
      describtion:
        "Plot showing the distribution of the danger patterns between all micro regions. They are shown as a heatmap.",
      regions: "all",
      microRegionCountRange: [0, Infinity],
      supportsFilteringBy: "none",
    },
    {
      id: "aws-avalanche-problem-micro-regions",
      parameters: ["bulletins"],
      describtion:
        "Plot showing the distribution of the avalanche problems between all micro regions. They are shown as a heatmap.",
      regions: "all",
      microRegionCountRange: [0, Infinity],
      supportsFilteringBy: "none",
    },
    {
      id: "aws-products",
      parameters: ["bulletins", "blogs", "field-trainings", "virtual-trainings"],
      describtion:
        "Plot showing the number of bulletins, blogs, field trainings and virtual trainings per day for the selected region. The data is shown as stacked bars.",
      regions: "all",
      microRegionCountRange: [0, 0],
      supportsFilteringBy: "region",
    },
    {
      id: "aws-stress-level",
      parameters: ["bulletins", "stress-level"],
      describtion: "Plot showing the forecasters stress level per day for the region of the user.",
      regions: "userRegion",
      microRegionCountRange: [0, 0],
      supportsFilteringBy: "region",
    },
    {
      id: "aws-danger-rating-distribution",
      parameters: ["bulletins", "danger-rating-reference"],
      describtion:
        "Counts all danger ratings of each bulletin of and shows the distribution as bar chart. So if there is an altitude dependend danger rating, it counts each seperate. It's NOT using only the highest danger rating.",
      regions: "all",
      microRegionCountRange: [0, 0],
      supportsFilteringBy: "region",
    },
  ],
};
