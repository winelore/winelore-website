import type { EvaluationScreenLabels } from "./EvaluationScreen"
import type { useTranslation } from "../i18n/LocaleProvider"

type Translation = ReturnType<typeof useTranslation>

/**
 * The scorecard's copy, from the shared en/uk/hu tables the web app uses.
 *
 * Built here rather than inside EvaluationScreen so the screen stays a pure
 * presentational component that takes its strings as data — the same reason
 * the preview route can supply its own.
 */
export function buildEvaluationLabels(t: Translation): EvaluationScreenLabels {
    return {
        yes: t.t("common.yes"),
        no: t.t("common.no"),
        selectPlaceholder: "—",
        submit: t.t("evaluation.submit"),
        fillRequired: t.t("evaluation.fillRequired"),
        progress: (done, total) => t.t("evaluation.ratedProgress", { done, total }),
        numericError: (reason) =>
            reason === "not_whole_number"
                ? t.t("evaluation.wholeNumbersOnly")
                : t.t("evaluation.invalidNumber"),
        noTemplate: t.t("evaluation.noTemplate"),
        submitFailed: t.t("evaluation.submitError"),
        aiGenerateDraft: t.t("evaluation.aiGenerateDraft"),
        aiGenerating: t.t("evaluation.aiGenerating"),
        aiScoreAllRequired: t.t("evaluation.aiScoreAllRequired"),
        aiDraftFailed: t.t("evaluation.aiDraftFailed"),
    }
}
