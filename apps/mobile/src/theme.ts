import { Platform, StyleSheet } from "react-native"

/**
 * Design tokens.
 *
 * Colours are iOS semantic-ish rather than the web app's Tailwind slate/indigo
 * scale: a judging app is used in cellars and tasting rooms under wildly
 * varying light, so contrast matters more than brand fidelity.
 *
 * These are light-mode values. Dark mode should come from
 * `useColorScheme()` once the palette is agreed; the tokens are centralised
 * here so that becomes one change rather than a sweep.
 */
export const palette = {
    background: "#f2f2f7",
    surface: "#ffffff",
    border: "#d8d8dd",
    text: "#11111a",
    textMuted: "#4a4a55",
    textFaint: "#8a8a94",
    accent: "#7b1d3a",
    accentText: "#5e1429",
    accentSoft: "#f6ecf0",
    accentBorder: "#e2c6d2",
    onAccent: "#ffffff",
    positive: "#1d7a4a",
    danger: "#b3261e",
} as const

export const spacing = {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
} as const

export const radius = {
    sm: 10,
    md: 14,
    lg: 20,
    pill: 999,
} as const

export const type = StyleSheet.create({
    caption: { fontSize: 12, lineHeight: 16 },
    body: { fontSize: 15, lineHeight: 20 },
    title: { fontSize: 17, lineHeight: 22, fontWeight: "700" },
    largeTitle: { fontSize: 28, lineHeight: 34, fontWeight: "700" },
})

/**
 * Whether the running OS can render Liquid Glass.
 *
 * expo-glass-effect requires iOS 26; below that `GlassView` degrades to a plain
 * view, so callers that need a visible surface must supply their own
 * background rather than relying on the glass.
 */
export const supportsLiquidGlass =
    Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 26
