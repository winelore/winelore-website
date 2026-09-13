import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
import { Link } from "expo-router"
import { useAuth } from "../src/auth/AuthProvider"
import { describeAuthConfig } from "../src/auth/config"
import { useTranslation } from "../src/i18n/LocaleProvider"
import { LOCALES, LOCALE_LABELS } from "@winelore/core/i18n"

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
                <LocalePicker />
                <AuthDiagnostics />
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
            <LocalePicker />
        </View>
    )
}

/**
 * The values the OAuth request will actually use.
 *
 * Sign-in failures are almost always a redirect URI that does not match the
 * allowlist, and the redirect is derived at runtime rather than configured —
 * so it is shown rather than left to be guessed at.
 */
function AuthDiagnostics() {
    const config = describeAuthConfig()
    return (
        <View style={styles.diagnostics}>
            <Text style={styles.diagnosticsLine}>client {config.clientId}</Text>
            <Text style={styles.diagnosticsLine}>{config.redirectUri}</Text>
            <Text style={styles.diagnosticsLine}>{config.issuer}</Text>
        </View>
    )
}

/** Switches between the three locales the product ships. */
function LocalePicker() {
    const { locale, setLocale } = useTranslation()
    return (
        <View style={styles.locales}>
            {LOCALES.map((option) => (
                <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: locale === option }}
                    onPress={() => setLocale(option)}
                    style={({ pressed }) => [
                        styles.localeChip,
                        locale === option && styles.localeChipSelected,
                        pressed && styles.buttonPressed,
                    ]}
                >
                    <Text style={[styles.localeLabel, locale === option && styles.localeLabelSelected]}>
                        {LOCALE_LABELS[option]}
                    </Text>
                </Pressable>
            ))}
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
    locales: { flexDirection: "row", gap: 8, marginTop: 8 },
    localeChip: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#d8d8dd",
    },
    localeChipSelected: { backgroundColor: "#7b1d3a", borderColor: "#7b1d3a" },
    localeLabel: { fontSize: 13, opacity: 0.7 },
    localeLabelSelected: { color: "white", opacity: 1, fontWeight: "600" },
    diagnostics: { marginTop: 20, alignItems: "center", gap: 2 },
    diagnosticsLine: { fontSize: 11, opacity: 0.4, fontFamily: "Menlo" },
    error: { marginTop: 12, fontSize: 14, color: "#b3261e", textAlign: "center" },
})
