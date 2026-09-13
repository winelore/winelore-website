import { useCallback, useEffect, useMemo, useState } from "react"
import {
    buildInitialValues,
    buildPropertyByCode,
    buildScoresPayload,
    computeSmartValues,
    countRatedProperties,
    getRatableProperties,
    getSmartPropertyCodes,
    isEvaluationSubmittable,
    isScoringComplete,
    type EvaluationCategory,
    type EvaluationValues,
} from "@winelore/core/evaluation"
import {
    parseEvaluationNumericInput,
    type NumericInputErrorReason,
} from "@winelore/core"

/**
 * The scorecard's state machine.
 *
 * Every rule it applies — defaults, formula resolution, validation, the submit
 * payload — comes from @winelore/core/evaluation, the same functions the web
 * form calls. This hook only holds React state around them, so the two
 * platforms cannot disagree about what a judge may submit or what a score is
 * worth.
 */
export function useEvaluationForm(categories: EvaluationCategory[], candidateId: string) {
    const [values, setValues] = useState<EvaluationValues>(() => buildInitialValues(categories))
    const [numericDrafts, setNumericDrafts] = useState<Record<string, string>>({})
    const [numericErrors, setNumericErrors] = useState<
        Record<string, NumericInputErrorReason | null>
    >({})

    // A new candidate is a fresh scorecard; never carry one judge's scores over.
    useEffect(() => {
        setValues(buildInitialValues(categories))
        setNumericDrafts({})
        setNumericErrors({})
    }, [candidateId, categories])

    const setValue = useCallback((code: string, value: unknown) => {
        setValues((previous) => ({ ...previous, [code]: value }))
    }, [])

    /**
     * Handle typing in a numeric field.
     *
     * The raw text is kept as a draft while it is being edited, so a partial
     * entry like "-" or "1." is not destroyed mid-keystroke; the parsed value
     * only reaches `values` once it is valid.
     */
    const setNumericDraft = useCallback((code: string, raw: string, isDouble: boolean) => {
        setNumericDrafts((previous) => ({ ...previous, [code]: raw }))

        const result = parseEvaluationNumericInput(raw, isDouble)
        if (result.ok) {
            setNumericErrors((previous) => ({ ...previous, [code]: null }))
            setValue(code, result.value)
            return
        }
        if (result.reason === "empty") {
            setNumericErrors((previous) => ({ ...previous, [code]: null }))
            setValue(code, undefined)
            return
        }
        // Destructured so the narrowing survives into the updater closure.
        const { reason } = result
        setNumericErrors((previous) => ({ ...previous, [code]: reason }))
    }, [setValue])

    /** Drop the draft on blur so the field re-renders from the committed value. */
    const commitNumericDraft = useCallback((code: string) => {
        setNumericDrafts((previous) => {
            const next = { ...previous }
            delete next[code]
            return next
        })
    }, [])

    const hasNumericError = useMemo(
        () => Object.values(numericErrors).some(Boolean),
        [numericErrors],
    )

    const propertyByCode = useMemo(() => buildPropertyByCode(categories), [categories])
    const smartPropertyCodes = useMemo(() => getSmartPropertyCodes(categories), [categories])
    const smartValues = useMemo(
        () => computeSmartValues(categories, values),
        [categories, values],
    )
    const ratableProperties = useMemo(() => getRatableProperties(categories), [categories])
    const ratedCount = useMemo(
        () => countRatedProperties(categories, values),
        [categories, values],
    )

    const canSubmit = useMemo(
        () => isEvaluationSubmittable(categories, values, hasNumericError),
        [categories, values, hasNumericError],
    )
    const scoringComplete = useMemo(
        () => isScoringComplete(categories, values, hasNumericError),
        [categories, values, hasNumericError],
    )

    const buildScores = useCallback(
        () => buildScoresPayload(values, propertyByCode, smartPropertyCodes),
        [values, propertyByCode, smartPropertyCodes],
    )

    return {
        values,
        setValue,
        numericDrafts,
        numericErrors,
        setNumericDraft,
        commitNumericDraft,
        smartValues,
        propertyByCode,
        ratableProperties,
        ratedCount,
        canSubmit,
        scoringComplete,
        buildScores,
    }
}
