import { useCallback } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { Stack, useLocalSearchParams } from "expo-router"
import type { EvaluationScoreInput } from "@winelore/core/evaluation"
import { EvaluationScreen, type EvaluationScreenLabels } from "../../src/evaluation/EvaluationScreen"
import { useCandidateEvaluation } from "../../src/evaluation/useCandidateEvaluation"
import { palette } from "../../src/theme"

/**
 * Placeholder copy.
 *
 * The real strings live in @winelore/core/i18n alongside the web app's, in en,
 * uk and hu. Wiring a locale provider into the native app is its own task;
 * until then these keep the screen legible without pretending to be
 * translated.
 */
const labels: EvaluationScreenLabels = {
    yes: "Yes",
    no: "No",
    selectPlaceholder: "—",
    submit: "Submit",
    fillRequired: "Fill required fields",
    progress: (done, total) => `${done}/${total} rated`,
    numericError: (reason) =>
        reason === "not_whole_number" ? "Whole numbers only" : "Invalid number",
    noTemplate: "No evaluation template is configured for this competition.",
    submitFailed: "Could not submit. Please try again.",
}

export default function CandidateEvaluationRoute() {
    const { candidateId } = useLocalSearchParams<{ candidateId: string }>()
    const { state, submit } = useCandidateEvaluation(candidateId)

    const handleSubmit = useCallback(
        (scores: EvaluationScoreInput[]) => submit(scores),
        [submit],
    )

    if (state.status === "loading") {
        return (
            <View style={styles.centered}>
                <ActivityIndicator />
            </View>
        )
    }

    if (state.status === "error") {
        return (
            <View style={styles.centered}>
                <Text style={styles.error}>{state.message}</Text>
            </View>
        )
    }

    return (
        <>
            <Stack.Screen options={{ title: state.candidateCode }} />
            <EvaluationScreen
                categories={state.categories}
                candidateId={candidateId}
                beverageName={state.beverageName}
                visibleAttributes={state.visibleAttributes}
                labels={labels}
                onSubmit={handleSubmit}
            />
        </>
    )
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: palette.background,
    },
    error: { color: palette.danger, textAlign: "center" },
})
