import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
import { Link } from "expo-router"
import { useAuth } from "../src/auth/AuthProvider"

export default function Index() {
    const { session, signIn, signOut, error } = useAuth()

    // Cold start: the Keychain read has not resolved yet.
    if (session === undefined) {
        return (
            <View style={[styles.screen, styles.centered]}>
                <ActivityIndicator />
            </View>
        )
    }

    if (!session) {
        return (
            <View style={[styles.screen, styles.centered]}>
                <Text style={styles.title}>Winelore</Text>
                <Text style={styles.subtitle}>Sign in with your AXUS ID to continue.</Text>
                <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                    onPress={async () => {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                        await signIn()
                    }}
                >
                    <Text style={styles.buttonLabel}>Sign in with AXUS ID</Text>
                </Pressable>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <PreviewLink />
            </View>
        )
    }

    return (
        <View style={[styles.screen, styles.centered]}>
            <Text style={styles.title}>{session.displayName}</Text>
            <Text style={styles.subtitle}>Signed in as {session.auid}</Text>
            <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
                onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    await signOut()
                }}
            >
                <Text style={styles.secondaryLabel}>Sign out</Text>
            </Pressable>
            <PreviewLink />
        </View>
    )
}

/** Opens the scorecard on sample data — no sign-in, no backend. */
function PreviewLink() {
    return (
        <Link href="/preview" asChild>
            <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            >
                <Text style={styles.secondaryLabel}>Open sample scorecard</Text>
            </Pressable>
        </Link>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, padding: 24 },
    centered: { alignItems: "center", justifyContent: "center", gap: 12 },
    title: { fontSize: 28, fontWeight: "700" },
    subtitle: { fontSize: 15, opacity: 0.6, textAlign: "center" },
    button: {
        marginTop: 16,
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 14,
        backgroundColor: "#7b1d3a",
    },
    buttonPressed: { opacity: 0.7 },
    buttonLabel: { color: "white", fontSize: 16, fontWeight: "600" },
    secondaryButton: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24 },
    secondaryLabel: { fontSize: 16, opacity: 0.7 },
    error: { marginTop: 12, fontSize: 14, color: "#b3261e", textAlign: "center" },
})
