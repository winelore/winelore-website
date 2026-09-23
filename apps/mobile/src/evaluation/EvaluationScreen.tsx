import { useCallback, useState } from "react"
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native"
import * as Haptics from "expo-haptics"
import {
    GENERAL_COMMENT_KEY,
    buildCommentsPayload,
    buildTastingPayload,
    orderPropertiesForDisplay,
    type EvaluationCommentInput,
    type EvaluationCategory,
    type EvaluationScoreInput,
} from "@winelore/core/evaluation"
import type { CompetitionFeatureFlags, NumericInputErrorReason } from "@winelore/core"
import { useTranslation } from "../i18n/LocaleProvider"
import { getWebOrigin } from "../navigation/destinations"
import { Icon } from "../ui/Icon"
import { useEvaluationForm } from "./useEvaluationForm"
import { CommentField } from "./CommentField"
import { PropertyInput } from "./PropertyInput"
import { SubmitBar } from "./SubmitBar"
import { useVoiceRecorder, type VoiceRecording } from "./useVoiceRecorder"
import { palette, radius, spacing, type } from "../theme"

export interface EvaluationScreenLabels {
    yes: string
    no: string
    selectPlaceholder: string
    submit: string
    fillRequired: string
    progress: (done: number, total: number) => string
    numericError: (reason: NumericInputErrorReason) => string
    noTemplate: string
    submitFailed: string
    aiGenerateDraft: string
    aiGenerating: string
    aiScoreAllRequired: string
    aiDraftFailed: string
}

interface EvaluationScreenProps {
    categories: EvaluationCategory[]
    candidateId: string
    /** The anonymized code, the card's heading as on the web. */
    candidateCode: string
    beverageName?: string | null
    visibleAttributes?: Array<{ label: string; value: string }>
    labels: EvaluationScreenLabels
    /** What this commission allows: per-property comments, voice notes. */
    flags: CompetitionFeatureFlags
    /** Turns a recording into a URL the backend can serve. */
    uploadVoice: (recording: VoiceRecording, key: string) => Promise<string | undefined>
    /** Resolves when the scores are recorded; rejects with a message to show. */
    onSubmit: (
        scores: EvaluationScoreInput[],
        comments: EvaluationCommentInput[],
    ) => Promise<void>
}

export function EvaluationScreen({
    categories,
    candidateId,
    candidateCode,
    beverageName,
    visibleAttributes = [],
    labels,
    flags,
    uploadVoice,
    onSubmit,
}: EvaluationScreenProps) {
    const { t, locale } = useTranslation()
    const form = useEvaluationForm(categories, candidateId)
    const voice = useVoiceRecorder()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isGeneratingAI, setIsGeneratingAI] = useState(false)
    const [aiError, setAiError] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleGenerateAIComment = useCallback(async () => {
        if (isGeneratingAI || !form.scoringComplete) return
        setIsGeneratingAI(true)
        setAiError(null)
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            const payload = buildTastingPayload({
                categories,
                values: form.values,
                smartValues: form.smartValues,
                locale: (locale as "en" | "uk" | "hu") || "en",
                beverageType: beverageName || "Wine",
                candidateCode: candidateCode || undefined,
                visibleAttributes,
            })

            const endpoint = `${getWebOrigin()}/api/generate-comment`
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                const errJson = await response.json().catch(() => ({}))
                throw new Error(errJson.error || labels.aiDraftFailed)
            }

            // The web form streams the draft token-by-token; React Native's
            // fetch may not expose a reader, so stream when available and
            // fall back to reading the whole body as text.
            const bodyWithReader = response.body as unknown as {
                getReader?: () => { read(): Promise<{ done: boolean; value?: Uint8Array }> }
            } | null
            const reader = bodyWithReader?.getReader?.()
            if (reader) {
                const decoder = new TextDecoder()
                let accumulated = ""
                form.setComment(GENERAL_COMMENT_KEY, "")
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    if (value) {
                        accumulated += decoder.decode(value, { stream: true })
                        form.setComment(GENERAL_COMMENT_KEY, accumulated)
                    }
                }
                if (accumulated) {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                }
            } else {
                const text = await response.text()
                if (text) {
                    form.setComment(GENERAL_COMMENT_KEY, text)
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : labels.aiDraftFailed
            setAiError(message)
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        } finally {
            setIsGeneratingAI(false)
        }
    }, [
        isGeneratingAI,
        form,
        categories,
        locale,
        beverageName,
        candidateCode,
        visibleAttributes,
        labels.aiDraftFailed,
    ])

    /**
     * The drafts as core reads them: text and recording under one key per
     * property, plus the general one. Both platforms build the payload from
     * this, so a comment carries the same way from a phone as from a browser.
     */
    const commentDrafts = useCallback(() => {
        const keys = new Set([...Object.keys(form.comments), ...Object.keys(voice.recordings)])
        const drafts: Record<string, { text?: string; voice?: VoiceRecording }> = {}
        keys.forEach((key) => {
            drafts[key] = { text: form.comments[key], voice: voice.recordings[key] }
        })
        return drafts
    }, [form.comments, voice.recordings])

    const commentFieldFor = (key: string, placeholder: string) => (
        <CommentField
            value={form.comments[key] ?? ""}
            onChangeText={(text) => form.setComment(key, text)}
            recording={voice.recordings[key]}
            isRecording={voice.activeKey === key}
            elapsedSeconds={voice.elapsedSeconds}
            voiceEnabled={flags.voiceCommentsEnabled}
            placeholder={placeholder}
            onStartRecording={() => voice.start(key)}
            onStopRecording={() => voice.stop()}
            onDiscardRecording={() => voice.discard(key)}
        />
    )

    const handleSubmit = useCallback(async () => {
        if (isSubmitting || !form.canSubmit) return
        setIsSubmitting(true)
        setError(null)
        try {
            // A recording still running is part of what the judge meant to
            // send, so it is closed before the payload is built.
            if (voice.activeKey) await voice.stop()
            const comments = await buildCommentsPayload(commentDrafts(), {
                flags,
                propertyOrder: form.propertyOrder,
                upload: uploadVoice,
            })
            await onSubmit(form.buildScores(), comments)
            // Success is the moment the judge's work is recorded — worth a
            // distinct notification tap, not the light one used for scoring.
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } catch (err) {
            setError(err instanceof Error ? err.message : labels.submitFailed)
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        } finally {
            setIsSubmitting(false)
        }
    }, [isSubmitting, form, onSubmit, labels.submitFailed, voice, commentDrafts, flags, uploadVoice])

    if (categories.length === 0) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>{labels.noTemplate}</Text>
            </View>
        )
    }

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.content}
                // Let a judge tap a score directly while the keyboard is open,
                // instead of needing a dismiss tap first.
                keyboardShouldPersistTaps="handled"
                // A comment is multiline, so return adds a line rather than
                // closing the keyboard: dragging the card away closes it.
                keyboardDismissMode="interactive"
                contentInsetAdjustmentBehavior="automatic"
            >
                <Header candidateCode={candidateCode} beverageName={beverageName} visibleAttributes={visibleAttributes} />

                {categories.map((category) => (
                    <View key={category.id} style={styles.category}>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        <View style={styles.properties}>
                            {orderPropertiesForDisplay(category).map((property) => (
                            <View key={property.id} style={styles.property}>
                                <PropertyInput
                                    property={property}
                                    value={form.values[property.code]}
                                    smartValue={form.smartValues[property.code]}
                                    draft={form.numericDrafts[property.code]}
                                    error={form.numericErrors[property.code]}
                                    propertyByCode={form.propertyByCode}
                                    onChange={(value) => form.setValue(property.code, value)}
                                    onDraftChange={(raw, isDouble) =>
                                        form.setNumericDraft(property.code, raw, isDouble)
                                    }
                                    onDraftCommit={() => form.commitNumericDraft(property.code)}
                                    errorLabel={labels.numericError}
                                    yesLabel={labels.yes}
                                    noLabel={labels.no}
                                    placeholder={labels.selectPlaceholder}
                                />
                                {/* A computed subtotal is not something a
                                    judge comments on, as on the web. */}
                                {flags.propertyCommentsEnabled && property.__typename !== "SmartProperty"
                                    ? commentFieldFor(property.id, t("evaluation.addComment"))
                                    : null}
                            </View>
                        ))}
                        </View>
                    </View>
                ))}

                <View style={styles.category}>
                    <View style={styles.commentHeaderRow}>
                        <Text style={styles.categoryName}>{t("evaluation.generalCommentLabel")}</Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={
                                form.scoringComplete ? labels.aiGenerateDraft : labels.aiScoreAllRequired
                            }
                            accessibilityHint={
                                form.scoringComplete ? undefined : labels.aiScoreAllRequired
                            }
                            disabled={isGeneratingAI || !form.scoringComplete}
                            onPress={handleGenerateAIComment}
                            style={({ pressed }) => [
                                styles.aiButton,
                                (!form.scoringComplete || isGeneratingAI) && styles.aiButtonDisabled,
                                pressed && styles.pressed,
                            ]}
                        >
                            {isGeneratingAI ? (
                                <ActivityIndicator size="small" color={palette.accent} />
                            ) : (
                                <Icon
                                    name="wand"
                                    size={14}
                                    color={form.scoringComplete ? palette.accent : palette.textFaint}
                                />
                            )}
                            <Text
                                style={[
                                    styles.aiButtonText,
                                    (!form.scoringComplete || isGeneratingAI) && styles.aiButtonTextDisabled,
                                ]}
                            >
                                {isGeneratingAI ? labels.aiGenerating : labels.aiGenerateDraft}
                            </Text>
                        </Pressable>
                    </View>
                    {commentFieldFor(GENERAL_COMMENT_KEY, t("evaluation.generalCommentPlaceholder"))}
                    {aiError ? <Text style={styles.aiErrorText}>{aiError}</Text> : null}
                </View>

                {voice.error ? (
                    <Text style={styles.voiceError}>
                        {t(voice.error === "permission" ? "evaluation.voiceMicPermission" : "evaluation.voiceRecordFailed")}
                    </Text>
                ) : null}
            </ScrollView>

            <SubmitBar
                rated={form.ratedCount}
                total={form.ratableProperties.length}
                canSubmit={form.canSubmit}
                isSubmitting={isSubmitting}
                error={error}
                progressLabel={labels.progress(form.ratedCount, form.ratableProperties.length)}
                submitLabel={labels.submit}
                blockedLabel={labels.fillRequired}
                onSubmit={handleSubmit}
            />
        </KeyboardAvoidingView>
    )
}

/**
 * The candidate code heads the card, not the navigation bar: the scorecard
 * opens on a spinner, and a large title set up before its scroll view exists
 * stays pinned over the scrolling card instead of collapsing.
 */
function Header({
    candidateCode,
    beverageName,
    visibleAttributes,
}: {
    candidateCode: string
    beverageName?: string | null
    visibleAttributes: Array<{ label: string; value: string }>
}) {
    return (
        <View style={styles.header}>
            <Text style={styles.code} accessibilityRole="header">
                {candidateCode}
            </Text>
            {beverageName ? <Text style={styles.beverage}>{beverageName}</Text> : null}
            {visibleAttributes.length > 0 ? (
                <View style={styles.attributes}>
                    {visibleAttributes.map((attribute) => (
                        <View key={`${attribute.label}:${attribute.value}`} style={styles.attribute}>
                            <Text style={styles.attributeLabel}>{attribute.label}</Text>
                            <Text style={styles.attributeValue}>{attribute.value}</Text>
                        </View>
                    ))}
                </View>
            ) : null}
        </View>
    )
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: palette.background },
    content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
    header: { gap: spacing.xs },
    code: { ...type.largeTitle, color: palette.text },
    beverage: { ...type.title, color: palette.text },
    attributes: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
    attribute: {
        flexDirection: "row",
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: palette.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
    },
    attributeLabel: { ...type.caption, color: palette.textFaint, textTransform: "capitalize" },
    attributeValue: { ...type.caption, fontWeight: "600", color: palette.text },
    category: { gap: spacing.sm },
    categoryName: { ...type.title, color: palette.text },
    commentHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    aiButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 5,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: palette.accentSoft,
        borderWidth: 1,
        borderColor: palette.accentBorder,
    },
    aiButtonDisabled: {
        backgroundColor: palette.surface,
        borderColor: palette.border,
        opacity: 0.6,
    },
    aiButtonText: {
        ...type.caption,
        fontWeight: "600",
        color: palette.accent,
    },
    aiButtonTextDisabled: {
        color: palette.textFaint,
    },
    aiErrorText: {
        ...type.caption,
        color: palette.danger,
        marginTop: 2,
    },
    pressed: { opacity: 0.75 },
    properties: { gap: spacing.xs },
    property: { gap: spacing.xs },
    voiceError: { ...type.caption, fontWeight: "600", color: palette.danger },
    empty: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xl,
        backgroundColor: palette.background,
    },
    emptyText: { ...type.body, color: palette.textMuted, textAlign: "center" },
})
