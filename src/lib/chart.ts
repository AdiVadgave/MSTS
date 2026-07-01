// Shared chart palette — Shell "highway signage" brand.
export const CHART = {
  primary: "#DD1D21", // Shell red
  primarySoft: "#F1A6A8",
  ink: "#1A1712",
  yellow: "#FBCE07",
  yellowDeep: "#F0B800",
  success: "#3FB984",
  warning: "#F0B800",
  danger: "#DD1D21",
  sign: "#1B3A8B",
  slate: "#A79F92",
};

export const STATUS_COLORS: Record<string, string> = {
  active: CHART.success,
  pending: CHART.yellowDeep,
  missing_attributes: CHART.danger,
  deactivated: CHART.slate,
};

export const SERIES = [
  CHART.ink,
  CHART.yellowDeep,
  CHART.success,
  CHART.sign,
  CHART.danger,
  CHART.slate,
];
