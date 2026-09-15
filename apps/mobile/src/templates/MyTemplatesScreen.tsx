import { useMemo } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
import { catalogTemplateCounts, type CatalogTemplate } from "@winelore/core/commission"
import { useAuth } from "../auth/AuthProvider"
import { useTranslation } from "../i18n/LocaleProvider"
import { EntityList } from "../lists/EntityList"
import { myTemplatesSource } from "../lists/sources"
import { usePagedList } from "../lists/usePagedList"
import { destinations, useOpenDestination } from "../navigation/destinations"
import { palette, radius, type } from "../theme"
import { cardSurface } from "../ui/EntityCard"
import { Icon } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"

/**
 * The web's /myTemplates: the evaluation templates this user owns, one card
 * each, as its phone layout stacks a row. The web expands a row onto its
 * structure; here a card opens the template's own page, which shows it in
 * full. Creating and editing are the web's editor, in the in-app browser,
 * and the list reloads when it closes.
 */
export function MyTemplatesScreen() {
    const { t, tCount } = useTranslation()
    const { session } = useAuth()
    const open = useOpenDestination()
    const source = useMemo(() => myTemplatesSource(session?.auid ?? ""), [session?.auid])
    const list = usePagedList(source)

    /** The web's editor, then a fresh list for whatever it saved. */
    const openThenReload = async (destination: Parameters<typeof open>[0]) => {
        await open(destination)
        list.refresh()
    }

    return (
        <EntityList
            title={t("myTemplates.title")}
            subtitle={t("myTemplates.subtitle")}
            countLabel={(total) => tCount("common.templatesCount", total)}
            action={{ label: t("myTemplates.createNew"), onPress: () => openThenReload(destinations.createTemplate) }}
            list={list}
            keyExtractor={(template) => template.id}
            renderItem={(template) => (
                <TemplateRow
                    template={template}
                    onOpen={() => open(destinations.template(template.id, template.latestEdition?.version))}
                    onEdit={() => {
                        Haptics.selectionAsync()
                        openThenReload(destinations.editTemplate(template.id))
                    }}
                />
            )}
            empty={{ icon: "layers", title: t("myTemplates.notFound"), description: t("myTemplates.createFirst") }}
            error={{ title: t("myTemplates.errorTitle"), description: t("myTemplates.errorDescription") }}
        />
    )
}

/** One template: the web's My Templates row, as a phone stacks it. */
function TemplateRow({ template, onOpen, onEdit }: { template: CatalogTemplate; onOpen: () => void; onEdit: () => void }) {
    const { t } = useTranslation()
    const counts = catalogTemplateCounts(template)
    const version = template.latestEdition?.version || 1

    return (
        <PressableSurface onPress={onOpen} accessibilityLabel={`${template.name}, v${version}`} style={styles.card}>
            <View style={styles.head}>
                <View style={styles.tile}>
                    <Icon name="layers" size={24} color={palette.accent} />
                </View>
                <View style={styles.text}>
                    <Text style={styles.name} numberOfLines={2}>
                        {template.name}
                    </Text>
                    <View style={styles.meta}>
                        <View style={styles.metaItem}>
                            <Icon name="calendar" size={13} color={palette.textMuted} />
                            <Text style={styles.metaText}>
                                {t("myTemplates.createdAt")}: {new Date(template.createdAt).toLocaleDateString("en-CA")}
                            </Text>
                        </View>
                        <Text style={styles.metaText}>
                            {t("myTemplates.type")}: <Text style={styles.metaStrong}>{template.beverageType.toUpperCase()}</Text>
                        </Text>
                        <Text style={styles.metaText}>
                            {t("myTemplates.categories")}: <Text style={styles.metaCount}>{counts.categories}</Text>
                        </Text>
                        <Text style={styles.metaText}>
                            {t("myTemplates.totalScores")}: <Text style={styles.metaCount}>{counts.properties}</Text>
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.foot}>
                <View style={styles.version}>
                    <Text style={styles.versionKicker}>{t("myTemplates.versionStatus")}</Text>
                    <View style={styles.versionRow}>
                        <View style={styles.versionChip}>
                            <Text style={styles.versionLabel}>v{version}</Text>
                        </View>
                        <View style={styles.activeChip}>
                            <Icon name="check" size={11} color={palette.positive} weight="bold" />
                            <Text style={styles.activeLabel}>{t("myTemplates.active")}</Text>
                        </View>
                    </View>
                </View>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("myTemplates.editTemplate")}
                    onPress={onEdit}
                    hitSlop={6}
                    style={({ pressed }) => [styles.edit, pressed && styles.editPressed]}
                >
                    <Icon name="edit" size={16} color={palette.textMuted} />
                </Pressable>
                <Icon name="chevron" size={16} color={palette.textGhost} weight="semibold" />
            </View>
        </PressableSurface>
    )
}

const styles = StyleSheet.create({
    // bg-white border-slate-100 rounded-[24px] p-5 shadow-sm
    card: { ...cardSurface, borderRadius: radius.panel, padding: 20, gap: 16 },
    head: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
    // p-3 bg-indigo-50 rounded-2xl mt-1
    tile: { marginTop: 4, padding: 12, borderRadius: radius.tile, backgroundColor: palette.accentSoft },
    text: { flex: 1, minWidth: 0 },
    name: { fontSize: 18, lineHeight: 26, fontWeight: "700", letterSpacing: -0.3, color: palette.heading },
    meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 12, rowGap: 4, marginTop: 8 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { fontSize: 12, fontWeight: "600", color: palette.textMuted },
    metaStrong: { fontWeight: "700", color: palette.textStrong },
    metaCount: { fontWeight: "700", color: palette.accent },
    // Right-aligned on a phone, as the web's `self-end`.
    foot: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 16 },
    version: { alignItems: "flex-end" },
    versionKicker: { ...type.kicker, letterSpacing: 0.5, color: palette.textFaint },
    versionRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
    versionChip: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "rgba(226, 232, 240, 0.5)",
        backgroundColor: palette.borderSoft,
    },
    versionLabel: { fontSize: 12, fontWeight: "800", color: palette.textStrong },
    // text-emerald-600 bg-emerald-50 border-emerald-100
    activeChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#d0fae5",
        backgroundColor: "#ecfdf5",
    },
    activeLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase", color: palette.positive },
    // p-2.5 bg-slate-50 border rounded-xl
    edit: {
        padding: 10,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
    },
    editPressed: { backgroundColor: palette.accentSoft },
})
