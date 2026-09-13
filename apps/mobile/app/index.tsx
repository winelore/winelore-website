import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native"
import { Link, useRouter } from "expo-router"
import { useState } from "react"
import * as Haptics from "expo-haptics"
import { LOCALES, LOCALE_LABELS } from "@winelore/core/i18n"
import type { ActiveCommission } from "@winelore/core/dashboard"
import { useAuth } from "../src/auth/AuthProvider"
import { describeAuthConfig } from "../src/auth/config"
import { useDashboard } from "../src/dashboard/useDashboard"
import { useTranslation } from "../src/i18n/LocaleProvider"
import { MONOSPACE, elevation, palette, radius, spacing, type } from "../src/theme"

export default function Home() {
    const { session, signIn, signOut, error } = useAuth()
    const { t } = useTranslation()

    // Cold start: the Keychain read has not resolved yet.
    if (session === undefined) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator />
            </View>
        )
    }

    if (!session) {
        return (
            <View style={styles.centered}>
                <Text style={styles.signInTitle}>Winelore</Text>
                <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.signInButton, pressed && styles.pressed]}
                    onPress={async () => {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                        await signIn()
                    }}
                >
                    <Text style={styles.signInLabel}>{t("common.signIn")}</Text>
                </Pressable>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <PreviewLink />
                <LocalePicker />
                <AuthDiagnostics />
            </View>
        )
    }

    return <Dashboard displayName={session.displayName} onSignOut={signOut} />
}

function Dashboard({
    displayName,
    onSignOut,
}: {
    displayName: string
    onSignOut: () => Promise<void>
}) {
    const { t } = useTranslation()
    const { state, reload } = useDashboard()
    const [isRefreshing, setIsRefreshing] = useState(false)

    const refresh = async () => {
        setIsRefreshing(true)
        await reload()
        setIsRefreshing(false)
    }

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.content}
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
        >
            <View>
                <Text style={styles.welcome}>{t("dashboard.welcomeTitle")}</Text>
                <Text style={styles.displayName}>{displayName}</Text>
            </View>

            <Text style={styles.sectionTitle}>{t("dashboard.activeCommissions")}</Text>

            {state.status === "loading" ? (
                <ActivityIndicator style={styles.sectionLoading} />
            ) : state.status === "error" ? (
                <Text style={styles.empty}>{t("commission.panelSummaryLoadError")}</Text>
            ) : state.commissions.length === 0 ? (
                <Text style={styles.empty}>{t("dashboard.noActiveCommissions")}</Text>
            ) : (
                state.commissions.map((commission) => (
                    <CommissionCard key={commission.id} commission={commission} />
                ))
            )}

            <View style={styles.footer}>
                <PreviewLink />
                <LocalePicker />
                <Pressable
                    accessibilityRole="button"
                    onPress={onSignOut}
                    style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
                >
                    <Text style={styles.signOutLabel}>{t("common.logOut")}</Text>
                </Pressable>
            </View>
        </ScrollView>
    )
}

/**
 * One commission a judge is on.
 *
 * Tapping enters the session through the waiting room rather than guessing at a
 * candidate: panel sequencing then routes to whatever the chair currently has
 * open, which is the same path a judge takes mid-session.
 */
function CommissionCard({ commission }: { commission: ActiveCommission }) {
    const router = useRouter()
    const { t, formatStatus } = useTranslation()

    const enter = async () => {
        if (!commission.replicaId) return
        await Haptics.selectionAsync()
        router.push(`/wait/${commission.id}/${commission.replicaId}`)
    }

    return (
        <Pressable
            accessibilityRole="button"
            onPress={enter}
            disabled={!commission.replicaId}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
            <View style={styles.cardMain}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                    {commission.name}
                </Text>
                {commission.competition?.name ? (
                    <Text style={styles.cardSubtitle} numberOfLines={1}>
                        {commission.competition.name}
                    </Text>
                ) : null}
            </View>
            <View style={styles.cardMeta}>
                <Text style={styles.cardStatus}>{formatStatus(commission.status ?? "")}</Text>
                {commission.isHead ? (
                    <Text style={styles.headBadge}>{t("commission.headOfCommission")}</Text>
                ) : null}
            </View>
        </Pressable>
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
                        pressed && styles.pressed,
                    ]}
                >
                    <Text
                        style={[
                            styles.localeLabel,
                            locale === option && styles.localeLabelSelected,
                        ]}
                    >
                        {LOCALE_LABELS[option]}
                    </Text>
                </Pressable>
            ))}
        </View>
    )
}

/**
 * Opens the scorecard on sample data — no sign-in, no backend.
 *
 * A development affordance for reviewing the scorecard without a live session,
 * so its label is deliberately not a translation key: it is not product copy.
 */
function PreviewLink() {
    return (
        <Link href="/preview" asChild>
            <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
                <Text style={styles.secondaryLabel}>Sample scorecard</Text>
            </Pressable>
        </Link>
    )
}

/**
 * The values the OAuth request will actually use.
 *
 * Sign-in failures are almost always a redirect URI outside the allowlist, and
 * the redirect is derived at runtime rather than configured — so it is shown
 * rather than left to be guessed at.
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

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        padding: spacing.lg,
        backgroundColor: palette.background,
    },
    signInTitle: { ...type.largeTitle, color: palette.text },
    signInButton: {
        marginTop: spacing.md,
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
    },
    signInLabel: { ...type.body, fontWeight: "700", color: palette.onAccent },
    error: { ...type.caption, color: palette.danger, textAlign: "center" },
    welcome: { ...type.body, color: palette.textMuted },
    displayName: { ...type.largeTitle, color: palette.text },
    sectionTitle: { ...type.title, color: palette.text, marginTop: spacing.sm },
    sectionLoading: { marginVertical: spacing.lg },
    empty: { ...type.body, color: palette.textFaint, paddingVertical: spacing.md },
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: palette.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
        ...elevation(1),
    },
    cardMain: { flex: 1, gap: 2 },
    cardTitle: { ...type.body, fontWeight: "600", color: palette.text },
    cardSubtitle: { ...type.caption, color: palette.textFaint },
    cardMeta: { alignItems: "flex-end", gap: 2 },
    cardStatus: { ...type.caption, color: palette.textMuted, fontWeight: "600" },
    headBadge: { ...type.caption, color: palette.accentText, fontWeight: "700" },
    pressed: { opacity: 0.7 },
    footer: { marginTop: spacing.lg, alignItems: "center", gap: spacing.sm },
    secondary: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    secondaryLabel: { ...type.body, color: palette.textMuted },
    signOut: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    signOutLabel: { ...type.body, color: palette.danger },
    locales: { flexDirection: "row", gap: spacing.xs },
    localeChip: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
    },
    localeChipSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
    localeLabel: { ...type.caption, color: palette.textMuted },
    localeLabelSelected: { color: palette.onAccent, fontWeight: "600" },
    diagnostics: { marginTop: spacing.lg, alignItems: "center", gap: 2 },
    diagnosticsLine: { fontSize: 11, opacity: 0.4, fontFamily: MONOSPACE },
})
