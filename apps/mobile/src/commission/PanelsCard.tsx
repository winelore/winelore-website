import { useMemo, useState } from "react"
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import * as Haptics from "expo-haptics"
import {
    PANEL_SEARCH_THRESHOLD,
    describeCandidate,
    moveCandidate,
    panelEntries,
    panelsProgress,
    searchPanelEntries,
    type CommissionPanelEntry,
    type PanelCandidate,
    type PanelsProgressReplica,
    type SampleState,
} from "@winelore/core/commission"
import { useTranslation } from "../i18n/LocaleProvider"
import { MONOSPACE, continuous, palette, radius } from "../theme"
import { Icon, type IconName } from "../ui/Icon"
import { panelSurface } from "../ui/Surface"

interface PanelsCardProps {
    panels: CommissionPanelEntry[]
    names: Record<string, string>
    /** A holder manages panels and samples while the commission is a draft. */
    canManage: boolean
    /** Holders, and everyone once the commission has ended, see the real beverages; otherwise tasting is blind. */
    showRealBeverage: boolean
    progressReplica: PanelsProgressReplica | null
    onAddPanel: (name: string) => Promise<boolean>
    onRenamePanel: (panelId: string, name: string) => Promise<boolean>
    onRemovePanel: (panelId: string) => Promise<void>
    onRemoveCandidate: (candidateId: string) => Promise<void>
    onReorder: (panelId: string, candidateIds: string[]) => Promise<void>
    onAddSample: (panel: CommissionPanelEntry) => void
    onEditCode: (candidate: PanelCandidate, label: string) => void
}

const STATE_LOOK: Record<Exclude<SampleState, "PENDING">, { tile: string; border: string; color: string; icon?: IconName; labelKey: string }> = {
    CURRENT: { tile: palette.accent, border: palette.accent, color: palette.onAccent, labelKey: "panels.tastingNow" },
    EVALUATED: { tile: "#ecfdf5", border: "#d0fae5", color: palette.positive, icon: "done", labelKey: "panels.sampleEvaluated" },
    DISQUALIFIED: { tile: palette.dangerSoft, border: palette.dangerBorder, color: palette.danger, icon: "ban", labelKey: "panels.sampleDisqualified" },
    POSTPONED: { tile: "#fffbeb", border: "#fef3c6", color: palette.warning, icon: "clock", labelKey: "panels.samplePostponed" },
}

/**
 * The web's "Panels and Wine Samples": each tasting panel with its samples in
 * tasting order, their codes and — for holders, or once over — the real
 * beverages; the selected replica's progress laid over them. A holder of a
 * draft adds, renames and deletes panels, adds samples, edits codes and
 * changes the order. The web drags to reorder; a phone moves a sample up or
 * down from its long-press menu.
 */
export function PanelsCard({
    panels,
    names,
    canManage,
    showRealBeverage,
    progressReplica,
    onAddPanel,
    onRenamePanel,
    onRemovePanel,
    onRemoveCandidate,
    onReorder,
    onAddSample,
    onEditCode,
}: PanelsCardProps) {
    const { t, tCount, formatBeverageType } = useTranslation()
    const [adding, setAdding] = useState(false)
    const [newName, setNewName] = useState("")
    const [creating, setCreating] = useState(false)
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameDraft, setRenameDraft] = useState("")
    const [savingName, setSavingName] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
    const [query, setQuery] = useState("")
    const [pendingOrder, setPendingOrder] = useState<{ panelId: string; ids: string[] } | null>(null)

    const searching = query.trim().length > 0
    const describe = (candidate: PanelCandidate) => describeCandidate(candidate, { showRealBeverage, names, formatBeverageType })
    const entries = panelEntries(panels, pendingOrder)
    const totalSamples = entries.reduce((sum, entry) => sum + entry.items.length, 0)
    const positionById = new Map(entries.flatMap(({ items }) => items.map((candidate, index) => [candidate.id, index] as const)))
    const visible = searchPanelEntries(entries, query, describe)
    const progress = useMemo(() => panelsProgress(progressReplica), [progressReplica])

    const create = async () => {
        if (!newName.trim()) return
        setCreating(true)
        if (await onAddPanel(newName)) {
            setNewName("")
            setAdding(false)
        }
        setCreating(false)
    }

    const rename = async (panelId: string) => {
        if (!renameDraft.trim()) return
        setSavingName(true)
        if (await onRenamePanel(panelId, renameDraft)) setRenamingId(null)
        setSavingName(false)
    }

    const confirmDelete = (kind: "panel" | "candidate", id: string, label: string) =>
        Alert.alert(
            kind === "panel" ? t("panels.deletePanel") : t("panels.deleteSample"),
            `${label}\n\n${kind === "panel" ? t("panels.confirmDeletePanel") : t("panels.confirmDeleteCandidate")}`,
            [
                { text: t("competition.cancel"), style: "cancel" },
                {
                    text: kind === "panel" ? t("panels.deletePanel") : t("panels.deleteSample"),
                    style: "destructive",
                    onPress: async () => {
                        setDeletingId(id)
                        await (kind === "panel" ? onRemovePanel(id) : onRemoveCandidate(id))
                        setDeletingId(null)
                    },
                },
            ],
        )

    const move = async (panelId: string, items: PanelCandidate[], from: number, to: number) => {
        const ids = moveCandidate(items, from, to)
        if (!ids) return
        Haptics.selectionAsync()
        setPendingOrder({ panelId, ids })
        await onReorder(panelId, ids)
        setPendingOrder(null)
    }

    /** The long-press menu: the web's drag and ↑/↓, its edit and delete. */
    const showActions = (panelId: string, items: PanelCandidate[], index: number, candidate: PanelCandidate, label: string) => {
        if (!canManage || searching || pendingOrder) return
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        const actions = [
            ...(index > 0 ? [{ label: t("panels.moveUp"), run: () => move(panelId, items, index, index - 1) }] : []),
            ...(index < items.length - 1 ? [{ label: t("panels.moveDown"), run: () => move(panelId, items, index, index + 1) }] : []),
            { label: t("panels.editCode"), run: () => onEditCode(candidate, label) },
        ]
        if (Platform.OS === "ios") {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: label,
                    options: [...actions.map((action) => action.label), t("panels.deleteSample"), t("competition.cancel")],
                    destructiveButtonIndex: actions.length,
                    cancelButtonIndex: actions.length + 1,
                },
                (chosen) => {
                    if (chosen < actions.length) actions[chosen].run()
                    else if (chosen === actions.length) confirmDelete("candidate", candidate.id, label)
                },
            )
        } else {
            Alert.alert(label, undefined, [
                ...actions.slice(0, 2).map((action) => ({ text: action.label, onPress: action.run })),
                { text: t("competition.cancel"), style: "cancel" as const },
            ])
        }
    }

    return (
        <View style={[panelSurface, styles.card]}>
            <View style={styles.header}>
                <View style={styles.headerMain}>
                    <View style={styles.headerTile}>
                        <Icon name="layers" size={20} color={palette.accent} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>{t("panels.title")}</Text>
                        <Text style={styles.subtitle} numberOfLines={1}>
                            {panels.length > 0
                                ? `${tCount("panels.panelsCount", panels.length)} · ${tCount("panels.samplesCount", totalSamples)}`
                                : t("panels.subtitle")}
                        </Text>
                    </View>
                </View>
                {canManage && !adding && panels.length > 0 ? (
                    <Pressable accessibilityRole="button" onPress={() => setAdding(true)} style={({ pressed }) => [styles.primarySmall, pressed && styles.dimmed]}>
                        <Icon name="plus" size={14} color={palette.onAccent} weight="semibold" />
                        <Text style={styles.primarySmallLabel}>{t("panels.addPanel")}</Text>
                    </Pressable>
                ) : null}
            </View>

            {progress.show && progressReplica && progress.total > 0 ? (
                <View style={styles.progress}>
                    <View style={styles.progressRow}>
                        <View style={styles.progressName}>
                            <Icon name={progress.live ? "commission" : "done"} size={13} color="#00bc7d" weight="semibold" />
                            <Text style={styles.progressLabel} numberOfLines={1}>
                                {t("panels.tastingProgress", { name: progressReplica.name })}
                            </Text>
                        </View>
                        <Text style={styles.progressCount}>{t("panels.doneOfTotal", { done: progress.finished, total: progress.total })}</Text>
                    </View>
                    <View style={styles.track}>
                        <View style={[styles.fill, { width: `${(progress.finished / progress.total) * 100}%` }]} />
                    </View>
                </View>
            ) : null}

            {totalSamples >= PANEL_SEARCH_THRESHOLD ? (
                <View style={styles.search}>
                    <Icon name="search" size={14} color={palette.textFaint} />
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder={showRealBeverage ? t("panels.searchPlaceholder") : t("panels.searchPlaceholderBlind")}
                        placeholderTextColor={palette.textFaint}
                        autoCapitalize="none"
                        autoCorrect={false}
                        clearButtonMode="while-editing"
                        style={styles.searchInput}
                        accessibilityLabel={showRealBeverage ? t("panels.searchPlaceholder") : t("panels.searchPlaceholderBlind")}
                    />
                </View>
            ) : null}

            {adding ? (
                <View style={styles.addForm}>
                    <Text style={styles.addTitle}>{t("panels.newPanelTitle")}</Text>
                    <View style={styles.inlineRow}>
                        <TextInput
                            value={newName}
                            onChangeText={setNewName}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={create}
                            placeholder={t("panels.panelNamePlaceholder")}
                            placeholderTextColor={palette.textFaint}
                            style={styles.inlineInput}
                        />
                        <IconButton icon="done" tone="accent" busy={creating} disabled={!newName.trim()} label={t("common.save")} onPress={create} />
                        <IconButton icon="close" tone="plain" label={t("competition.cancel")} onPress={() => setAdding(false)} />
                    </View>
                </View>
            ) : null}

            {panels.length === 0 ? (
                adding ? null : (
                    <View style={styles.empty}>
                        <Icon name="layers" size={32} color={palette.textGhost} />
                        <Text style={styles.emptyTitle}>{t("panels.noPanelsYet")}</Text>
                        <Text style={styles.emptyBody}>{t("panels.createPanelDesc")}</Text>
                        {canManage ? (
                            <Pressable accessibilityRole="button" onPress={() => setAdding(true)} style={({ pressed }) => [styles.primarySmall, styles.emptyButton, pressed && styles.dimmed]}>
                                <Icon name="plus" size={14} color={palette.onAccent} weight="semibold" />
                                <Text style={styles.primarySmallLabel}>{t("panels.addPanel")}</Text>
                            </Pressable>
                        ) : null}
                    </View>
                )
            ) : visible.length === 0 ? (
                <Text style={styles.noResults}>{t("panels.noSearchResults", { query: query.trim() })}</Text>
            ) : (
                <View style={styles.panels}>
                    {visible.map(({ panel, items }) => {
                        const number = panels.findIndex((candidate) => candidate.id === panel.id) + 1
                        const isCollapsed = !searching && collapsed.has(panel.id)
                        const panelProgress = progress.byPanel.get(panel.id)
                        const saving = pendingOrder?.panelId === panel.id
                        return (
                            <View key={panel.id} style={[styles.panel, panelProgress?.isCurrent && styles.panelCurrent]}>
                                {renamingId === panel.id ? (
                                    <View style={[styles.panelHead, styles.inlineRow]}>
                                        <TextInput
                                            value={renameDraft}
                                            onChangeText={setRenameDraft}
                                            autoFocus
                                            returnKeyType="done"
                                            onSubmitEditing={() => rename(panel.id)}
                                            style={styles.inlineInput}
                                        />
                                        <IconButton icon="done" tone="accent" busy={savingName} label={t("common.save")} onPress={() => rename(panel.id)} />
                                        <IconButton icon="close" tone="plain" label={t("competition.cancel")} onPress={() => setRenamingId(null)} />
                                    </View>
                                ) : (
                                    <View style={styles.panelHead}>
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityState={{ expanded: !isCollapsed }}
                                            accessibilityLabel={isCollapsed ? t("panels.expandPanel") : t("panels.collapsePanel")}
                                            onPress={() =>
                                                setCollapsed((previous) => {
                                                    const next = new Set(previous)
                                                    if (next.has(panel.id)) next.delete(panel.id)
                                                    else next.add(panel.id)
                                                    return next
                                                })
                                            }
                                            style={styles.panelToggle}
                                        >
                                            <Icon name={isCollapsed ? "chevron" : "chevronDown"} size={14} color={palette.textFaint} weight="semibold" />
                                            <View style={styles.panelNumber}>
                                                <Text style={styles.panelNumberLabel}>{number}</Text>
                                            </View>
                                            <View style={styles.panelText}>
                                                <Text style={styles.panelName} numberOfLines={1}>
                                                    {panel.name}
                                                </Text>
                                                <Text style={styles.panelMeta}>
                                                    {tCount("panels.samplesCount", items.length)}
                                                    {panelProgress && panelProgress.total > 0 ? (
                                                        <Text style={panelProgress.finished === panelProgress.total ? styles.panelMetaDone : null}>
                                                            {"  ·  "}
                                                            {t("panels.doneOfTotal", { done: panelProgress.finished, total: panelProgress.total })}
                                                        </Text>
                                                    ) : null}
                                                </Text>
                                            </View>
                                            {panelProgress?.isCurrent ? (
                                                <View style={styles.nowBadge}>
                                                    <View style={styles.nowDot} />
                                                    <Text style={styles.nowLabel}>{t("panels.tastingNow")}</Text>
                                                </View>
                                            ) : null}
                                        </Pressable>
                                        {saving ? <ActivityIndicator size="small" color={palette.accentBright} /> : null}
                                        {canManage ? (
                                            <View style={styles.panelActions}>
                                                <IconButton icon="plus" tone="soft" label={t("panels.addSample")} onPress={() => onAddSample(panel)} />
                                                <IconButton
                                                    icon="edit"
                                                    tone="plain"
                                                    label={t("panels.renamePanel")}
                                                    onPress={() => {
                                                        setRenamingId(panel.id)
                                                        setRenameDraft(panel.name)
                                                    }}
                                                />
                                                <IconButton
                                                    icon="trash"
                                                    tone="danger"
                                                    busy={deletingId === panel.id}
                                                    label={t("panels.deletePanel")}
                                                    onPress={() => confirmDelete("panel", panel.id, panel.name)}
                                                />
                                            </View>
                                        ) : null}
                                    </View>
                                )}

                                {panelProgress && panelProgress.total > 0 ? (
                                    <View style={styles.panelTrack}>
                                        <View style={[styles.fill, { width: `${(panelProgress.finished / panelProgress.total) * 100}%` }]} />
                                    </View>
                                ) : null}

                                {isCollapsed ? null : (
                                    <View style={styles.samples}>
                                        {items.length === 0 ? (
                                            canManage ? (
                                                <Pressable accessibilityRole="button" onPress={() => onAddSample(panel)} style={({ pressed }) => [styles.addFirst, pressed && styles.dimmed]}>
                                                    <Icon name="plus" size={14} color={palette.textFaint} />
                                                    <Text style={styles.addFirstLabel}>{t("panels.addFirstSample")}</Text>
                                                </Pressable>
                                            ) : (
                                                <Text style={styles.noSamples}>{t("panels.noCandidatesInPanel")}</Text>
                                            )
                                        ) : (
                                            items.map((candidate, index) => {
                                                const d = describe(candidate)
                                                const position = positionById.get(candidate.id) ?? index
                                                const label = d.beverageName || d.code || t("panels.sampleNumber", { number: position + 1 })
                                                const state = panelProgress?.stateByCandidateId.get(candidate.id) ?? "PENDING"
                                                const look = state !== "PENDING" ? STATE_LOOK[state] : null
                                                const fullIndex = entries.find((entry) => entry.panel.id === panel.id)!.items.indexOf(candidate)
                                                const fullItems = entries.find((entry) => entry.panel.id === panel.id)!.items
                                                return (
                                                    <Pressable
                                                        key={candidate.id}
                                                        accessibilityHint={canManage ? t("panels.sampleActions") : undefined}
                                                        onLongPress={() => showActions(panel.id, fullItems, fullIndex, candidate, label)}
                                                        style={({ pressed }) => [
                                                            styles.sample,
                                                            state === "CURRENT" && styles.sampleCurrent,
                                                            pressed && canManage && styles.samplePressed,
                                                        ]}
                                                    >
                                                        <View
                                                            style={[
                                                                styles.sampleTile,
                                                                look ? { backgroundColor: look.tile, borderColor: look.border } : null,
                                                            ]}
                                                            accessibilityLabel={look ? t(look.labelKey as never) : undefined}
                                                        >
                                                            {look?.icon ? (
                                                                <Icon name={look.icon} size={15} color={look.color} weight="semibold" />
                                                            ) : (
                                                                <Text style={[styles.sampleNumber, look ? { color: look.color } : null]}>{position + 1}</Text>
                                                            )}
                                                        </View>
                                                        <View style={styles.sampleText}>
                                                            <View style={styles.sampleTop}>
                                                                <Text style={[styles.sampleName, !d.beverageName && d.code ? styles.sampleCode : null]} numberOfLines={2}>
                                                                    {d.beverageName || label}
                                                                </Text>
                                                                {d.beverageName && (d.code || canManage) ? (
                                                                    <Pressable
                                                                        accessibilityRole="button"
                                                                        accessibilityLabel={t("panels.editCode")}
                                                                        disabled={!canManage}
                                                                        onPress={() => onEditCode(candidate, label)}
                                                                        style={[styles.codeChip, !d.code && styles.codeChipEmpty]}
                                                                    >
                                                                        {d.code ? <Icon name="tag" size={10} color={palette.warning} /> : null}
                                                                        <Text style={[styles.codeChipLabel, !d.code && styles.codeChipLabelEmpty]}>
                                                                            {d.code || t("panels.addCode")}
                                                                        </Text>
                                                                    </Pressable>
                                                                ) : null}
                                                            </View>
                                                            <View style={styles.sampleMeta}>
                                                                {!d.beverageName ? <Text style={styles.metaText}>{t("panels.blindSample")}</Text> : null}
                                                                {d.typeLabel ? <Meta icon="beverage" text={d.typeLabel} strong /> : null}
                                                                {d.producerName ? <Meta icon="person" text={d.producerName} strong /> : null}
                                                                {d.lotNo ? <Meta icon="barcode" text={t("panels.lotNo", { lot: d.lotNo })} /> : null}
                                                                {d.vintage ? <Text style={styles.vintage}>{d.vintage}</Text> : null}
                                                                {d.volume ? <Meta icon="flask" text={`${d.volume} ml`} /> : null}
                                                            </View>
                                                            {look ? (
                                                                <View style={[styles.stateBadge, { borderColor: look.border, backgroundColor: state === "CURRENT" ? palette.accentSoft : look.tile }]}>
                                                                    <Text style={[styles.stateBadgeLabel, { color: state === "CURRENT" ? palette.accent : look.color }]}>
                                                                        {t(look.labelKey as never)}
                                                                    </Text>
                                                                </View>
                                                            ) : null}
                                                        </View>
                                                        {canManage ? (
                                                            <View style={styles.sampleActions}>
                                                                <IconButton icon="edit" tone="plain" label={t("panels.editCode")} onPress={() => onEditCode(candidate, label)} />
                                                                <IconButton
                                                                    icon="trash"
                                                                    tone="danger"
                                                                    busy={deletingId === candidate.id}
                                                                    label={t("panels.deleteSample")}
                                                                    onPress={() => confirmDelete("candidate", candidate.id, d.code ? `${label} · ${d.code}` : label)}
                                                                />
                                                            </View>
                                                        ) : null}
                                                    </Pressable>
                                                )
                                            })
                                        )}
                                    </View>
                                )}
                            </View>
                        )
                    })}
                </View>
            )}
        </View>
    )
}

function Meta({ icon, text, strong }: { icon: IconName; text: string; strong?: boolean }) {
    return (
        <View style={styles.meta}>
            <Icon name={icon} size={11} color={palette.textFaint} />
            <Text style={[styles.metaText, strong && styles.metaStrong]} numberOfLines={1}>
                {text}
            </Text>
        </View>
    )
}

function IconButton({
    icon,
    tone,
    label,
    busy,
    disabled,
    onPress,
}: {
    icon: IconName
    tone: "accent" | "soft" | "plain" | "danger"
    label: string
    busy?: boolean
    disabled?: boolean
    onPress: () => void
}) {
    const look = {
        accent: { background: palette.accent, color: palette.onAccent },
        soft: { background: palette.accentSoft, color: palette.accent },
        plain: { background: "transparent", color: palette.textFaint },
        danger: { background: "transparent", color: palette.textFaint },
    }[tone]
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            disabled={disabled || busy}
            hitSlop={4}
            onPress={onPress}
            style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: look.background },
                pressed && (tone === "danger" ? styles.dangerPressed : styles.dimmed),
                disabled && styles.dimmed,
            ]}
        >
            {busy ? (
                <ActivityIndicator size="small" color={tone === "accent" ? palette.onAccent : palette.danger} />
            ) : (
                <Icon name={icon} size={14} color={look.color} weight="semibold" />
            )}
        </Pressable>
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
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: "rgba(224, 231, 255, 0.5)",
        backgroundColor: palette.accentSoft,
        ...continuous,
    },
    headerText: { flex: 1, minWidth: 0 },
    title: { fontSize: 16, fontWeight: "700", letterSpacing: -0.3, color: palette.heading },
    subtitle: { fontSize: 12, color: palette.textFaint },
    primarySmall: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
        ...continuous,
    },
    primarySmallLabel: { fontSize: 12, fontWeight: "700", color: palette.onAccent },
    dimmed: { opacity: 0.5 },
    dangerPressed: { backgroundColor: palette.dangerSoft },
    progress: {
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: "rgba(248, 250, 252, 0.6)",
        ...continuous,
    },
    progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    progressName: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 },
    progressLabel: { flexShrink: 1, fontSize: 12, fontWeight: "700", color: palette.textStrong },
    progressCount: { fontSize: 12, fontWeight: "600", color: palette.textMuted, fontVariant: ["tabular-nums"] },
    track: { height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: "rgba(226, 232, 240, 0.7)" },
    fill: { height: "100%", borderRadius: 3, backgroundColor: "#00bc7d" },
    search: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.background,
        ...continuous,
    },
    searchInput: { flex: 1, paddingVertical: 9, fontSize: 13, fontWeight: "500", color: palette.heading },
    addForm: {
        gap: 12,
        padding: 16,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.background,
        ...continuous,
    },
    addTitle: { fontSize: 12, fontWeight: "700", color: palette.heading },
    inlineRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    inlineInput: {
        flex: 1,
        minWidth: 0,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
        fontSize: 13,
        fontWeight: "600",
        color: palette.heading,
    },
    empty: {
        alignItems: "center",
        gap: 8,
        paddingVertical: 40,
        paddingHorizontal: 16,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: palette.border,
        backgroundColor: "rgba(248, 250, 252, 0.4)",
    },
    emptyTitle: { fontSize: 12, fontWeight: "700", color: palette.textStrong },
    emptyBody: { maxWidth: 280, fontSize: 11, lineHeight: 15, color: palette.textFaint, textAlign: "center" },
    emptyButton: { marginTop: 8 },
    noResults: { paddingVertical: 32, fontSize: 12, color: palette.textFaint, textAlign: "center" },
    panels: { gap: 12 },
    panel: { overflow: "hidden", borderRadius: radius.tile, borderWidth: 1, borderColor: "rgba(226, 232, 240, 0.7)", ...continuous },
    panelCurrent: { borderColor: "#c6d2ff", boxShadow: "0 0 0 4px rgba(98, 95, 255, 0.05)" },
    panelHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: palette.surface },
    panelToggle: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
    panelNumber: {
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(224, 231, 255, 0.6)",
        backgroundColor: palette.accentSoft,
    },
    panelNumberLabel: { fontSize: 11, fontWeight: "800", color: palette.accent, fontVariant: ["tabular-nums"] },
    panelText: { flex: 1, minWidth: 0 },
    panelName: { fontSize: 14, fontWeight: "800", color: palette.heading },
    panelMeta: { fontSize: 10, fontWeight: "600", color: palette.textFaint },
    panelMetaDone: { color: palette.positive },
    nowBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.accentSoft,
    },
    nowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.accentBright },
    nowLabel: { fontSize: 10, fontWeight: "700", color: palette.accent },
    panelActions: { flexDirection: "row", alignItems: "center", gap: 2 },
    iconButton: { padding: 7, borderRadius: radius.md },
    panelTrack: { height: 2, backgroundColor: palette.borderSoft },
    samples: { gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: palette.borderSoft, backgroundColor: "rgba(248, 250, 252, 0.5)" },
    addFirst: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 16,
        borderRadius: radius.md,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: palette.border,
    },
    addFirstLabel: { fontSize: 12, fontWeight: "700", color: palette.textFaint },
    noSamples: { paddingVertical: 12, fontSize: 12, fontStyle: "italic", color: palette.textFaint, textAlign: "center" },
    sample: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 10,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
        ...continuous,
    },
    sampleCurrent: { borderColor: palette.accentBorder, boxShadow: "0 1px 3px rgba(99, 102, 241, 0.1)" },
    samplePressed: { backgroundColor: palette.background },
    sampleTile: {
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
    },
    sampleNumber: { fontSize: 11, fontWeight: "800", color: palette.textMuted, fontVariant: ["tabular-nums"] },
    sampleText: { flex: 1, minWidth: 0, gap: 3 },
    // The name keeps its width (up to two lines); the code chip wraps beneath it when there is no room.
    sampleTop: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
    sampleName: { maxWidth: "100%", fontSize: 12, fontWeight: "700", color: palette.heading },
    sampleCode: { fontFamily: MONOSPACE, letterSpacing: 0.5 },
    codeChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#fee685",
        backgroundColor: "#fffbeb",
    },
    codeChipEmpty: { borderStyle: "dashed", borderColor: "#cad5e2", backgroundColor: palette.surface },
    codeChipLabel: { fontFamily: MONOSPACE, fontSize: 10, fontWeight: "700", color: "#bb4d00" },
    codeChipLabelEmpty: { fontFamily: undefined, color: palette.textFaint },
    sampleMeta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 10, rowGap: 2 },
    meta: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "100%" },
    metaText: { fontSize: 10, color: palette.textFaint },
    metaStrong: { fontWeight: "500", color: palette.textMuted },
    vintage: {
        paddingHorizontal: 4,
        borderRadius: 2,
        overflow: "hidden",
        fontSize: 9,
        fontWeight: "600",
        color: palette.accentBright,
        backgroundColor: "rgba(238, 242, 255, 0.6)",
    },
    stateBadge: { alignSelf: "flex-start", marginTop: 2, paddingHorizontal: 8, paddingVertical: 1, borderRadius: radius.pill, borderWidth: 1 },
    stateBadgeLabel: { fontSize: 10, fontWeight: "700" },
    sampleActions: { flexDirection: "row", alignItems: "center" },
})
