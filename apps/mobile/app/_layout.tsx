import { Platform, View } from "react-native"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { AuthProvider, useAuth } from "../src/auth/AuthProvider"
import { LocaleProvider } from "../src/i18n/LocaleProvider"
import { headerOptions } from "../src/navigation/headerOptions"
import { palette, supportsLiquidGlass } from "../src/theme"

/**
 * A deep link straight to the profile sheet still lands with the tabs beneath
 * it. Signed out, the tabs are not in the navigator and the first available
 * screen — the landing page — is used instead.
 */
export const unstable_settings = { anchor: "(tabs)" }

/**
 * expo-router's Stack is backed by react-native-screens, so this is a real
 * UINavigationController on iOS and a real Fragment-based navigator on Android.
 * That is deliberate: nav chrome, scroll-edge behaviour, the back gesture and
 * Liquid Glass on iOS 26 all come from the platform rather than being
 * reimplemented, which is what the web app has to do in CSS.
 *
 * Signed in, the root is the tab bar — Home, Competitions, Beverages, Map, as
 * in the web's header. Screens are pushed inside the tabs, so the bar stays;
 * only the profile sheet and the sample scorecard sit above it here.
 * Signed out, the root is the landing page, as on the web.
 */
export default function RootLayout() {
    return (
        <LocaleProvider>
            <AuthProvider>
                <StatusBar style="dark" />
                <RootStack />
            </AuthProvider>
        </LocaleProvider>
    )
}

/**
 * A page sheet with its own bar: the system's modal card on iOS, glass-edged
 * on iOS 26, and a full-screen dialog on Android. Content is white, as the
 * web's dialogs are.
 */
const pageSheet = {
    presentation: "modal",
    headerLargeTitle: false,
    contentStyle: { backgroundColor: palette.surface },
} as const

function RootStack() {
    const { session } = useAuth()

    // Cold start: the Keychain read has not resolved, so it is not yet known
    // which root to show. A blank page colour, not a spinner — it lasts a frame.
    if (session === undefined) {
        return <View style={{ flex: 1, backgroundColor: palette.background }} />
    }

    const signedIn = Boolean(session)

    return (
        <Stack screenOptions={{ ...headerOptions, contentStyle: { backgroundColor: palette.background } }}>
            <Stack.Protected guard={signedIn}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                    name="profile"
                    options={{
                        presentation: "formSheet",
                        headerShown: false,
                        sheetGrabberVisible: true,
                        sheetAllowedDetents: "fitToContents",
                        // iOS 26 draws the sheet in glass; an opaque content
                        // background would paint over it.
                        contentStyle: {
                            backgroundColor: supportsLiquidGlass ? "transparent" : palette.background,
                        },
                        ...(Platform.OS === "android" ? { sheetCornerRadius: 28 } : {}),
                    }}
                />
                {/* The beverage page's modals — the web's edit and samples dialogs — as page sheets. */}
                <Stack.Screen name="beverage/[id]/edit" options={pageSheet} />
                <Stack.Screen name="beverage/[id]/samples/[batchId]" options={pageSheet} />
                {/*
                 * A beverage from the map, as Apple Maps opens a place: a sheet
                 * at half height that leaves the map usable behind it, pulled up
                 * for the rest.
                 */}
                <Stack.Screen
                    name="map/beverage/[id]"
                    options={{
                        presentation: "formSheet",
                        headerShown: false,
                        sheetGrabberVisible: true,
                        sheetAllowedDetents: [0.5, 1.0],
                        sheetLargestUndimmedDetentIndex: 0,
                        contentStyle: { backgroundColor: palette.background },
                        ...(Platform.OS === "android" ? { sheetCornerRadius: 28 } : {}),
                    }}
                />
                {/* The web's create pages, as page sheets over whatever opened them. */}
                <Stack.Screen name="competition/create" options={pageSheet} />
                <Stack.Screen name="beverage/create" options={pageSheet} />
                <Stack.Screen name="batch/create" options={pageSheet} />
                <Stack.Screen name="sample/create" options={pageSheet} />
                {/* The web's outcome policy dialog, for a new policy and an existing one. */}
                <Stack.Screen name="outcome-policy/new" options={pageSheet} />
                <Stack.Screen name="outcome-policy/[id]" options={pageSheet} />
            </Stack.Protected>
            <Stack.Protected guard={!signedIn}>
                <Stack.Screen name="welcome" options={{ headerShown: false }} />
            </Stack.Protected>
        </Stack>
    )
}
