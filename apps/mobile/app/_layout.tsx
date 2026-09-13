import { Platform } from "react-native"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { AuthProvider } from "../src/auth/AuthProvider"
import { LocaleProvider } from "../src/i18n/LocaleProvider"
import { palette } from "../src/theme"

/**
 * expo-router's Stack is backed by react-native-screens, so this is a real
 * UINavigationController on iOS and a real Fragment-based navigator on Android.
 * That is deliberate: nav chrome, scroll-edge behaviour, the back gesture and
 * Liquid Glass on iOS 26 all come from the platform rather than being
 * reimplemented, which is what the web app has to do in CSS.
 *
 * Header options are split because the iOS ones are not merely ignored on
 * Android — `headerTransparent` there puts content under an unblurred header
 * and makes it unreadable, since Android has no equivalent of the iOS blur.
 */
const headerOptions = Platform.select({
    ios: {
        headerLargeTitle: true,
        headerTransparent: true,
        headerBlurEffect: "systemChromeMaterial" as const,
    },
    default: {
        headerStyle: { backgroundColor: palette.surface },
        headerTintColor: palette.text,
    },
})

export default function RootLayout() {
    return (
        <LocaleProvider>
            <AuthProvider>
                <StatusBar style="auto" />
                <Stack screenOptions={headerOptions}>
                    <Stack.Screen name="index" options={{ title: "Winelore" }} />
                </Stack>
            </AuthProvider>
        </LocaleProvider>
    )
}
