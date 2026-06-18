export const colors = {
  surface: {
    app: "#0A0A0B",
    raised: "#1C1C1E",
    field: "#2C2C2E",
    barcode: "#FFFFFF"
  },
  text: {
    primary: "#F5F5F7",
    secondary: "#C7C7CC",
    muted: "#8E8E93",
    inverse: "#0A0A0B"
  },
  border: {
    separator: "#38383A"
  },
  action: {
    danger: "#FF453A",
    focus: "#64D2FF"
  },
  overlay: {
    scrim: "rgba(0,0,0,0.55)"
  }
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40
} as const;

export const radius = {
  card: 16,
  barcode: 12,
  field: 10,
  sheet: 14,
  icon: 22
} as const;

export const typography = {
  titleLarge: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "700"
  },
  titleModal: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700"
  },
  bodyPrimary: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400"
  },
  bodyStrong: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600"
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400"
  },
  button: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600"
  }
} as const;
