import { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
import {
    commentHasVisibleContent,
    formatPropertyScoreValue,
    hasFullAssessmentDetails,
    isResultOrGeneralComment,
    splitDisplayedScores,
    type CompetitionFeatureFlags,
    type PropertyMeta,
} from "@winelore/core"
import type { BreakdownEvaluation } from "@winelore/core/results"
import { useTranslation } from "../i18n/LocaleProvider"
import { useBackendText } from "../i18n/useBackendText"
import { palette } from "../theme"
import { Icon } from "../ui/Icon"
import { VoiceComment } from "./VoiceComment"

/**
 * One judge's submitted scores and comments, as the web's
 * `MemberEvaluationSection` shows them on the results page: result scores
 * and general comments at once, everything else behind "Show all details".
 * Which is which is core's rule, so the two cards always agree.
 */
export function MemberEvaluation({
    evaluation,
    propertyMap,
    flags,
}: {
    evaluation: BreakdownEvaluation
    propertyMap: Record<string, PropertyMeta>
    flags: CompetitionFeatureFlags
}) {
    const { t } = useTranslation()
    const [expanded, setExpanded] = useState(false)
    const { regular, result } = splitDisplayedScores(evaluation.scores, propertyMap)
    const comments = evaluation.comments.filter((comment) => commentHasVisibleContent(comment, flags))
    const shownComments = expanded ? comments : comments.filter((comment) => isResultOrGeneralComment(comment, propertyMap))
    const canExpand = hasFullAssessmentDetails(evaluation, propertyMap, flags)

    return (
        <View style={styles.section}>
            {regular.length > 0 || result.length > 0 ? (
                <View style={[styles.rule, styles.scores]}>
                    {expanded && regular.length > 0 ? (
                        <View style={styles.group}>
                            <Text style={styles.kicker}>{t("evaluation.submittedScores")}</Text>
                            <View style={styles.chips}>
                                {regular.map((score) => (
                                    <ScoreChip key={score.code} score={score} meta={propertyMap[score.code]} />
                                ))}
                            </View>
                        </View>
                    ) : null}
                    {result.length > 0 ? (
                        <View style={styles.group}>
                            <Text style={[styles.kicker, styles.kickerAccent]}>{t("evaluation.resultsSection")}</Text>
                            <View style={styles.chips}>
                                {result.map((score) => (
                                    <ScoreChip key={score.code} score={score} meta={propertyMap[score.code]} result />
                                ))}
                            </View>
                        </View>
                    ) : null}
                </View>
            ) : null}

            {shownComments.length > 0 ? (
                <View style={[styles.rule, styles.commentRule]}>
                    <Text style={styles.kicker}>{t("commission.comments")}</Text>
                    {shownComments.map((comment) => (
                        <Comment key={comment.id} comment={comment} propertyMap={propertyMap} voice={flags.voiceCommentsEnabled} />
                    ))}
                </View>
            ) : null}

            {canExpand ? (
                <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                        Haptics.selectionAsync()
                        setExpanded((value) => !value)
                    }}
                    hitSlop={6}
                    style={styles.toggle}
                >
                    <Icon name={expanded ? "chevronUp" : "chevronDown"} size={12} color={palette.accent} weight="semibold" />
                    <Text style={styles.toggleLabel}>
                        {expanded ? t("commission.showResultsOnly") : t("commission.showAllAssessments")}
                    </Text>
                </Pressable>
            ) : null}
        </View>
    )
}

function ScoreChip({
    score,
    meta,
    result,
}: {
    score: { code: string; value: string }
    meta: PropertyMeta | undefined
    result?: boolean
}) {
    const { t } = useTranslation()
    const name = useBackendText(meta?.name || score.code)
    const value = formatPropertyScoreValue(score.value, meta, { yesLabel: t("common.yes"), noLabel: t("common.no") })
    return (
        <View style={[styles.chip, result && styles.chipResult]}>
            <Text style={[styles.chipValue, result && styles.chipValueResult]}>{value}</Text>
            <Text style={[styles.chipName, result && styles.chipNameResult]}>{name}</Text>
        </View>
    )
}

function Comment({
    comment,
    propertyMap,
    voice,
}: {
    comment: BreakdownEvaluation["comments"][number]
    propertyMap: Record<string, PropertyMeta>
    voice: boolean
}) {
    const { t } = useTranslation()
    const label = useBackendText(
        comment.propertyId ? propertyMap[comment.propertyId]?.name || comment.propertyId : t("evaluation.generalCommentLabel"),
    )
    return (
        <View style={styles.comment}>
            <Text style={styles.commentText}>
                <Text style={styles.commentLabel}>{label}:</Text>
                {comment.text ? ` ${comment.text}` : ""}
            </Text>
            {voice && comment.voiceUrl ? <VoiceComment url={comment.voiceUrl} /> : null}
        </View>
    )
}

const styles = StyleSheet.create({
    section: { gap: 8 },
    // pl-3 border-l-2 border-indigo-300 / pl-2 border-l-2 border-slate-300
    rule: { borderLeftWidth: 2, paddingLeft: 12 },
    scores: { gap: 12, marginTop: 8, borderLeftColor: "#a3b3ff" },
    commentRule: { gap: 6, marginTop: 8, paddingLeft: 8, borderLeftColor: "#cad5e2" },
    group: { gap: 6 },
    kicker: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textFaint },
    kickerAccent: { color: palette.accent },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
    },
    chipResult: { borderColor: "#a3b3ff", backgroundColor: palette.accent },
    chipValue: { fontSize: 12, fontWeight: "700", color: palette.heading },
    chipValueResult: { color: palette.onAccent },
    chipName: { fontSize: 12, color: palette.textMuted },
    chipNameResult: { color: "#e0e7ff" },
    comment: { gap: 4 },
    commentText: { fontSize: 12, lineHeight: 17, color: "#1e1a4d" },
    commentLabel: { fontWeight: "600", color: "#615fff" },
    toggle: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginTop: 2 },
    toggleLabel: { fontSize: 12, fontWeight: "600", color: palette.accent },
})
