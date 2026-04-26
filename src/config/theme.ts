/**
 * theme.ts — Visual design tokens for the React Native app.
 *
 * Uses a dark-first palette inspired by professional audio apps.
 * All values are plain JS — no CSS variables (React Native doesn't support them).
 * Kept intentionally minimal to reduce JS bundle size.
 */

export const COLORS = {
  /** App background — near-black for OLED power savings */
  background: "#0a0a0a",
  /** Elevated surfaces (cards, bottom sheet) */
  surface: "#141414",
  /** Slightly lighter surface for modals / overlays */
  surfaceElevated: "#1e1e1e",
  /** Primary accent — amber/gold for play buttons and highlights */
  primary: "#f59e0b",
  /** Foreground text — near-white */
  text: "#f5f5f5",
  /** Secondary / muted text */
  textMuted: "#8a8a8a",
  /** Disabled state */
  textDisabled: "#444444",
  /** Separator / border */
  border: "#2a2a2a",
  /** Progress bar fill */
  progress: "#f59e0b",
  /** Progress bar track */
  progressTrack: "#2a2a2a",
  /** Destructive / error */
  error: "#ef4444",
  /** Success / online indicator */
  success: "#22c55e",
  /** Overlay scrim for modals */
  scrim: "rgba(0,0,0,0.7)",
} as const;

export const TYPOGRAPHY = {
  /** Base font size */
  base: 14,
  small: 12,
  caption: 11,
  /** Track title */
  title: 16,
  /** Screen / section heading */
  heading: 20,
  /** Large heading */
  headingLg: 24,
  fontWeightBold: "700" as const,
  fontWeightSemibold: "600" as const,
  fontWeightRegular: "400" as const,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;

/** Track list row height — fixed for FlatList getItemLayout optimization */
export const TRACK_ROW_HEIGHT = 72;

/** Bottom player bar height */
export const PLAYER_BAR_HEIGHT = 72;
