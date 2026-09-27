import { Platform } from "react-native"
import { palette, supportsLiquidGlass } from "../theme"

/**
 * Native stack header options.
 *
 * iOS gets the large title over transparent content: on iOS 26 the bar is
 * Liquid Glass and content scrolls up beneath it, with the scroll-edge effect
 * the system draws. Android gets a Material top app bar on the page colour.
 *
 * They are split because the iOS ones are not merely ignored on Android —
 * `headerTransparent` there puts content under an unblurred header and makes
 * it unreadable, since Android has no equivalent of the iOS blur.
 */
export const headerOptions = Platform.select({
    ios: {
        headerLargeTitle: true,
        headerTransparent: true,
        // iOS 26 draws its own scroll-edge effect under a glass bar; a blur
        // material on top of it doubles up, and inside the tab bar's stacks it
        // hid the title outright. Earlier iOS needs the material to stay legible.
        ...(supportsLiquidGlass ? {} : { headerBlurEffect: "systemChromeMaterial" as const }),
        headerTintColor: palette.accent,
        headerLargeTitleStyle: { color: palette.text },
        headerTitleStyle: { color: palette.text },
    },
    default: {
        headerStyle: { backgroundColor: palette.background },
        headerTintColor: palette.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700" as const },
    },
})
