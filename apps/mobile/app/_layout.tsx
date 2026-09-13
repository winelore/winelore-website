import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { AuthProvider } from "../src/auth/AuthProvider"

/**
 * expo-router's Stack is backed by react-native-screens, so this is a real
 * UINavigationController. That is deliberate: the nav bar, its scroll-edge
 * behaviour, interactive swipe-back and Liquid Glass on iOS 26 all come from
 * UIKit rather than being reimplemented, which is what the web app has to do
 * in CSS.
 */
export default function RootLayout() {
    return (
        <AuthProvider>
            <StatusBar style="auto" />
            <Stack
                screenOptions={{
                    headerLargeTitle: true,
                    headerTransparent: true,
                    headerBlurEffect: "systemChromeMaterial",
                }}
            >
                <Stack.Screen name="index" options={{ title: "Winelore" }} />
            </Stack>
        </AuthProvider>
    )
}
