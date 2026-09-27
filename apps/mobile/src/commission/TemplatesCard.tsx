import { useMemo, useState } from "react"
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import * as Haptics from "expo-haptics"
import {
    catalogTypeChips,
    countTemplateProperties,
    filterCatalog,
    formatTemplateOwners,
    normalizeTemplateCategories,
    templateCoverage,
    templateOwnerAuids,
    type CatalogTemplate,
    type TemplateBeverageType,
    type TemplateLink,
} from "@winelore/core/commission"
import { useTranslation } from "../i18n/LocaleProvider"
import { destinations, useOpenDestination } from "../navigation/destinations"
import { continuous, palette, radius } from "../theme"
import { Icon } from "../ui/Icon"
import { panelSurface } from "../ui/Surface"
import { useDisplayNames } from "../users/useDisplayNames"
import { loadTemplateCatalog } from "./mutations"
import { TemplateStructure } from "./TemplateStructure"

interface TemplatesCardProps {
    links: TemplateLink[]
    beverageTypes: TemplateBeverageType[]
    isHolder: boolean
    /** Templates can change until the commission starts. */
    canEdit: boolean
    onAssign: (beverageTypeId: string, templateEditionId: string) => Promise<boolean>
    onRemove: (beverageTypeId: string) => Promise<boolean>
}

const statusColor = (status?: string) => (status === "ACTIVE" ? palette.positive : status === "DRAFT" ? palette.warning : palette.textMuted)

/**
 * The web's "Evaluation Templates": one template per beverage type, how many
 * types are covered, each template's version and structure. A holder assigns,
 * changes or removes one from the catalog until the commission starts.
 */
export function TemplatesCard({ links, beverageTypes, isHolder, canEdit, onAssign, onRemove }: TemplatesCardProps) {
    const { t, tCount, formatStatus } = useTranslation()
    const open = useOpenDestination()
    const canManage = isHolder && canEdit
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
    const [catalogFor, setCatalogFor] = useState<{ type: TemplateBeverageType | null } | null>(null)
    const [removingId, setRemovingId] = useState<string | null>(null)

    const coverage = useMemo(() => templateCoverage(beverageTypes, links), [beverageTypes, links])
    const owners = useMemo(() => links.flatMap((link) => templateOwnerAuids(link.templateEdition?.template?.owners)).map(String), [links])
    const names = useDisplayNames(owners)

    const confirmRemove = (type: TemplateBeverageType) => {
        const name = coverage.assignedByType.get(type.id)?.templateEdition?.template?.name || t("commission.standardTemplate")
        Alert.alert(t("commission.removeTemplateTitle", { type: type.name || type.code }), t("commission.removeTemplateDesc", { name }), [
            { text: t("common.cancel"), style: "cancel" },
            {
                text: t("commission.removeTemplate"),
                style: "destructive",
                onPress: async () => {
                    setRemovingId(type.id)
                    await onRemove(type.id)
                    setRemovingId(null)
                },
            },
        ])
    }

    return (
        <View style={[panelSurface, styles.card]}>
            <View style={styles.header}>
                <View style={styles.headerMain}>
                    <View style={styles.headerTile}>
                        <Icon name="document" size={20} color={palette.accent} />
                    </View>
                    <View style={styles.headerText}>
                        <View style={styles.titleRow}>
                            <Text style={styles.title}>{t("commission.evaluationTemplates")}</Text>
                            {coverage.types.length > 0 ? (
                                <View style={[styles.coverage, coverage.fullyConfigured ? styles.coverageDone : styles.coverageMissing]}>
                                    <Icon
                                        name={coverage.fullyConfigured ? "check" : "warning"}
                                        size={11}
                                        color={coverage.fullyConfigured ? "#007a55" : "#bb4d00"}
                                    />
                                    <Text style={[styles.coverageLabel, { color: coverage.fullyConfigured ? "#007a55" : "#bb4d00" }]}>
                                        {t("commission.templatesCoverage", { assigned: coverage.assignedCount, total: coverage.types.length })}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        <Text style={styles.subtitle}>{t("commission.evaluationTemplatesSubtitle")}</Text>
                    </View>
                </View>
                {canManage && coverage.types.length > 0 ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("commission.assignTemplate")}
                        onPress={() => setCatalogFor({ type: null })}
                        style={({ pressed }) => [styles.addButton, pressed && styles.dimmed]}
                    >
                        <Icon name="plus" size={16} color={palette.onAccent} weight="semibold" />
                    </Pressable>
                ) : null}
            </View>

            {isHolder && !canEdit ? (
                <View style={styles.locked}>
                    <Icon name="lock" size={14} color={palette.textMuted} />
                    <Text style={styles.lockedLabel}>{t("commission.templatesLocked")}</Text>
                </View>
            ) : null}

            {coverage.types.length === 0 ? (
                <View style={styles.empty}>
                    <Icon name="document" size={32} color={palette.textGhost} />
                    <Text style={styles.emptyTitle}>{t("commission.noBeverageTypesTitle")}</Text>
                    <Text style={styles.emptyBody}>{canManage ? t("commission.noBeverageTypesDesc") : t("commission.noBeverageTypesDescReadOnly")}</Text>
                    {canManage ? (
                        <Pressable accessibilityRole="button" onPress={() => setCatalogFor({ type: null })} style={({ pressed }) => [styles.primary, pressed && styles.dimmed]}>
                            <Icon name="plus" size={14} color={palette.onAccent} weight="semibold" />
                            <Text style={styles.primaryLabel}>{t("commission.assignTemplate")}</Text>
                        </Pressable>
                    ) : null}
                </View>
            ) : (
                <View style={styles.types}>
                    {coverage.types.map((type) => {
                        const edition = coverage.assignedByType.get(type.id)?.templateEdition
                        const typeLabel = type.name || type.code
                        if (!edition) {
                            return (
                                <View key={type.id} style={styles.missing}>
                                    <View style={styles.missingTop}>
                                        <View style={[styles.typeChip, styles.typeChipMissing]}>
                                            <Text style={styles.typeChipLabel}>{typeLabel}</Text>
                                        </View>
                                        <View style={styles.missingNote}>
                                            <Icon name="warning" size={14} color="#bb4d00" />
                                            <Text style={styles.missingLabel}>{t("commission.noTemplateForType")}</Text>
                                        </View>
                                    </View>
                                    {canManage ? (
                                        <Pressable accessibilityRole="button" onPress={() => setCatalogFor({ type })} style={({ pressed }) => [styles.primary, pressed && styles.dimmed]}>
                                            <Icon name="plus" size={14} color={palette.onAccent} weight="semibold" />
                                            <Text style={styles.primaryLabel}>{t("commission.assignTemplate")}</Text>
                                        </Pressable>
                                    ) : null}
                                </View>
                            )
                        }

                        const categories = normalizeTemplateCategories(edition.categories)
                        const isExpanded = expanded.has(type.id)
                        const templateName = edition.template?.name || t("commission.standardTemplate")
                        const ownerNames = formatTemplateOwners(edition.template?.owners, names)
                        return (
                            <View key={type.id} style={styles.assigned}>
                                <View style={styles.assignedBody}>
                                    <View style={styles.typeChip}>
                                        <Text style={styles.typeChipLabel}>{typeLabel}</Text>
                                    </View>
                                    <Pressable
                                        accessibilityRole="link"
                                        disabled={!edition.template?.id}
                                        onPress={() => open(destinations.templateEdition(edition.template.id, edition.version))}
                                        style={styles.templateName}
                                    >
                                        <Text style={styles.templateNameLabel} numberOfLines={2}>
                                            {templateName}
                                        </Text>
                                        {edition.template?.id ? <Icon name="external" size={13} color={palette.textFaint} /> : null}
                                    </Pressable>
                                    <View style={styles.editionMeta}>
                                        <View style={styles.version}>
                                            <Text style={styles.versionLabel}>v{edition.version}</Text>
                                        </View>
                                        {edition.status ? (
                                            <Text style={[styles.metaLabel, { color: statusColor(edition.status) }]}>{formatStatus(edition.status).toUpperCase()}</Text>
                                        ) : null}
                                        <Text style={styles.metaLabel}>{tCount("commission.categoriesCount", categories.length)}</Text>
                                        <Text style={styles.metaLabel}>{tCount("commission.propertiesCount", countTemplateProperties(categories))}</Text>
                                    </View>
                                    {ownerNames ? (
                                        <View style={styles.owners}>
                                            <Icon name="person" size={11} color={palette.textFaint} />
                                            <Text style={styles.ownersLabel} numberOfLines={1}>
                                                {ownerNames}
                                            </Text>
                                        </View>
                                    ) : null}
                                    <View style={styles.assignedActions}>
                                        {categories.length > 0 ? (
                                            <Pressable
                                                accessibilityRole="button"
                                                accessibilityState={{ expanded: isExpanded }}
                                                onPress={() => {
                                                    Haptics.selectionAsync()
                                                    setExpanded((previous) => {
                                                        const next = new Set(previous)
                                                        if (next.has(type.id)) next.delete(type.id)
                                                        else next.add(type.id)
                                                        return next
                                                    })
                                                }}
                                                style={({ pressed }) => [styles.outline, pressed && styles.dimmed]}
                                            >
                                                <Text style={styles.outlineLabel}>{t("commission.showStructure")}</Text>
                                                <Icon name={isExpanded ? "chevronUp" : "chevronDown"} size={12} color={palette.textMuted} weight="semibold" />
                                            </Pressable>
                                        ) : null}
                                        {canManage ? (
                                            <>
                                                <Pressable accessibilityRole="button" onPress={() => setCatalogFor({ type })} style={({ pressed }) => [styles.outline, pressed && styles.dimmed]}>
                                                    <Text style={styles.outlineLabel}>{t("commission.changeTemplate")}</Text>
                                                </Pressable>
                                                <Pressable
                                                    accessibilityRole="button"
                                                    accessibilityLabel={t("commission.removeTemplate")}
                                                    disabled={removingId === type.id}
                                                    onPress={() => confirmRemove(type)}
                                                    style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}
                                                >
                                                    {removingId === type.id ? (
                                                        <ActivityIndicator size="small" color={palette.danger} />
                                                    ) : (
                                                        <Icon name="trash" size={15} color={palette.textFaint} />
                                                    )}
                                                </Pressable>
                                            </>
                                        ) : null}
                                    </View>
                                </View>
                                {isExpanded ? (
                                    <View style={styles.structure}>
                                        <TemplateStructure categories={categories} />
                                    </View>
                                ) : null}
                            </View>
                        )
                    })}
                </View>
            )}

            <TemplateCatalogSheet
                visible={catalogFor !== null}
                targetType={catalogFor?.type ?? null}
                commissionTypes={coverage.types}
                assignedByType={coverage.assignedByType}
                onClose={() => setCatalogFor(null)}
                onAssign={async (beverageTypeId, editionId) => {
                    if (await onAssign(beverageTypeId, editionId)) setCatalogFor(null)
                }}
            />
        </View>
    )
}

/** The web's template catalog: search, filter by beverage type, preview, and apply. */
function TemplateCatalogSheet({
    visible,
    targetType,
    commissionTypes,
    assignedByType,
    onClose,
    onAssign,
}: {
    visible: boolean
    targetType: TemplateBeverageType | null
    commissionTypes: TemplateBeverageType[]
    assignedByType: Map<string, TemplateLink>
    onClose: () => void
    onAssign: (beverageTypeId: string, editionId: string) => Promise<void>
}) {
    const { t, tCount } = useTranslation()
    const open = useOpenDestination()
    const [catalog, setCatalog] = useState<CatalogTemplate[] | null>(null)
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading")
    const [query, setQuery] = useState("")
    const [typeFilter, setTypeFilter] = useState("all")
    const [previewId, setPreviewId] = useState<string | null>(null)
    const [assigningId, setAssigningId] = useState<string | null>(null)

    const load = async () => {
        setStatus("loading")
        try {
            setCatalog(await loadTemplateCatalog())
            setStatus("ready")
        } catch {
            setStatus("error")
        }
    }

    const onShow = () => {
        setQuery("")
        setTypeFilter(targetType?.id ?? "all")
        setPreviewId(null)
        if (status !== "ready") load()
    }

    const commissionTypeIds = useMemo(() => new Set(commissionTypes.map((type) => type.id)), [commissionTypes])
    const owners = useMemo(() => (catalog ?? []).flatMap((template) => templateOwnerAuids(template.owners)).map(String), [catalog])
    const names = useDisplayNames(owners)
    const chips = useMemo(() => catalogTypeChips(catalog, commissionTypeIds), [catalog, commissionTypeIds])
    const templates = useMemo(
        () => filterCatalog(catalog, typeFilter, query, commissionTypeIds, (auid) => names[String(auid)] || String(auid)),
        [catalog, typeFilter, query, commissionTypeIds, names],
    )

    const assign = async (template: CatalogTemplate) => {
        setAssigningId(template.latestEdition.id)
        await onAssign(template.beverageTypeId, template.latestEdition.id)
        setAssigningId(null)
    }

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onShow={onShow} onRequestClose={() => !assigningId && onClose()}>
            <View style={styles.sheet}>
                <View style={styles.sheetHeader}>
                    <View style={styles.sheetHeaderText}>
                        <Text style={styles.sheetTitle}>{t("commission.templateCatalog")}</Text>
                        <Text style={styles.sheetSubtitle}>
                            {targetType ? t("commission.selectingTemplateFor", { type: targetType.name || targetType.code }) : t("commission.selectFromCatalog")}
                        </Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} hitSlop={8} disabled={!!assigningId} onPress={onClose} style={styles.close}>
                        <Icon name="close" size={20} color={palette.textFaint} />
                    </Pressable>
                </View>

                <View style={styles.filters}>
                    <View style={styles.search}>
                        <Icon name="search" size={16} color={palette.textFaint} />
                        <TextInput
                            value={query}
                            onChangeText={setQuery}
                            placeholder={t("commission.searchTemplates")}
                            placeholderTextColor={palette.textFaint}
                            autoCorrect={false}
                            clearButtonMode="while-editing"
                            style={styles.searchInput}
                        />
                    </View>
                    {!targetType && chips.length > 1 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                            {[{ id: "all", name: t("commission.allBeverageTypes") }, ...chips].map((chip) => {
                                const active = typeFilter === chip.id
                                const needsTemplate = commissionTypeIds.has(chip.id) && !assignedByType.get(chip.id)?.templateEdition
                                return (
                                    <Pressable
                                        key={chip.id}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: active }}
                                        onPress={() => {
                                            Haptics.selectionAsync()
                                            setTypeFilter(chip.id)
                                        }}
                                        style={[styles.chip, active && styles.chipActive]}
                                    >
                                        <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{chip.name}</Text>
                                        {needsTemplate ? <View style={[styles.chipDot, active && styles.chipDotActive]} /> : null}
                                    </Pressable>
                                )
                            })}
                        </ScrollView>
                    ) : null}
                </View>

                {status === "loading" ? (
                    <View style={styles.state}>
                        <ActivityIndicator color={palette.accent} />
                        <Text style={styles.stateLabel}>{t("commission.loadingCatalog")}</Text>
                    </View>
                ) : status === "error" ? (
                    <View style={styles.state}>
                        <Text style={[styles.stateLabel, { color: palette.danger }]}>{t("commission.catalogLoadError")}</Text>
                        <Pressable accessibilityRole="button" onPress={load} style={({ pressed }) => [styles.primary, pressed && styles.dimmed]}>
                            <Text style={styles.primaryLabel}>{t("errors.retry")}</Text>
                        </Pressable>
                    </View>
                ) : (
                    <FlatList
                        data={templates}
                        keyExtractor={(template) => template.id}
                        keyboardDismissMode="on-drag"
                        contentContainerStyle={styles.catalogList}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        ListEmptyComponent={
                            <View style={styles.state}>
                                <Text style={styles.stateLabel}>{t("commission.noTemplatesFound")}</Text>
                                <Pressable accessibilityRole="link" onPress={() => open(destinations.myTemplates)} style={styles.createLink}>
                                    <Icon name="plus" size={14} color={palette.accent} />
                                    <Text style={styles.createLinkLabel}>{t("myTemplates.createNew")}</Text>
                                    <Icon name="external" size={12} color={palette.accent} />
                                </Pressable>
                            </View>
                        }
                        renderItem={({ item: template }) => {
                            const edition = template.latestEdition
                            const categories = normalizeTemplateCategories(edition.categories)
                            const assigned = assignedByType.get(template.beverageTypeId)?.templateEdition
                            const isCurrent = assigned?.id === edition.id
                            const isSame = !!assigned && assigned.template?.id === template.id
                            const replaces = assigned && !isSame ? assigned.template?.name || t("commission.standardTemplate") : null
                            const ownerNames = formatTemplateOwners(template.owners, names)
                            const previewing = previewId === template.id
                            return (
                                <View style={[styles.template, isCurrent && styles.templateCurrent]}>
                                    <View style={styles.templateBody}>
                                        <View style={styles.templateType}>
                                            <Text style={styles.templateTypeLabel}>{template.beverageType}</Text>
                                        </View>
                                        <Text style={styles.templateTitle}>{template.name}</Text>
                                        <View style={styles.editionMeta}>
                                            <View style={styles.version}>
                                                <Text style={styles.versionLabel}>v{edition.version}</Text>
                                            </View>
                                            <Text style={styles.metaLabel}>{tCount("commission.categoriesCount", categories.length)}</Text>
                                            <Text style={styles.metaLabel}>{tCount("commission.propertiesCount", countTemplateProperties(categories))}</Text>
                                        </View>
                                        {ownerNames ? (
                                            <View style={styles.owners}>
                                                <Icon name="person" size={11} color={palette.textFaint} />
                                                <Text style={styles.ownersLabel} numberOfLines={1}>
                                                    {ownerNames}
                                                </Text>
                                            </View>
                                        ) : null}
                                        {replaces ? <Text style={styles.replaces}>{t("commission.replacesTemplate", { name: replaces })}</Text> : null}
                                        {isSame && !isCurrent ? <Text style={styles.using}>{t("commission.usingVersion", { version: assigned.version })}</Text> : null}
                                        <View style={styles.assignedActions}>
                                            {categories.length > 0 ? (
                                                <Pressable
                                                    accessibilityRole="button"
                                                    accessibilityState={{ expanded: previewing }}
                                                    onPress={() => setPreviewId(previewing ? null : template.id)}
                                                    style={({ pressed }) => [styles.outline, pressed && styles.dimmed]}
                                                >
                                                    <Text style={styles.outlineLabel}>{t("common.preview")}</Text>
                                                    <Icon name={previewing ? "chevronUp" : "chevronDown"} size={12} color={palette.textMuted} weight="semibold" />
                                                </Pressable>
                                            ) : null}
                                            {isCurrent ? (
                                                <View style={styles.current}>
                                                    <Icon name="done" size={13} color="#007a55" weight="bold" />
                                                    <Text style={styles.currentLabel}>{t("commission.currentTemplate")}</Text>
                                                </View>
                                            ) : (
                                                <Pressable
                                                    accessibilityRole="button"
                                                    disabled={!!assigningId}
                                                    onPress={() => assign(template)}
                                                    style={({ pressed }) => [styles.primary, (pressed || !!assigningId) && styles.dimmed]}
                                                >
                                                    {assigningId === edition.id ? (
                                                        <ActivityIndicator size="small" color={palette.onAccent} />
                                                    ) : (
                                                        <Text style={styles.primaryLabel}>
                                                            {isSame ? t("commission.updateToVersion", { version: edition.version }) : t("commission.applyTemplate")}
                                                        </Text>
                                                    )}
                                                </Pressable>
                                            )}
                                        </View>
                                    </View>
                                    {previewing ? (
                                        <View style={styles.preview}>
                                            <Text style={styles.previewTitle}>{t("commission.templatePreview")}</Text>
                                            <TemplateStructure categories={categories} />
                                        </View>
                                    ) : null}
                                </View>
                            )
                        }}
                    />
                )}
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    card: { gap: 16 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: palette.borderSoft,
    },
    headerMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
    headerTile: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: "rgba(224, 231, 255, 0.5)",
        backgroundColor: palette.accentSoft,
        ...continuous,
    },
    headerText: { flex: 1, minWidth: 0, gap: 2 },
    titleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
    title: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2, color: palette.heading },
    subtitle: { fontSize: 10, fontWeight: "500", color: palette.textFaint },
    coverage: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1 },
    coverageDone: { borderColor: "#d0fae5", backgroundColor: "#ecfdf5" },
    coverageMissing: { borderColor: "#fef3c6", backgroundColor: "#fffbeb" },
    coverageLabel: { fontSize: 10, fontWeight: "700" },
    addButton: { padding: 9, borderRadius: radius.md, backgroundColor: palette.accent },
    dimmed: { opacity: 0.5 },
    locked: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
    },
    lockedLabel: { flex: 1, fontSize: 11, fontWeight: "500", color: palette.textMuted },
    empty: {
        alignItems: "center",
        gap: 8,
        paddingVertical: 32,
        paddingHorizontal: 16,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: palette.border,
        backgroundColor: "rgba(248, 250, 252, 0.5)",
    },
    emptyTitle: { fontSize: 14, fontWeight: "600", color: "#45556c" },
    emptyBody: { maxWidth: 320, fontSize: 12, color: palette.textFaint, textAlign: "center" },
    primary: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minWidth: 72,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
        ...continuous,
    },
    primaryLabel: { fontSize: 12, fontWeight: "700", color: palette.onAccent },
    types: { gap: 12 },
    missing: {
        gap: 12,
        padding: 16,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#fee685",
        backgroundColor: "rgba(255, 251, 235, 0.4)",
    },
    missingTop: { gap: 8 },
    missingNote: { flexDirection: "row", alignItems: "center", gap: 6 },
    missingLabel: { flex: 1, fontSize: 12, fontWeight: "600", color: "#bb4d00" },
    typeChip: {
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
    },
    typeChipMissing: { borderColor: "#fef3c6" },
    typeChipLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase", color: "#45556c" },
    assigned: { overflow: "hidden", borderRadius: radius.tile, borderWidth: 1, borderColor: palette.border, backgroundColor: "rgba(248, 250, 252, 0.5)", ...continuous },
    assignedBody: { gap: 8, padding: 16 },
    templateName: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", maxWidth: "100%" },
    templateNameLabel: { flexShrink: 1, fontSize: 14, fontWeight: "800", color: palette.heading },
    editionMeta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 8, rowGap: 4 },
    version: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
    versionLabel: { fontSize: 10, fontWeight: "600", color: palette.textMuted },
    metaLabel: { fontSize: 10, fontWeight: "600", color: palette.textMuted },
    owners: { flexDirection: "row", alignItems: "center", gap: 4 },
    ownersLabel: { flex: 1, fontSize: 10, fontWeight: "500", color: palette.textFaint },
    assignedActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 4 },
    outline: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
    },
    outlineLabel: { fontSize: 11, fontWeight: "700", color: "#45556c" },
    remove: { padding: 7, borderRadius: 8 },
    removePressed: { backgroundColor: palette.dangerSoft },
    structure: { padding: 16, borderTopWidth: 1, borderTopColor: palette.borderSoft, backgroundColor: "rgba(255, 255, 255, 0.6)" },
    sheet: { flex: 1, backgroundColor: palette.surface },
    sheetHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: palette.borderSoft,
        backgroundColor: "rgba(248, 250, 252, 0.5)",
    },
    sheetHeaderText: { flex: 1, minWidth: 0 },
    sheetTitle: { fontSize: 18, fontWeight: "800", color: palette.heading },
    sheetSubtitle: { marginTop: 4, fontSize: 12, color: palette.textMuted },
    close: { padding: 6 },
    filters: { gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: palette.borderSoft },
    search: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: "#f1f5f9",
        ...continuous,
    },
    searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: palette.textStrong },
    chips: { gap: 6 },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
    },
    chipActive: { borderColor: palette.accent, backgroundColor: palette.accent },
    chipLabel: { fontSize: 11, fontWeight: "700", color: "#45556c" },
    chipLabelActive: { color: palette.onAccent },
    chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fe9a00" },
    chipDotActive: { backgroundColor: "#ffd230" },
    state: { alignItems: "center", gap: 12, paddingVertical: 48, paddingHorizontal: 16 },
    stateLabel: { fontSize: 14, fontWeight: "700", color: palette.textFaint, textAlign: "center" },
    createLink: { flexDirection: "row", alignItems: "center", gap: 4 },
    createLinkLabel: { fontSize: 12, fontWeight: "700", color: palette.accent },
    catalogList: { padding: 16, paddingBottom: 32 },
    separator: { height: 12 },
    template: { overflow: "hidden", borderRadius: radius.tile, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, ...continuous },
    templateCurrent: { borderColor: "#a4f4cf" },
    templateBody: { gap: 6, padding: 16 },
    templateType: {
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: "#f1f5f9",
    },
    templateTypeLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: "#45556c" },
    templateTitle: { fontSize: 14, fontWeight: "700", color: palette.heading },
    replaces: { fontSize: 10, fontWeight: "600", color: palette.warning },
    using: { fontSize: 10, fontWeight: "600", color: palette.textMuted },
    current: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: "#d0fae5",
        backgroundColor: "#ecfdf5",
    },
    currentLabel: { fontSize: 12, fontWeight: "700", color: "#007a55" },
    preview: { gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: palette.borderSoft, backgroundColor: "rgba(248, 250, 252, 0.4)" },
    previewTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textMuted },
})
