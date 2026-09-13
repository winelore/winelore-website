import { Stack } from "expo-router"
import { EvaluationScreen, type EvaluationScreenLabels } from "../src/evaluation/EvaluationScreen"
import { sampleAttributes, sampleCategories } from "../src/evaluation/sampleScorecard"

const labels: EvaluationScreenLabels = {
    yes: "Yes",
    no: "No",
    selectPlaceholder: "—",
    submit: "Submit",
    fillRequired: "Fill required fields",
    progress: (done, total) => `${done}/${total} rated`,
    numericError: (reason) =>
        reason === "not_whole_number" ? "Whole numbers only" : "Invalid number",
    noTemplate: "No evaluation template is configured.",
    submitFailed: "Could not submit.",
}

/**
 * The scorecard running on sample data, with no sign-in and no backend.
 *
 * This exists to get the screen onto a real device early: haptics cannot be
 * felt in a simulator and Liquid Glass needs iOS 26 hardware, so the two things
 * that decide whether this feels native are exactly the two that cannot be
 * checked anywhere else.
 *
 * The formulas here run through the real evaluator in @winelore/core, so the
 * subtotals and total are genuinely computed, not faked.
 */
export default function PreviewRoute() {
    return (
        <>
            <Stack.Screen options={{ title: "Sample 0417" }} />
            <EvaluationScreen
                categories={sampleCategories}
                candidateId="preview"
                candidateCode="Sample 0417"
                beverageName="Riesling Reserve"
                visibleAttributes={sampleAttributes}
                labels={labels}
                onSubmit={async (scores) => {
                    // No backend in preview: pause so the submitting state and
                    // the success haptic are both observable.
                    await new Promise((resolve) => setTimeout(resolve, 600))
                    console.log("[preview] scores", scores)
                }}
            />
        </>
    )
}
