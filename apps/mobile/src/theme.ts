import { Platform, StyleSheet, type ViewStyle } from "react-native"

/**
 * Design tokens.
 *
 * The palette is the web app's: Tailwind's slate for text and surfaces,
 * indigo for anything interactive, violet as the second stop of the brand
 * gradient. Values are Tailwind v4's, converted from its OKLCH definitions, so
 * a card here and on the web are the same colours rather than near misses —
 * the comment beside each names the class it stands for.
 *
 * What is *not* carried over is chrome: navigation bars, tab bars, sheets and
 * controls are the platform's own (Liquid Glass on iOS 26, Material 3 on
 * Android), tinted with the brand indigo. The web draws imitations of those in
 * CSS; here they are real.
 *
 * Light only, as the web is. `app.config.ts` pins the app to light mode so
 * native chrome does not turn dark around light content.
 */
export const palette = {
    /** bg-slate-50 — the page. */
    background: "#f8fafc",
    /** bg-white — cards, sheets, grouped rows. */
    surface: "#ffffff",
    /** border-slate-200 — dividers, input outlines. */
    border: "#e2e8f0",
    /** border-slate-100 — the faint outline around a card. */
    borderSoft: "#f1f5f9",
    /** text-slate-900 — page headings. */
    text: "#0f172b",
    /** text-slate-800 — card titles. */
    heading: "#1d293d",
    /** text-slate-500 — body copy. */
    textMuted: "#62748e",
    /** text-slate-400 — secondary lines, kickers. */
    textFaint: "#90a1b9",
    /** text-slate-300 — disclosure chevrons. */
    textGhost: "#cad5e2",
    /** text-slate-200 — empty-state glyphs, the · between kicker parts. */
    textSubtle: "#e2e8f0",
    /** indigo-600 — primary actions, links, selected state. */
    accent: "#4f39f6",
    /** indigo-600 — accent as text. */
    accentText: "#4f39f6",
    /** indigo-50 — icon tiles, selected rows. */
    accentSoft: "#eef2ff",
    /** indigo-100 — icon tile outlines, section icon fill. */
    accentBorder: "#e0e7ff",
    /** indigo-300 — meta-line glyphs. */
    accentMuted: "#a3b3ff",
    /** indigo-500 — the template version chip. */
    accentBright: "#615fff",
    /** violet-600 — second stop of the brand gradient. */
    violet: "#7f22fe",
    /** violet-50 — second decorative wash. */
    violetSoft: "#f5f3ff",
    onAccent: "#ffffff",
    /** emerald-600 */
    positive: "#009966",
    /** amber-600 */
    warning: "#e17100",
    /** rose-600 */
    danger: "#ec003f",
    /** rose-50 */
    dangerSoft: "#fff1f2",
    /** rose-100 */
    dangerBorder: "#ffe4e6",
    /** blue-500 — the verified badge. */
    verified: "#2b7fff",
} as const

/** Status tones, as the web's STATUS_TEXT_CLASSES. */
export const toneColor = {
    emerald: palette.positive,
    rose: palette.danger,
    amber: palette.warning,
    slate: palette.textMuted,
} as const

/** The brand gradient: indigo-600 → violet-600, as on the web's primary buttons. */
export const brandGradient = `linear-gradient(90deg, ${palette.accent}, ${palette.violet})`

export const spacing = {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
} as const

/**
 * Corner radii. The larger ones are the web's card radii (rounded-[22px] on a
 * dashboard card, rounded-[28px] on the welcome banner); on iOS they are drawn
 * with a continuous curve, which is how the system rounds its own surfaces.
 */
export const radius = {
    sm: 10,
    /** rounded-xl */
    md: 12,
    /** rounded-2xl — icon tiles, grouped lists. */
    tile: 16,
    lg: 20,
    /** A dashboard card. */
    card: 22,
    /** Empty states and panels. */
    panel: 24,
    /** The welcome banner and sheets. */
    hero: 28,
    pill: 999,
} as const

/**
 * The platform's monospace face. iOS ships Menlo; Android has no such family
 * and silently falls back to the default sans, which makes a monospaced layout
 * look broken rather than obviously wrong.
 */
export const MONOSPACE = Platform.select({ ios: "Menlo", default: "monospace" })

export const type = StyleSheet.create({
    caption: { fontSize: 12, lineHeight: 16 },
    body: { fontSize: 15, lineHeight: 20 },
    title: { fontSize: 17, lineHeight: 22, fontWeight: "700" },
    largeTitle: { fontSize: 28, lineHeight: 34, fontWeight: "700" },
    /** text-[10px] font-bold uppercase tracking-widest — the kicker above a card title. */
    kicker: { fontSize: 10, lineHeight: 14, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
})

/**
 * Whether the running OS can render Liquid Glass.
 *
 * expo-glass-effect requires iOS 26; below that, and on Android, `GlassView`
 * degrades to a plain view, so callers needing a visible surface must supply
 * their own background rather than relying on the glass.
 *
 * Android has no equivalent material — its language is Material 3 elevation
 * and tonal surfaces — so surfaces that are glass on iOS should read as
 * deliberately Android there, not as a glass effect that failed.
 */
export const supportsLiquidGlass =
    Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 26

/** Material-style elevation on Android; iOS uses borders and the glass itself. */
export const elevation = (level: number) =>
    Platform.select({ android: { elevation: level }, default: {} })

/**
 * A card's lift: the web's `shadow-sm` on iOS, Material elevation on Android,
 * where a drawn CSS-style shadow reads as foreign next to system surfaces.
 */
export const cardShadow: ViewStyle = Platform.select<ViewStyle>({
    android: { elevation: 1 },
    default: { boxShadow: "0 1px 3px 0 rgba(15, 23, 43, 0.08), 0 1px 2px -1px rgba(15, 23, 43, 0.08)" },
})

/** Continuous (squircle) corners on iOS; ignored elsewhere. */
export const continuous: ViewStyle = Platform.OS === "ios" ? { borderCurve: "continuous" } : {}

/** What a pressed card or row does: iOS dims and settles; Android ripples. */
export const pressedCard: ViewStyle = Platform.select<ViewStyle>({
    android: {},
    default: { opacity: 0.85, transform: [{ scale: 0.975 }] },
})

/** The ripple for `android_ripple` on tappable surfaces. */
export const ripple = { color: "rgba(79, 57, 246, 0.08)", foreground: true } as const
