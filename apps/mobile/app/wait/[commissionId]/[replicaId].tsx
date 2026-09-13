import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { Stack, useLocalSearchParams } from "expo-router"
import { useTranslation } from "../../../src/i18n/LocaleProvider"
import { useWaitForNextCandidate } from "../../../src/evaluation/useWaitForNextCandidate"
import { palette, spacing, type } from "../../../src/theme"

/**
 * Between candidates.
 *
 * A judge lands here after submitting, or when the panel is on a candidate they
 * have already scored. It polls for the chair's next move and navigates on;
 * there is nothing to do here but wait, so back navigation is disabled rather
 * than letting a judge return to a submitted scorecard.
 */
export default function WaitRoute() {
    const { commissionId, replicaId } = useLocalSearchParams<{
        commissionId: string
        replicaId: string
    }>()
    const { t } = useTranslation()

    useWaitForNextCandidate({ commissionId, replicaId })

    return (
        <>
            <Stack.Screen
                options={{ title: t("commission.nextBeverage"), headerBackVisible: false }}
            />
            <View style={styles.screen}>
                <ActivityIndicator />
                <Text style={styles.message}>{t("commission.evaluationSubmitted")}</Text>
            </View>
        </>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.md,
        padding: spacing.xl,
        backgroundColor: palette.background,
    },
    message: { ...type.body, color: palette.textMuted, textAlign: "center" },
})
