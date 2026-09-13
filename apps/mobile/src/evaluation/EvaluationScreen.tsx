import { useCallback, useState } from "react"
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native"
import * as Haptics from "expo-haptics"
import {
    orderPropertiesForDisplay,
    type EvaluationCategory,
    type EvaluationScoreInput,
} from "@winelore/core/evaluation"
import type { NumericInputErrorReason } from "@winelore/core"
import { useEvaluationForm } from "./useEvaluationForm"
import { PropertyInput } from "./PropertyInput"
import { SubmitBar } from "./SubmitBar"
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
}

interface EvaluationScreenProps {
    categories: EvaluationCategory[]
    candidateId: string
    candidateCode: string
    beverageName?: string | null
    visibleAttributes?: Array<{ label: string; value: string }>
    labels: EvaluationScreenLabels
    /** Resolves when the scores are recorded; rejects with a message to show. */
    onSubmit: (scores: EvaluationScoreInput[]) => Promise<void>
}

export function EvaluationScreen({
    categories,
    candidateId,
    candidateCode,
    beverageName,
    visibleAttributes = [],
    labels,
    onSubmit,
}: EvaluationScreenProps) {
    const form = useEvaluationForm(categories, candidateId)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = useCallback(async () => {
        if (isSubmitting || !form.canSubmit) return
        setIsSubmitting(true)
        setError(null)
        try {
            await onSubmit(form.buildScores())
            // Success is the moment the judge's work is recorded — worth a
            // distinct notification tap, not the light one used for scoring.
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } catch (err) {
            setError(err instanceof Error ? err.message : labels.submitFailed)
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        } finally {
            setIsSubmitting(false)
        }
    }, [isSubmitting, form, onSubmit, labels.submitFailed])

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
                contentInsetAdjustmentBehavior="automatic"
            >
                <Header
                    candidateCode={candidateCode}
                    beverageName={beverageName}
                    visibleAttributes={visibleAttributes}
                />

                {categories.map((category) => (
                    <View key={category.id} style={styles.category}>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        <View style={styles.properties}>
                            {orderPropertiesForDisplay(category).map((property) => (
                                <PropertyInput
                                    key={property.id}
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
                            ))}
                        </View>
                    </View>
                ))}
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
            <Text style={styles.candidateCode}>{candidateCode}</Text>
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
    candidateCode: { ...type.largeTitle, color: palette.text },
    beverage: { ...type.body, color: palette.textMuted },
    attributes: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs },
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
    properties: { gap: spacing.xs },
    empty: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xl,
        backgroundColor: palette.background,
    },
    emptyText: { ...type.body, color: palette.textMuted, textAlign: "center" },
})
