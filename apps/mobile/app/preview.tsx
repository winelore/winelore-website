import { Stack } from "expo-router"
import { EvaluationScreen } from "../src/evaluation/EvaluationScreen"
import { buildEvaluationLabels } from "../src/evaluation/labels"
import { sampleAttributes, sampleCategories } from "../src/evaluation/sampleScorecard"
import { useTranslation } from "../src/i18n/LocaleProvider"

/**
 * The scorecard running on sample data, with no sign-in and no backend.
 *
 * This exists to get the screen onto a real device early: haptics cannot be
 * felt in a simulator and Liquid Glass needs iOS 26 hardware, so the two things
 * that decide whether this feels native are exactly the two that cannot be
 * checked anywhere else.
 *
 * The formulas here run through the real evaluator in @winelore/core, so the
 * subtotals and total are genuinely computed, not faked — and the copy comes
 * from the same translation tables as the live screen.
 */
export default function PreviewRoute() {
    const translation = useTranslation()

    return (
        <>
            <Stack.Screen options={{ title: "Sample 0417" }} />
            <EvaluationScreen
                categories={sampleCategories}
                candidateId="preview"
                beverageName="Riesling Reserve"
                visibleAttributes={sampleAttributes}
                labels={buildEvaluationLabels(translation)}
                // Both on, so the comment fields and the recorder are here to
                // be tried on a device — which is what this screen is for.
                flags={{ propertyCommentsEnabled: true, voiceCommentsEnabled: true }}
                uploadVoice={async (recording) => recording.uri}
                onSubmit={async (scores, comments) => {
                    // No backend in preview: pause so the submitting state and
                    // the success haptic are both observable.
                    await new Promise((resolve) => setTimeout(resolve, 600))
                    console.log("[preview] scores", scores, "comments", comments)
                }}
            />
        </>
    )
}
