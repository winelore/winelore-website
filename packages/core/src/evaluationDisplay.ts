import { hasStoredScoreValue } from "./formatPropertyScore"
import type { PropertyMeta } from "./propertyMap"

/**
 * What a judge's submitted evaluation shows when it is displayed back — on a
 * results page's expert breakdown, a commission's summary — shared so the web
 * card and the phone card hide and reveal the same scores and comments.
 *
 * The rule both follow: result scores, and comments that are general or on a
 * result property, always show; everything else waits behind "show all".
 */

export type CompetitionFeatureFlags = {
    propertyCommentsEnabled: boolean
    voiceCommentsEnabled: boolean
}

export interface DisplayedComment {
    text?: string | null
    voiceUrl?: string | null
    propertyId?: string | null
}

export interface DisplayedScore {
    code: string
    value: string
}

/** Whether a comment has anything to show, given what the commission allows. */
export function commentHasVisibleContent(comment: DisplayedComment, flags: CompetitionFeatureFlags) {
    if (comment.propertyId && !flags.propertyCommentsEnabled) return false
    const hasText = Boolean(comment.text?.trim())
    const hasVoice = flags.voiceCommentsEnabled && Boolean(comment.voiceUrl)
    return hasText || hasVoice
}

/** A general comment, or one on a result property — shown without expanding. */
export function isResultOrGeneralComment(
    comment: { propertyId?: string | null },
    propertyMap: Record<string, PropertyMeta>,
) {
    if (!comment.propertyId) return true
    return propertyMap[comment.propertyId]?.isResult === true
}

export function hasEvaluationData(
    evaluation: {
        scores?: Array<{ code: string; value: string | null }>
        comments?: DisplayedComment[]
    },
    flags: CompetitionFeatureFlags,
) {
    const hasScores = (evaluation.scores || []).some((s) => hasStoredScoreValue(s.value))
    const hasComments = (evaluation.comments || []).some((c) => commentHasVisibleContent(c, flags))
    return hasScores || hasComments
}

/** Whether "show all" would reveal anything: a non-result score, or a hidden comment. */
export function hasFullAssessmentDetails(
    evaluation: { scores?: DisplayedScore[]; comments?: DisplayedComment[] },
    propertyMap: Record<string, PropertyMeta>,
    flags: CompetitionFeatureFlags,
) {
    const scores = evaluation.scores || []
    const hasNonResultScores = scores.some((s) => propertyMap[s.code]?.isResult !== true)
    return hasNonResultScores || hasHiddenComments(evaluation, propertyMap, flags)
}

export function hasHiddenComments(
    evaluation: { comments?: DisplayedComment[] },
    propertyMap: Record<string, PropertyMeta>,
    flags: CompetitionFeatureFlags,
) {
    const allComments = (evaluation.comments || []).filter((c) => commentHasVisibleContent(c, flags))
    return allComments.some((c) => !isResultOrGeneralComment(c, propertyMap))
}

/** The scores worth showing, split as the card groups them: submitted, then results. */
export function splitDisplayedScores<T extends DisplayedScore>(
    scores: T[] | null | undefined,
    propertyMap: Record<string, PropertyMeta>,
): { regular: T[]; result: T[] } {
    const stored = (scores || []).filter((s) => hasStoredScoreValue(s.value, propertyMap[s.code]?.kind))
    return {
        regular: stored.filter((s) => propertyMap[s.code]?.isResult !== true),
        result: stored.filter((s) => propertyMap[s.code]?.isResult === true),
    }
}
