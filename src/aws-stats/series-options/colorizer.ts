// TODO: Define a nicer color cycle
export const COLORS = [
  "#4108e6",
  "#dd0841e6",
  "#1b7a35e6",
  "#db08dde6",
  "#07d7e6",
  "#dd0861e6",
  "#6108dde6",
];

export const colorForPercentage = (percentage: number): string => {
  const alpha = Math.max(0.2, Math.min(1, percentage / 100));
  return `rgba(65, 8, 230, ${alpha})`;
};
