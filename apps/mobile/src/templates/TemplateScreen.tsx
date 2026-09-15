import { useMemo, useRef, useState } from "react"
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
    type LayoutChangeEvent,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from "react-native"
import { Stack } from "expo-router"
import { useHeaderHeight } from "expo-router/react-navigation"
import * as Haptics from "expo-haptics"
import {
    isTemplateOwner,
    normalizeTemplateCategories,
    templateEditionAt,
    templateEditions,
    templatePropertyConstraints,
    templatePropertyTypeLabel,
    type TemplateCategoryView,
    type TemplateDetail,
} from "@winelore/core/commission"
import { useTranslation } from "../i18n/LocaleProvider"
import { destinations, useOpenDestination } from "../navigation/destinations"
import { continuous, palette, radius } from "../theme"
import { Icon } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"
import { panelSurface } from "../ui/Surface"
import { useTemplate } from "./useTemplate"

/**
 * The web's /templates/[id], stacked as its phone layout stacks it: the
 * template's card, its editions when there is more than one, and the chosen
 * edition's categories, each opening onto its properties. `version` picks
 * the edition to open on, as the web's `?version=` does.
 *
 * Its owner edits it from the bar, as on the web; the editor is still the
 * web's, in the in-app browser, and the page reloads onto the newest edition
 * when it closes.
 */
export function TemplateScreen({ id, version }: { id: string; version?: number }) {
    const { t } = useTranslation()
    const open = useOpenDestination()
    const { state, reload } = useTemplate(id)

    if (state.status === "loading") {
        return (
            <>
                <Stack.Screen options={{ title: "", headerLargeTitle: false }} />
                <View style={styles.centered}>
                    <ActivityIndicator color={palette.accent} />
                </View>
            </>
        )
    }

    if (state.status !== "ready") {
        const failed = state.status === "error"
        return (
            <>
                <Stack.Screen options={{ title: "", headerLargeTitle: false }} />
                <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
                    <View style={[panelSurface, styles.status, failed && styles.statusError]}>
                        <View style={[styles.statusTile, failed && styles.statusTileError]}>
                            <Icon name={failed ? "alert" : "layers"} size={32} color={failed ? palette.danger : palette.textFaint} />
                        </View>
                        <Text style={styles.statusTitle}>{failed ? t("myTemplates.errorTitle") : t("myTemplates.notFound")}</Text>
                        {failed ? <Text style={styles.statusBody}>{t("myTemplates.errorDescription")}</Text> : null}
                        <PressableSurface onPress={() => (failed ? reload() : open(destinations.myTemplates))} style={styles.statusButton}>
                            <Text style={styles.statusButtonLabel}>{failed ? t("errors.retry") : t("myTemplates.title")}</Text>
                        </PressableSurface>
                    </View>
                </ScrollView>
            </>
        )
    }

    return <Loaded template={state.template} auid={state.auid} initialVersion={version} reload={reload} />
}

function Loaded({
    template,
    auid,
    initialVersion,
    reload,
}: {
    template: TemplateDetail
    auid: string | null
    initialVersion: number | undefined
    reload: () => Promise<void>
}) {
    const { t, tCount } = useTranslation()
    const open = useOpenDestination()
    const headerHeight = useHeaderHeight()
    const [selectedVersion, setSelectedVersion] = useState(initialVersion)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)
    const [titleShown, setTitleShown] = useState(false)
    const cardY = useRef(0)
    const nameBottom = useRef(0)

    const editions = templateEditions(template)
    const edition = templateEditionAt(template, selectedVersion)
    const categories = useMemo(() => normalizeTemplateCategories(edition?.categories), [edition])
    const isOwner = isTemplateOwner(template.owners, auid)

    const edit = async () => {
        await open(destinations.editTemplate(template.id))
        // Saving makes a new edition; show it.
        setSelectedVersion(undefined)
        reload()
    }

    const onRefresh = async () => {
        setRefreshing(true)
        await reload()
        setRefreshing(false)
    }

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const shown = event.nativeEvent.contentOffset.y + headerHeight > cardY.current + nameBottom.current
        if (shown !== titleShown) setTitleShown(shown)
    }

    return (
        <>
            <Stack.Screen
                options={{
                    title: titleShown ? template.name : "",
                    headerLargeTitle: false,
                    unstable_headerRightItems: () =>
                        isOwner
                            ? [
                                  {
                                      type: "button",
                                      label: t("myTemplates.editTemplate"),
                                      icon: { type: "sfSymbol", name: "pencil" },
                                      onPress: edit,
                                  },
                              ]
                            : [],
                    headerRight: () =>
                        isOwner ? (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t("myTemplates.editTemplate")}
                                onPress={edit}
                                hitSlop={8}
                                style={styles.androidAction}
                            >
                                <Icon name="edit" size={22} color={palette.accent} />
                            </Pressable>
                        ) : null,
                }}
            />
            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
                contentInsetAdjustmentBehavior="automatic"
                onScroll={onScroll}
                scrollEventThrottle={16}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} colors={[palette.accent]} />}
            >
                <View style={panelSurface} onLayout={(event: LayoutChangeEvent) => (cardY.current = event.nativeEvent.layout.y)}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoTile}>
                            <Icon name="layers" size={28} color={palette.accent} />
                        </View>
                        <View style={styles.infoText}>
                            <Text
                                style={styles.name}
                                accessibilityRole="header"
                                onLayout={(event) => {
                                    const { y, height } = event.nativeEvent.layout
                                    nameBottom.current = y + height
                                }}
                            >
                                {template.name}
                            </Text>
                            <View style={styles.metaRow}>
                                <View style={styles.meta}>
                                    <Icon name="calendar" size={13} color={palette.textMuted} />
                                    <Text style={styles.metaText}>
                                        {t("myTemplates.createdAt")}: {new Date(template.createdAt).toLocaleDateString("en-CA")}
                                    </Text>
                                </View>
                                <View style={styles.meta}>
                                    <Icon name="tag" size={13} color={palette.textMuted} />
                                    <Text style={styles.metaText}>
                                        {t("myTemplates.type")}: <Text style={styles.metaStrong}>{template.beverageType.toUpperCase()}</Text>
                                    </Text>
                                </View>
                                <View style={styles.meta}>
                                    <Icon name="check" size={13} color="#00bc7d" />
                                    <Text style={styles.metaActive}>{t("myTemplates.active").toUpperCase()}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {editions.length > 1 ? (
                    <View style={panelSurface}>
                        <View style={styles.kickerRow}>
                            <Icon name="hash" size={15} color={palette.accentBright} />
                            <Text style={styles.kicker}>{t("myTemplates.editionHistory")}</Text>
                        </View>
                        <View style={styles.editions}>
                            {editions.map((item) => {
                                const active = edition?.id === item.id
                                return (
                                    <Pressable
                                        key={item.id}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: active }}
                                        onPress={() => {
                                            Haptics.selectionAsync()
                                            setSelectedVersion(item.version)
                                        }}
                                        style={[styles.edition, active && styles.editionActive]}
                                    >
                                        <Text style={[styles.editionLabel, active && styles.editionLabelActive]}>v{item.version}</Text>
                                        {item.status === "ACTIVE" ? <Text style={styles.editionDot}>●</Text> : null}
                                    </Pressable>
                                )
                            })}
                        </View>
                    </View>
                ) : null}

                {edition ? (
                    <View style={panelSurface}>
                        <View style={[styles.kickerRow, styles.structureHead]}>
                            <Icon name="settings" size={15} color={palette.accentBright} />
                            <Text style={[styles.kicker, styles.kickerGrow]}>{t("myTemplates.evaluationStructure")}</Text>
                            <Text style={styles.categoryCount}>{tCount("commission.categoriesCount", categories.length)}</Text>
                        </View>
                        <View style={styles.categories}>
                            {categories.map((category) => (
                                <Category
                                    key={category.id}
                                    category={category}
                                    expanded={expandedId === category.id}
                                    onToggle={() => {
                                        Haptics.selectionAsync()
                                        setExpandedId((current) => (current === category.id ? null : category.id))
                                    }}
                                />
                            ))}
                        </View>
                    </View>
                ) : (
                    <View style={[panelSurface, styles.noEdition]}>
                        <Icon name="layers" size={32} color={palette.textGhost} />
                        <Text style={styles.noEditionLabel}>{t("myTemplates.notFound")}</Text>
                    </View>
                )}
            </ScrollView>
        </>
    )
}

/** A category's row, opening onto its properties — one open at a time, as on the web. */
function Category({ category, expanded, onToggle }: { category: TemplateCategoryView; expanded: boolean; onToggle: () => void }) {
    const { t, tCount } = useTranslation()
    return (
        <View style={styles.category}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle} style={styles.categoryHead}>
                <View style={styles.categoryTile}>
                    <Icon name="settings" size={13} color={palette.accent} />
                </View>
                <Text style={styles.categoryName} numberOfLines={2}>
                    {category.name}
                </Text>
                <Text style={styles.propertyCount}>{tCount("commission.propertiesCount", category.properties.length)}</Text>
                <Icon name={expanded ? "chevronUp" : "chevronDown"} size={14} color={palette.textFaint} />
            </Pressable>
            {expanded
                ? category.properties.map((property, index) => {
                      const constraints = templatePropertyConstraints(property, t)
                      return (
                          <View key={property.key} style={[styles.property, index > 0 && styles.propertyDivided]}>
                              <View style={styles.propertyMain}>
                                  <View style={styles.propertyNameRow}>
                                      <Text style={styles.propertyName}>{property.name}</Text>
                                      {property.isRequired ? (
                                          <Text style={styles.required} accessibilityLabel={t("common.required")}>
                                              *
                                          </Text>
                                      ) : null}
                                      {property.isResult ? (
                                          <View style={styles.result}>
                                              <Text style={styles.resultLabel}>{t("commission.resultBadge")}</Text>
                                          </View>
                                      ) : null}
                                  </View>
                                  {property.description ? <Text style={styles.description}>{property.description}</Text> : null}
                                  {constraints.length > 0 ? (
                                      <View style={styles.constraints}>
                                          {constraints.map((constraint) => (
                                              <View key={constraint} style={styles.constraint}>
                                                  <Text style={styles.constraintLabel}>{constraint}</Text>
                                              </View>
                                          ))}
                                      </View>
                                  ) : null}
                              </View>
                              <View style={styles.type}>
                                  <Text style={styles.typeLabel}>{templatePropertyTypeLabel(property.type, t)}</Text>
                              </View>
                          </View>
                      )
                  })
                : null}
        </View>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 16 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.background },
    androidAction: { padding: 8 },
    infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 20 },
    // p-3.5 bg-indigo-50 rounded-2xl
    infoTile: { padding: 14, borderRadius: radius.tile, backgroundColor: palette.accentSoft, ...continuous },
    infoText: { flex: 1, minWidth: 0 },
    name: { fontSize: 24, lineHeight: 32, fontWeight: "700", letterSpacing: -0.5, color: palette.heading },
    metaRow: { flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 6, marginTop: 12 },
    meta: { flexDirection: "row", alignItems: "center", gap: 6 },
    metaText: { fontSize: 12, fontWeight: "600", color: palette.textMuted },
    metaStrong: { fontWeight: "700", color: palette.textStrong },
    // text-emerald-700
    metaActive: { fontSize: 12, fontWeight: "700", color: "#007a55" },
    kickerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
    kicker: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: palette.textMuted },
    kickerGrow: { flex: 1 },
    structureHead: { marginBottom: 20 },
    categoryCount: { fontSize: 12, fontWeight: "800", color: palette.accent },
    editions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    edition: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.background,
        ...continuous,
    },
    editionActive: { borderColor: palette.accent, backgroundColor: palette.accent },
    editionLabel: { fontSize: 12, fontWeight: "700", color: "#45556c" },
    editionLabelActive: { color: palette.onAccent },
    // text-emerald-400
    editionDot: { fontSize: 10, color: "#00d492" },
    categories: { gap: 12 },
    category: { borderRadius: radius.tile, borderWidth: 1, borderColor: palette.borderSoft, overflow: "hidden", ...continuous },
    categoryHead: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "rgba(248, 250, 252, 0.6)",
    },
    categoryTile: { padding: 6, borderRadius: 8, backgroundColor: palette.accentBorder },
    categoryName: { flexShrink: 1, fontSize: 14, fontWeight: "700", color: palette.heading },
    propertyCount: { flex: 1, fontSize: 12, fontWeight: "600", color: palette.textFaint },
    property: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 20, paddingVertical: 14 },
    propertyDivided: { borderTopWidth: 1, borderTopColor: palette.background },
    propertyMain: { flex: 1, minWidth: 0 },
    propertyNameRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
    propertyName: { flexShrink: 1, fontSize: 14, fontWeight: "700", color: palette.textStrong },
    required: { fontSize: 12, fontWeight: "700", color: "#ff2056" },
    // text-amber-600 bg-amber-50 border-amber-100
    result: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "#fef3c6", backgroundColor: "#fffbeb" },
    resultLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase", color: palette.warning },
    description: { marginTop: 2, fontSize: 11, fontWeight: "500", color: palette.textFaint },
    constraints: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
    constraint: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "rgba(226, 232, 240, 0.6)",
        backgroundColor: palette.borderSoft,
    },
    constraintLabel: { fontSize: 10, fontWeight: "600", color: palette.textMuted },
    type: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(226, 232, 240, 0.6)",
        backgroundColor: palette.borderSoft,
    },
    typeLabel: { fontSize: 11, fontWeight: "700", color: "#45556c" },
    noEdition: { alignItems: "center", gap: 12, paddingVertical: 40 },
    noEditionLabel: { fontSize: 14, color: palette.textFaint },
    status: { alignItems: "center", paddingVertical: 40, gap: 8 },
    statusError: { borderColor: palette.dangerBorder },
    statusTile: { padding: 16, marginBottom: 12, borderRadius: radius.tile, backgroundColor: palette.background },
    statusTileError: { backgroundColor: palette.dangerSoft },
    statusTitle: { fontSize: 20, fontWeight: "700", color: palette.heading, textAlign: "center" },
    statusBody: { fontSize: 14, lineHeight: 20, color: palette.textMuted, textAlign: "center" },
    statusButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md, backgroundColor: palette.accent },
    statusButtonLabel: { fontSize: 14, fontWeight: "700", color: palette.onAccent },
})
