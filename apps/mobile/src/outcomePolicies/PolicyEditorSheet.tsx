import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native"
import { Stack, useRouter } from "expo-router"
import { useHeaderHeight } from "expo-router/react-navigation"
import * as Haptics from "expo-haptics"
import {
    DEFAULT_OUTCOME_POLICY_SCRIPT,
    createOutcomePolicy,
    isDuplicatePolicyName,
    loadOutcomePolicy,
    loadOutcomePolicyNames,
    policyErrorTraceId,
    saveOutcomePolicyScript,
    type OutcomePolicyEdition,
} from "@winelore/core"
import { getDateLocale } from "@winelore/core/i18n"
import { fetchGraphQLRaw, mutateGraphQLRaw } from "../api/client"
import { useAuth } from "../auth/AuthProvider"
import { useTranslation } from "../i18n/LocaleProvider"
import { MONOSPACE, continuous, palette, radius } from "../theme"
import { Icon } from "../ui/Icon"

const read = (query: string, variables: Record<string, unknown>) => fetchGraphQLRaw<any>(query, variables)
// Any error fails a step of creating or saving, with the backend's message — it carries the trace id.
const write = (query: string, variables: Record<string, unknown>, headers?: Record<string, string>) =>
    mutateGraphQLRaw<any>(query, variables, headers)

type Loaded = { name: string; createdAt: string | null; edition: OutcomePolicyEdition | null }

/**
 * The web's outcome policy dialog, as a page sheet: a new policy's name and
 * script, or an existing one's script with its name fixed. Saving adds and
 * activates the next edition, as on the web. The script is plain monospace
 * text with the keyboard's corrections off — no smart quotes or capitals in
 * the code — where the web draws a code editor.
 *
 * With `id` it edits that policy; without, it creates one.
 */
export function PolicyEditorSheet({ id }: { id?: string }) {
    const { t, locale } = useTranslation()
    const router = useRouter()
    const headerHeight = useHeaderHeight()
    const { session } = useAuth()
    const auid = Number(session?.auid)
    const editing = id !== undefined

    const [loaded, setLoaded] = useState<Loaded | null>(editing ? null : { name: "", createdAt: null, edition: null })
    const [name, setName] = useState("")
    const [script, setScript] = useState(DEFAULT_OUTCOME_POLICY_SCRIPT)
    const [existingNames, setExistingNames] = useState<string[]>([])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let active = true
        if (id) {
            loadOutcomePolicy(read, id)
                .then((found) => {
                    if (!active) return
                    if (!found) throw new Error()
                    setLoaded({ name: found.policy.name, createdAt: found.policy.createdAt, edition: found.edition })
                    setName(found.policy.name)
                    setScript(found.edition?.scriptCode ?? DEFAULT_OUTCOME_POLICY_SCRIPT)
                })
                .catch(() => active && setError(t("outcomePolicyModal.loadError")))
        } else if (auid) {
            // A duplicate name is caught here; the backend only says INTERNAL_ERROR.
            loadOutcomePolicyNames(read, auid)
                .then((names) => active && setExistingNames(names))
                .catch(() => {})
        }
        return () => {
            active = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, auid])

    const savedScript = loaded?.edition?.scriptCode ?? DEFAULT_OUTCOME_POLICY_SCRIPT
    const duplicate = !editing && isDuplicatePolicyName(name, existingNames)
    const hasChanges = editing ? loaded !== null && script !== savedScript : name.trim() !== "" || script !== DEFAULT_OUTCOME_POLICY_SCRIPT
    const canSave = !saving && loaded !== null && !duplicate && (editing ? hasChanges : name.trim() !== "")

    const save = async () => {
        if (!canSave) return
        setSaving(true)
        setError(null)
        try {
            if (id) await saveOutcomePolicyScript(write, id, script, auid)
            else await createOutcomePolicy(write, name.trim(), script, auid)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            router.back()
        } catch (saveError) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            const message = saveError instanceof Error ? saveError.message : ""
            const traceId = policyErrorTraceId(message)
            setError(traceId ? t("outcomePolicyModal.saveErrorWithId", { id: traceId }) : message || t("outcomePolicyModal.saveError"))
        } finally {
            setSaving(false)
        }
    }

    const close = () => {
        if (!hasChanges || saving) {
            router.back()
            return
        }
        Alert.alert(editing ? t("outcomePolicyModal.editTitle") : t("outcomePolicyModal.createTitle"), t("nativeApp.discardChanges"), [
            { text: t("outcomePolicyModal.cancel"), style: "cancel" },
            { text: t("nativeApp.discard"), style: "destructive", onPress: () => router.back() },
        ])
    }

    const saveLabel = saving ? t("outcomePolicyModal.saving") : t("outcomePolicyModal.save")
    const edition = loaded?.edition

    return (
        <>
            <Stack.Screen
                options={{
                    title: editing ? t("outcomePolicyModal.editTitle") : t("outcomePolicyModal.createTitle"),
                    // Unsaved changes hold the sheet: no swipe away until saved or discarded.
                    gestureEnabled: !hasChanges,
                    unstable_headerLeftItems: () => [
                        {
                            type: "button",
                            label: t("outcomePolicyModal.close"),
                            icon: { type: "sfSymbol", name: "xmark" },
                            onPress: close,
                        },
                    ],
                    unstable_headerRightItems: () => [
                        {
                            type: "button",
                            label: saveLabel,
                            variant: "prominent",
                            tintColor: palette.accent,
                            icon: { type: "sfSymbol", name: "checkmark" },
                            disabled: !canSave,
                            onPress: save,
                        },
                    ],
                    headerLeft: () => (
                        <Pressable accessibilityRole="button" accessibilityLabel={t("outcomePolicyModal.close")} onPress={close} hitSlop={8} style={styles.androidAction}>
                            <Icon name="close" size={22} color={palette.text} />
                        </Pressable>
                    ),
                    headerRight: () => (
                        <Pressable accessibilityRole="button" onPress={save} disabled={!canSave} style={[styles.androidAction, !canSave && styles.dimmed]}>
                            <Text style={styles.androidSave}>{saveLabel}</Text>
                        </Pressable>
                    ),
                }}
            />
            <KeyboardAvoidingView
                style={styles.screen}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={headerHeight}
            >
                <View style={[styles.content, { paddingTop: headerHeight + 12 }]}>
                    <Text style={styles.subtitle}>{t("outcomePolicyModal.subtitle")}</Text>

                    <View style={styles.field}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>{t("outcomePolicyModal.nameLabel")}</Text>
                            {editing ? <Text style={styles.readOnly}>{t("outcomePolicyModal.readOnlyLabel")}</Text> : null}
                        </View>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            editable={!editing && !saving}
                            placeholder={t("outcomePolicyModal.namePlaceholder")}
                            placeholderTextColor={palette.textFaint}
                            returnKeyType="next"
                            style={[styles.input, editing && styles.inputReadOnly, duplicate && styles.inputDuplicate]}
                        />
                        {duplicate ? <Text style={styles.duplicate}>{t("outcomePolicyModal.nameDuplicateError")}</Text> : null}
                        {edition && loaded?.createdAt ? (
                            <View style={styles.meta}>
                                <Icon name="calendar" size={13} color={palette.textMuted} />
                                <Text style={styles.metaText}>
                                    {new Intl.DateTimeFormat(getDateLocale(locale), { month: "short", day: "numeric", year: "numeric" }).format(
                                        new Date(loaded.createdAt),
                                    )}
                                </Text>
                                <View style={styles.chip}>
                                    <Text style={styles.chipLabel}>
                                        v{edition.version} · {edition.status}
                                    </Text>
                                </View>
                            </View>
                        ) : null}
                    </View>

                    {error ? (
                        <View style={styles.error}>
                            <Icon name="alert" size={16} color={palette.danger} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={[styles.field, styles.scriptField]}>
                        <Text style={styles.label}>{t("outcomePolicyModal.scriptLabel")}</Text>
                        {loaded ? (
                            <TextInput
                                value={script}
                                onChangeText={setScript}
                                editable={!saving}
                                multiline
                                autoCapitalize="none"
                                autoCorrect={false}
                                spellCheck={false}
                                smartInsertDelete={false}
                                autoComplete="off"
                                textAlignVertical="top"
                                accessibilityLabel={t("outcomePolicyModal.scriptLabel")}
                                style={styles.script}
                            />
                        ) : (
                            <View style={[styles.script, styles.scriptLoading]}>
                                {error ? null : <ActivityIndicator color={palette.accent} />}
                                <Text style={styles.loadingLabel}>{error ? "" : t("outcomePolicyModal.loading")}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.surface },
    content: { flex: 1, paddingHorizontal: 16, paddingBottom: 16, gap: 16 },
    androidAction: { padding: 8 },
    androidSave: { fontSize: 16, fontWeight: "700", color: palette.accent },
    dimmed: { opacity: 0.4 },
    subtitle: { fontSize: 14, lineHeight: 20, color: palette.textMuted },
    field: { gap: 6 },
    labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: "#45556c" },
    readOnly: { fontSize: 10, fontWeight: "500", color: palette.textFaint },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: "rgba(248, 250, 252, 0.3)",
        fontSize: 14,
        fontWeight: "600",
        color: palette.heading,
        ...continuous,
    },
    inputReadOnly: { backgroundColor: palette.borderSoft, color: palette.textFaint },
    // border-rose-400 bg-rose-50 text-rose-700
    inputDuplicate: { borderColor: "#ff637e", backgroundColor: palette.dangerSoft, color: "#c70036" },
    duplicate: { fontSize: 11, fontWeight: "500", color: "#ff2056" },
    meta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
    metaText: { fontSize: 11, fontWeight: "600", color: palette.textMuted },
    chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: palette.borderSoft },
    chipLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textMuted },
    error: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        padding: 14,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.dangerBorder,
        backgroundColor: palette.dangerSoft,
        ...continuous,
    },
    errorText: { flex: 1, fontSize: 14, fontWeight: "500", color: "#c70036" },
    scriptField: { flex: 1, minHeight: 200 },
    script: {
        flex: 1,
        padding: 12,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.background,
        fontFamily: MONOSPACE,
        fontSize: 13,
        lineHeight: 19,
        color: palette.heading,
        ...continuous,
    },
    scriptLoading: { alignItems: "center", justifyContent: "center", gap: 8 },
    loadingLabel: { fontSize: 14, fontWeight: "600", color: palette.textFaint },
})
