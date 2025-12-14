const ms = 1,
  s = ms * 1e3,
  m = s * 60,
  h = m * 60,
  d = h * 24,
  y = d * 365;

export const timeAxis: uPlot.Axis = {
  values: [
    [y, "{YYYY}", null, null, null, null, null, null, 1],
    [d * 28, "{MMM}", "\n{YYYY}", null, null, null, null, null, 1], // Shows month as Jan, Feb, May, etc.
    [d, "{DD}. {MMM}", "\n{YYYY}", null, null, null, null, null, 1], // e.g. 29. May
    [h, "{HH}:{mm}", "\n{DD}. {MMM} {YY}", null, "\n{DD}. {MMM}", null, null, null, 1],
    [m, "{HH}:{mm}", "\n{DD}. {MMM} {YY}", null, "\n{DD}. {MMM}", null, null, null, 1],
    [
      s,
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
