import { theme, type ThemeConfig } from "antd";

export const trimTrackTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: "#22c55e",
    colorSuccess: "#22c55e",
    colorWarning: "#f59e0b",
    colorError: "#ef4444",
    colorInfo: "#8b5cf6",
    colorBgBase: "#0f1419",
    colorBgContainer: "#1a222d",
    colorBgElevated: "#243040",
    colorBgLayout: "#0f1419",
    colorBorder: "#2e3d52",
    colorBorderSecondary: "#243040",
    colorText: "rgba(255, 255, 255, 0.92)",
    colorTextSecondary: "rgba(255, 255, 255, 0.55)",
    colorTextTertiary: "rgba(255, 255, 255, 0.35)",
    borderRadius: 12,
    borderRadiusLG: 16,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
    fontSize: 15,
    controlHeight: 48,
    controlHeightLG: 56,
    motionDurationMid: "0.2s",
  },
  components: {
    Card: {
      paddingLG: 20,
      colorBgContainer: "#1a222d",
      colorBorderSecondary: "#2e3d52",
    },
    Button: {
      primaryShadow: "0 2px 0 rgba(0, 0, 0, 0.25)",
      fontWeight: 600,
    },
    Input: {
      colorBgContainer: "#1a222d",
      activeBorderColor: "#22c55e",
      hoverBorderColor: "#3d5068",
    },
    Statistic: {
      titleFontSize: 11,
      contentFontSize: 28,
    },
    Segmented: {
      itemSelectedBg: "rgba(34, 197, 94, 0.18)",
      itemSelectedColor: "#4ade80",
      trackBg: "#1a222d",
    },
  },
};
