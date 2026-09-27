import { useEffect, useState } from "react"
import { Platform } from "react-native"
import { useSegments } from "expo-router"
import { NativeTabs } from "expo-router/unstable-native-tabs"
import { useTranslation } from "../../src/i18n/LocaleProvider"
import { palette } from "../../src/theme"

/**
 * The web header's four tabs, as the platform's own tab bar: a UITabBar —
 * Liquid Glass on iOS 26 — and a Material 3 navigation bar on Android.
 *
 * Profile is not a tab here as it is on the web's phone layout. iOS and
 * Android both put the account behind an avatar on the top-level screen (the
 * App Store, Gmail), so it lives in the Home header and opens a sheet.
 *
 * The bar stays put, as in the App Store or Photos rather than Music: it does
 * not minimise on scroll, and screens are pushed inside a tab rather than over
 * the bar. The exception is the web's: its phone tab bar is hidden while a
 * judge is scoring, and so is this one — on the scorecard and on the waiting
 * room that hands the judge straight into it.
 */
export default function TabsLayout() {
    const { t } = useTranslation()
    const segments = useSegments() as string[]
    const scoring = segments.includes("evaluation") || segments.includes("wait")
    // iOS 26.6 lays out a bar that never minimises before its appearance is
    // applied, and does not lay it out again: the labels come out oversized
    // and truncated ("Ho…", "Compet…"). Changing the minimise behaviour forces
    // a fresh layout, so the bar mounts as `onScrollDown` and settles on
    // `never` a frame later. Setting `never` from the start changes nothing on
    // an iPhone, where it is already the default, so it does not help.
    const [laidOut, setLaidOut] = useState(false)
    useEffect(() => {
        const frame = requestAnimationFrame(() => setLaidOut(true))
        return () => cancelAnimationFrame(frame)
    }, [])

    return (
        <NativeTabs
            tintColor={palette.accent}
            hidden={scoring}
            minimizeBehavior={laidOut ? "never" : "onScrollDown"}
            {...(Platform.OS === "android"
                ? {
                      backgroundColor: palette.surface,
                      indicatorColor: palette.accentBorder,
                      iconColor: { default: palette.textMuted, selected: palette.accent },
                      labelStyle: {
                          default: { color: palette.textMuted },
                          selected: { color: palette.accent, fontWeight: "600" },
                      },
                  }
                : {})}
        >
            <NativeTabs.Trigger name="(home)">
                <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
                <NativeTabs.Trigger.Label>{t("common.home")}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(competitions)">
                <NativeTabs.Trigger.Icon sf={{ default: "trophy", selected: "trophy.fill" }} md="trophy" />
                <NativeTabs.Trigger.Label>{t("common.competitions")}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(beverages)">
                <NativeTabs.Trigger.Icon sf={{ default: "wineglass", selected: "wineglass.fill" }} md="wine_bar" />
                <NativeTabs.Trigger.Label>{t("common.beverages")}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="map">
                <NativeTabs.Trigger.Icon sf={{ default: "map", selected: "map.fill" }} md="map" />
                <NativeTabs.Trigger.Label>{t("common.map")}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    )
}
