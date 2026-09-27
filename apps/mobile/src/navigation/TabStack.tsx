import { Stack } from "expo-router"
import { palette } from "../theme"
import { headerOptions } from "./headerOptions"

/**
 * The stack inside each tab. Every tab keeps its own, so each has its own
 * large-title header and its own back history, as UITabBarController does.
 */
export function TabStack() {
    return <Stack screenOptions={{ ...headerOptions, contentStyle: { backgroundColor: palette.background } }} />
}
