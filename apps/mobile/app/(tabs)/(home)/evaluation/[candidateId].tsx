import { useCallback } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { Stack, useLocalSearchParams } from "expo-router"
import type { EvaluationCommentInput, EvaluationScoreInput } from "@winelore/core/evaluation"
import { EvaluationScreen } from "../../../../src/evaluation/EvaluationScreen"
import { buildEvaluationLabels } from "../../../../src/evaluation/labels"
import { useCandidateEvaluation } from "../../../../src/evaluation/useCandidateEvaluation"
import { recordSubmission, usePanelSequencing } from "../../../../src/evaluation/usePanelSequencing"
import { useTranslation } from "../../../../src/i18n/LocaleProvider"
import { palette } from "../../../../src/theme"

export default function CandidateEvaluationRoute() {
    const { candidateId } = useLocalSearchParams<{ candidateId: string }>()
    const translation = useTranslation()
    const { state, submit, uploadVoice } = useCandidateEvaluation(candidateId)

    const ready = state.status === "ready" ? state : null

    // Follows the panel: the chair advances the active candidate and this
    // navigates to match. Held back until the scorecard has loaded, so a slow
    // first fetch is not mistaken for the panel having moved on.
    const { isLeaving } = usePanelSequencing({
        commissionId: ready?.commissionId,
        replicaId: ready?.replicaId,
        candidateId,
        enabled: Boolean(ready),
    })

    const handleSubmit = useCallback(
        async (scores: EvaluationScoreInput[], comments: EvaluationCommentInput[]) => {
            await submit(scores, comments)
            // Tells the sequencer this judge is done before the server agrees,
            // so the next poll routes to the waiting room rather than back here.
            recordSubmission(candidateId)
        },
        [submit, candidateId],
    )

    if (state.status === "loading" || isLeaving) {
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
                labels={buildEvaluationLabels(translation)}
                flags={state.flags}
                uploadVoice={uploadVoice}
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
