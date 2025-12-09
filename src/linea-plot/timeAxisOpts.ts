export const timeAxis: uPlot.Axis = {
  values: [
    [31536000, "{YYYY}", null, null, null, null, null, null, 1],
    [2419200, "{MMM}", "\n{YYYY}", null, null, null, null, null, 1], // Shows month as Jan, Feb, May, etc.
    [86400, "{DD}. {MMM}", "\n{YYYY}", null, null, null, null, null, 1], // e.g. 29. May
    [3600, "{HH}:{mm}", "\n{DD}. {MMM} {YY}", null, "\n{DD}. {MMM}", null, null, null, 1],
    [60, "{HH}:{mm}", "\n{DD}. {MMM} {YY}", null, "\n{DD}. {MMM}", null, null, null, 1],
    [
      1,
      ":{ss}",
      "\n{DD}. {MMM} {YY} {HH}:{mm}",
      null,
      "\n{DD}. {MMM} {HH}:{mm}",
      null,
      "\n{HHh}:{mm}",
      null,
      1,
    ],
  ],
  grid: {
    show: false,
  },
};
