import { useEffect, useRef, useState } from "react"
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import * as Haptics from "expo-haptics"
import {
    EDITOR_PROPERTY_TYPES,
    blankCategory,
    blankProperty,
    changeProperty,
    checkTemplate,
    createEvaluationTemplate,
    duplicatePropertyCodes,
    loadTemplateForEditor,
    moveItem,
    renameFormulaVariable,
    saveEvaluationTemplate,
    templatePropertyTypeLabel,
    type EditorCategory,
    type EditorProperty,
    type EditorPropertyType,
} from "@winelore/core/commission"
import { beverageTypeOptions, type BeverageTypeOption } from "@winelore/core/beverage"
import { GET_BEVERAGE_TYPES } from "@winelore/core/dashboard"
import { fetchGraphQLRaw, mutateGraphQLRaw } from "../api/client"
import { useAuth } from "../auth/AuthProvider"
import { useTranslation } from "../i18n/LocaleProvider"
import { notifyChanged } from "../navigation/changes"
import { MONOSPACE, continuous, palette, radius } from "../theme"
import { FormError, FormField, FormInput } from "../ui/Form"
import { Icon } from "../ui/Icon"
import { MenuPicker } from "../ui/MenuPicker"
import { SheetBar } from "../ui/SheetBar"

const send = (query: string, variables: Record<string, unknown>, headers?: Record<string, string>) =>
    query.trimStart().startsWith("mutation") ? mutateGraphQLRaw<any>(query, variables, headers) : fetchGraphQLRaw<any>(query, variables, headers)

/**
 * The web's template editor, as a page sheet: the name and beverage type,
 * then the categories and their properties — each a name with its code, a
 * type and what the type needs (a range, options, a formula), and the star
 * that makes it a result. The web drags to reorder; here a long press moves
 * a category or property up or down. The checks before saving and saving —
 * the next edition, activated — are core's, which the web's editor uses too.
 *
 * With `templateId` it edits that template; without, it creates one.
 */
export function TemplateEditorSheet({ templateId }: { templateId?: string }) {
    const { t, formatBeverageType } = useTranslation()
    const router = useRouter()
    const { session } = useAuth()
    const auid = Number(session?.auid) || 0
    const editing = templateId !== undefined

    const [loading, setLoading] = useState(true)
    const [name, setName] = useState("")
    const [types, setTypes] = useState<BeverageTypeOption[]>([])
    const [typeId, setTypeId] = useState("")
    const [typeName, setTypeName] = useState("")
    const [categories, setCategories] = useState<EditorCategory[]>([])
    const [error, setError] = useState<string | null>(null)
    const [errorProperties, setErrorProperties] = useState<Set<string>>(new Set())
    const [errorCategories, setErrorCategories] = useState<Set<string>>(new Set())
    const [saving, setSaving] = useState(false)
    const [dirty, setDirty] = useState(false)
    const scroll = useRef<ScrollView>(null)
    const codeBeforeEdit = useRef(new Map<string, string>())

    useEffect(() => {
        let active = true
        ;(async () => {
            const typeList = beverageTypeOptions((await fetchGraphQLRaw<any>(GET_BEVERAGE_TYPES).catch(() => null))?.beverageTypes?.items)
            if (!active) return
            setTypes(typeList)
            if (templateId) {
                try {
                    const template = await loadTemplateForEditor(send, templateId)
                    if (!active) return
                    if (!template) throw new Error()
                    setName(template.name)
                    setTypeId(template.beverageTypeId)
                    setTypeName(template.beverageType)
                    setCategories(template.categories)
                } catch {
                    if (active) setError(t("templateCreator.loadEditError"))
                }
            } else {
                if (typeList.length > 0) setTypeId(typeList[0].id)
                setCategories([blankCategory(true)])
            }
            if (active) setLoading(false)
        })()
        return () => {
            active = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templateId])

    const update = (next: (current: EditorCategory[]) => EditorCategory[]) => {
        setDirty(true)
        setCategories(next)
    }
    const updateProperty = (categoryId: string, propertyId: string, fields: Partial<EditorProperty>) =>
        update((current) =>
            current.map((category) =>
                category.id !== categoryId
                    ? category
                    : { ...category, properties: category.properties.map((property) => (property.id === propertyId ? changeProperty(property, fields) : property)) },
            ),
        )

    const duplicates = duplicatePropertyCodes(categories)
    const typeLabel = (type: BeverageTypeOption) => {
        const formatted = formatBeverageType(type.code)
        return formatted && formatted !== type.code ? formatted : type.name || type.code
    }

    /** The long-press menu: the web's drag, as moves, and delete. */
    const showActions = (title: string, index: number, count: number, move: (from: number, to: number) => void, remove: () => void, deleteLabel: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        const actions = [
            ...(index > 0 ? [{ label: t("panels.moveUp"), run: () => move(index, index - 1) }] : []),
            ...(index < count - 1 ? [{ label: t("panels.moveDown"), run: () => move(index, index + 1) }] : []),
        ]
        if (Platform.OS === "ios") {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title,
                    options: [...actions.map((action) => action.label), deleteLabel, t("competition.cancel")],
                    destructiveButtonIndex: actions.length,
                    cancelButtonIndex: actions.length + 1,
                },
                (chosen) => {
                    if (chosen < actions.length) actions[chosen].run()
                    else if (chosen === actions.length) remove()
                },
            )
        } else {
            Alert.alert(title, undefined, [
                ...actions.map((action) => ({ text: action.label, onPress: action.run })),
                { text: deleteLabel, style: "destructive" as const, onPress: remove },
                { text: t("competition.cancel"), style: "cancel" as const },
            ])
        }
    }

    const save = async () => {
        setError(null)
        setErrorProperties(new Set())
        setErrorCategories(new Set())
        const check = checkTemplate(name, categories, t)
        if (!check.ok) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
            setError(check.message)
            setErrorProperties(check.propertyIds)
            setErrorCategories(check.categoryIds)
            scroll.current?.scrollTo({ y: 0, animated: true })
            return
        }
        setSaving(true)
        try {
            if (templateId) await saveEvaluationTemplate(send, templateId, name, check.categories, auid)
            else await createEvaluationTemplate(send, name, check.categories, auid, typeId)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            notifyChanged("templates")
            router.back()
        } catch (saveError) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            setError((saveError instanceof Error && saveError.message) || t("templateCreator.saveError"))
            setSaving(false)
            scroll.current?.scrollTo({ y: 0, animated: true })
        }
    }

    return (
        <>
            <SheetBar
                title={editing ? t("templateCreator.modalTitleEdit") : t("templateCreator.modalTitleCreate")}
                action={saving ? t("templateCreator.saving") : t("templateCreator.saveChanges")}
                actionDisabled={saving || loading || !auid}
                onAction={save}
                hasChanges={dirty && !saving}
            />
            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator color={palette.accent} />
                </View>
            ) : (
                <ScrollView
                    ref={scroll}
                    style={styles.screen}
                    contentContainerStyle={styles.content}
                    contentInsetAdjustmentBehavior="automatic"
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    automaticallyAdjustKeyboardInsets
                >
                    <Text style={styles.subtitle}>{t("templateCreator.modalSubtitle")}</Text>
                    {error ? <FormError message={error} /> : null}

                    <FormField label={t("templateCreator.templateNameLabel")}>
                        <FormInput
                            value={name}
                            onChangeText={(text) => {
                                setDirty(true)
                                setName(text)
                            }}
                            placeholder={t("templateCreator.templateNamePlaceholder")}
                            editable={!saving}
                        />
                    </FormField>

                    <FormField label={`${t("templateCreator.beverageTypeLabel")}${editing ? ` ${t("templateCreator.readOnly")}` : ""}`}>
                        {editing ? (
                            <FormInput value={formatBeverageType(typeName) || typeName} editable={false} />
                        ) : (
                            <View style={styles.picker}>
                                {types.length === 0 ? (
                                    <Text style={styles.muted}>{t("templateCreator.loadingOption")}</Text>
                                ) : (
                                    <MenuPicker
                                        accessibilityLabel={t("templateCreator.beverageTypeLabel")}
                                        options={types.map((type) => ({ value: type.id, label: typeLabel(type) }))}
                                        value={typeId}
                                        onChange={(value) => {
                                            Haptics.selectionAsync()
                                            setTypeId(value)
                                        }}
                                    />
                                )}
                            </View>
                        )}
                    </FormField>

                    <View style={styles.sectionHead}>
                        <Text style={styles.sectionTitle}>{t("templateCreator.categoriesLabel")}</Text>
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                                Haptics.selectionAsync()
                                update((current) => [...current, blankCategory()])
                            }}
                            style={styles.addCategory}
                        >
                            <Icon name="plus" size={13} color={palette.accent} weight="semibold" />
                            <Text style={styles.addCategoryLabel}>{t("templateCreator.addCategory")}</Text>
                        </Pressable>
                    </View>

                    {categories.length === 0 ? (
                        <View style={styles.noCategories}>
                            <Text style={styles.noCategoriesTitle}>{t("templateCreator.noCategoriesTitle")}</Text>
                            <Text style={styles.noCategoriesBody}>{t("templateCreator.noCategoriesDesc")}</Text>
                        </View>
                    ) : null}

                    {categories.map((category, categoryIndex) => (
                        <View key={category.id} style={[styles.category, errorCategories.has(category.id) && styles.categoryError]}>
                            <Pressable
                                onLongPress={() =>
                                    showActions(
                                        category.name || t("templateCreator.categoryNumber", { number: categoryIndex + 1 }),
                                        categoryIndex,
                                        categories.length,
                                        (from, to) => update((current) => moveItem(current, from, to)),
                                        () => update((current) => current.filter((item) => item.id !== category.id)),
                                        t("templateCreator.deleteCategory"),
                                    )
                                }
                                style={styles.categoryHead}
                            >
                                <View style={styles.categoryHeadText}>
                                    <Text style={styles.categoryNumber}>{t("templateCreator.categoryNumber", { number: categoryIndex + 1 })}</Text>
                                    <TextInput
                                        value={category.name}
                                        onChangeText={(text) => update((current) => current.map((item) => (item.id === category.id ? { ...item, name: text } : item)))}
                                        placeholder={t("templateCreator.categoryNamePlaceholder")}
                                        placeholderTextColor={palette.textGhost}
                                        editable={!saving}
                                        style={[styles.categoryName, errorCategories.has(category.id) && styles.categoryNameError]}
                                    />
                                </View>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={category.name || t("templateCreator.categoryNumber", { number: categoryIndex + 1 })}
                                    onPress={() =>
                                        showActions(
                                            category.name || t("templateCreator.categoryNumber", { number: categoryIndex + 1 }),
                                            categoryIndex,
                                            categories.length,
                                            (from, to) => update((current) => moveItem(current, from, to)),
                                            () => update((current) => current.filter((item) => item.id !== category.id)),
                                            t("templateCreator.deleteCategory"),
                                        )
                                    }
                                    hitSlop={8}
                                >
                                    <Icon name="more" size={19} color={palette.textFaint} />
                                </Pressable>
                            </Pressable>

                            <View style={styles.propertiesHead}>
                                <Text style={styles.propertiesTitle}>{t("templateCreator.propertiesLabel")}</Text>
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => {
                                        Haptics.selectionAsync()
                                        update((current) =>
                                            current.map((item) => (item.id === category.id ? { ...item, properties: [...item.properties, blankProperty()] } : item)),
                                        )
                                    }}
                                    style={styles.addProperty}
                                >
                                    <Icon name="plus" size={11} color="#45556c" weight="bold" />
                                    <Text style={styles.addPropertyLabel}>{t("templateCreator.addProperty")}</Text>
                                </Pressable>
                            </View>

                            {category.properties.map((property, propertyIndex) => (
                                <PropertyEditor
                                    key={property.id}
                                    property={property}
                                    invalid={errorProperties.has(property.id)}
                                    duplicate={!!property.code.trim() && duplicates.has(property.code.trim())}
                                    disabled={saving}
                                    onChange={(fields) => updateProperty(category.id, property.id, fields)}
                                    onCodeFocus={() => codeBeforeEdit.current.set(property.id, property.code)}
                                    onCodeBlur={() => {
                                        const before = codeBeforeEdit.current.get(property.id)
                                        codeBeforeEdit.current.delete(property.id)
                                        // Formulas that used the old code follow it, as on the web.
                                        if (before) update((current) => renameFormulaVariable(current, before, property.code))
                                    }}
                                    onMenu={() =>
                                        showActions(
                                            property.name || t("templateCreator.propertyNamePlaceholder"),
                                            propertyIndex,
                                            category.properties.length,
                                            (from, to) =>
                                                update((current) =>
                                                    current.map((item) => (item.id === category.id ? { ...item, properties: moveItem(item.properties, from, to) } : item)),
                                                ),
                                            () =>
                                                update((current) =>
                                                    current.map((item) =>
                                                        item.id === category.id ? { ...item, properties: item.properties.filter((other) => other.id !== property.id) } : item,
                                                    ),
                                                ),
                                            t("templateCreator.deleteProperty"),
                                        )
                                    }
                                />
                            ))}
                        </View>
                    ))}
                </ScrollView>
            )}
        </>
    )
}

function PropertyEditor({
    property,
    invalid,
    duplicate,
    disabled,
    onChange,
    onCodeFocus,
    onCodeBlur,
    onMenu,
}: {
    property: EditorProperty
    invalid: boolean
    duplicate: boolean
    disabled: boolean
    onChange: (fields: Partial<EditorProperty>) => void
    onCodeFocus: () => void
    onCodeBlur: () => void
    onMenu: () => void
}) {
    const { t } = useTranslation()
    const limit = (text: string) => (text.trim() === "" || Number.isNaN(Number(text)) ? undefined : Number(text))

    return (
        <Pressable onLongPress={onMenu} style={[styles.property, invalid && styles.propertyInvalid]}>
            <View style={styles.propertyRow}>
                <TextInput
                    value={property.name}
                    onChangeText={(name) => onChange({ name })}
                    placeholder={t("templateCreator.propertyNamePlaceholder")}
                    placeholderTextColor={palette.textGhost}
                    editable={!disabled}
                    style={[styles.input, styles.propertyName, invalid && styles.inputInvalid]}
                />
                <Pressable
                    accessibilityRole="switch"
                    accessibilityLabel={t("templateCreator.markResult")}
                    accessibilityState={{ checked: property.isResult }}
                    onPress={() => {
                        Haptics.selectionAsync()
                        onChange({ isResult: !property.isResult })
                    }}
                    style={[styles.star, property.isResult && styles.starOn]}
                >
                    <Icon name={property.isResult ? "starFill" : "star"} size={16} color={property.isResult ? "#e17100" : palette.textFaint} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={t("templateCreator.deleteProperty")} onPress={onMenu} hitSlop={6} style={styles.menu}>
                    <Icon name="more" size={17} color={palette.textFaint} />
                </Pressable>
            </View>
            <View style={styles.propertyRow}>
                <TextInput
                    value={property.code}
                    onChangeText={(code) => onChange({ code })}
                    onFocus={onCodeFocus}
                    onBlur={onCodeBlur}
                    placeholder={t("templateCreator.codePlaceholder")}
                    placeholderTextColor={palette.textGhost}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!disabled}
                    style={[styles.input, styles.code, duplicate && styles.inputInvalid]}
                />
                <View style={styles.typePicker}>
                    <MenuPicker
                        accessibilityLabel={templatePropertyTypeLabel(property.type, t)}
                        options={EDITOR_PROPERTY_TYPES.map((type) => ({ value: type, label: templatePropertyTypeLabel(type, t) }))}
                        value={property.type}
                        onChange={(type) => {
                            Haptics.selectionAsync()
                            onChange({ type: type as EditorPropertyType })
                        }}
                    />
                </View>
            </View>

            {property.type === "Int" || property.type === "Double" ? (
                <View style={styles.limits}>
                    <Text style={styles.limitLabel}>{t("templateCreator.fromLabel")}</Text>
                    <TextInput
                        defaultValue={property.minLimit !== undefined ? String(property.minLimit) : ""}
                        onChangeText={(text) => onChange({ minLimit: limit(text) })}
                        keyboardType="numbers-and-punctuation"
                        placeholder="0"
                        placeholderTextColor={palette.textGhost}
                        editable={!disabled}
                        style={[styles.input, styles.limit]}
                    />
                    <Text style={styles.limitLabel}>{t("templateCreator.toLabel")}</Text>
                    <TextInput
                        defaultValue={property.maxLimit !== undefined ? String(property.maxLimit) : ""}
                        onChangeText={(text) => onChange({ maxLimit: limit(text) })}
                        keyboardType="numbers-and-punctuation"
                        placeholder="100"
                        placeholderTextColor={palette.textGhost}
                        editable={!disabled}
                        style={[styles.input, styles.limit]}
                    />
                </View>
            ) : null}

            {property.type === "Discrete" || property.type === "Enum" ? (
                <TextInput
                    value={property.allowedValuesStr}
                    onChangeText={(allowedValuesStr) => onChange({ allowedValuesStr })}
                    placeholder={property.type === "Discrete" ? t("templateCreator.discretePlaceholder") : t("templateCreator.enumPlaceholder")}
                    placeholderTextColor={palette.textGhost}
                    accessibilityLabel={property.type === "Discrete" ? t("templateCreator.discreteTitle") : t("templateCreator.enumTitle")}
                    autoCapitalize={property.type === "Enum" ? "characters" : "none"}
                    autoCorrect={false}
                    keyboardType={property.type === "Discrete" ? "numbers-and-punctuation" : "default"}
                    editable={!disabled}
                    style={[styles.input, styles.mono, invalid && styles.inputInvalid]}
                />
            ) : null}

            {property.type === "Smart" ? (
                <TextInput
                    value={property.expressionStr}
                    onChangeText={(expressionStr) => onChange({ expressionStr })}
                    placeholder={t("templateCreator.formulaPlaceholder")}
                    placeholderTextColor={palette.textGhost}
                    accessibilityLabel={t("templateCreator.formulaTitle")}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    editable={!disabled}
                    style={[styles.input, styles.mono, invalid && styles.inputInvalid]}
                />
            ) : null}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.surface },
    loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.surface },
    content: { padding: 16, paddingBottom: 48, gap: 16 },
    subtitle: { fontSize: 14, lineHeight: 20, color: palette.textMuted },
    muted: { fontSize: 13, color: palette.textFaint, margin: 6 },
    picker: {
        alignSelf: "stretch",
        alignItems: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: "rgba(248, 250, 252, 0.3)",
        ...continuous,
    },
    sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 4 },
    sectionTitle: { flexShrink: 1, fontSize: 13, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase", color: palette.textStrong },
    addCategory: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: "rgba(224, 231, 255, 0.5)",
        backgroundColor: palette.accentSoft,
    },
    addCategoryLabel: { fontSize: 12, fontWeight: "700", color: palette.accent },
    noCategories: {
        alignItems: "center",
        gap: 4,
        paddingVertical: 40,
        borderRadius: radius.hero,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: palette.border,
        backgroundColor: "rgba(248, 250, 252, 0.3)",
    },
    noCategoriesTitle: { fontSize: 14, fontWeight: "600", color: palette.textFaint },
    noCategoriesBody: { fontSize: 12, color: palette.textGhost },
    category: { gap: 12, padding: 16, borderRadius: radius.panel, borderWidth: 1, borderColor: palette.borderSoft, backgroundColor: "rgba(248, 250, 252, 0.6)", ...continuous },
    categoryError: { borderColor: "#ffa1ad", backgroundColor: "rgba(255, 241, 242, 0.3)" },
    categoryHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    categoryHeadText: { flex: 1, gap: 2 },
    categoryNumber: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: palette.textFaint },
    categoryName: { paddingVertical: 4, fontSize: 18, fontWeight: "700", color: palette.heading, borderBottomWidth: 1, borderBottomColor: "transparent" },
    categoryNameError: { borderBottomColor: "#ff637e" },
    propertiesHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: palette.borderSoft },
    propertiesTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: palette.textMuted },
    addProperty: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: "rgba(226, 232, 240, 0.8)",
        backgroundColor: palette.surface,
    },
    addPropertyLabel: { fontSize: 10, fontWeight: "800", color: "#45556c" },
    property: { gap: 8, padding: 12, borderRadius: radius.tile, backgroundColor: palette.surface, ...continuous },
    propertyInvalid: { borderWidth: 1, borderColor: "#ffa1ad" },
    propertyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    input: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
        fontSize: 14,
        fontWeight: "500",
        color: palette.heading,
    },
    inputInvalid: { borderColor: "#ff637e", backgroundColor: palette.dangerSoft },
    propertyName: { flex: 1 },
    code: { flex: 1, fontFamily: MONOSPACE, fontSize: 13 },
    mono: { fontFamily: MONOSPACE, fontSize: 13 },
    typePicker: { flexShrink: 0, borderRadius: radius.sm, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 4, paddingVertical: 2 },
    star: { padding: 8, borderRadius: radius.sm, backgroundColor: palette.borderSoft },
    starOn: { backgroundColor: "#fef3c6" },
    menu: { padding: 6 },
    limits: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", padding: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.background },
    limitLabel: { fontSize: 12, fontWeight: "500", color: palette.textFaint },
    limit: { width: 64, paddingVertical: 4, textAlign: "center" },
})
