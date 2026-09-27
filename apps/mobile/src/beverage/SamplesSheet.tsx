import { useEffect, useMemo, useRef, useState } from "react"
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native"
import { Stack, useRouter } from "expo-router"
import * as Clipboard from "expo-clipboard"
import * as Haptics from "expo-haptics"
import {
    SAMPLE_SEARCH_THRESHOLD,
    batchFigures,
    filterSamples,
    type BeverageBatch,
    type BeverageSample,
} from "@winelore/core/beverage"
import { useTranslation } from "../i18n/LocaleProvider"
import { destinations, useOpenDestination } from "../navigation/destinations"
import { MONOSPACE, continuous, palette, radius } from "../theme"
import { Icon } from "../ui/Icon"
import { SheetLoading, allocationColor } from "./parts"
import { loadBeverage, useLoadedBeverage } from "./useBeveragePage"

/**
 * The web's batch samples modal, as a sheet: how much of the batch has gone
 * to samples, then each sample with its volume and code — which copies on a
 * tap, as the web's does on a click. With more than a handful, the bar
 * carries the system's search field.
 */
export function SamplesSheet({ id, batchId }: { id: string; batchId: string }) {
    const state = useLoadedBeverage(id)
    if (state.status === "loading") return <SheetLoading />
    const batch = state.status === "ready" ? state.page.batches.find((candidate) => candidate.id === batchId) : undefined
    if (!batch) return null
    return <Samples beverageId={id} batch={batch} />
}

function Samples({ beverageId, batch }: { beverageId: string; batch: BeverageBatch }) {
    const { t, locale } = useTranslation()
    const router = useRouter()
    const open = useOpenDestination()
    const [search, setSearch] = useState("")
    const samples = useMemo(() => filterSamples(batch.samples, search), [batch.samples, search])
    const searchable = batch.samples.length > SAMPLE_SEARCH_THRESHOLD

    const addSample = async () => {
        await open(destinations.createSample(batch.id, beverageId))
        loadBeverage(beverageId)
    }

    return (
        <>
            <Stack.Screen
                options={{
                    title: t("sample.modalTitle"),
                    unstable_headerLeftItems: () => [
                        {
                            type: "button",
                            label: t("common.close"),
                            icon: { type: "sfSymbol", name: "xmark" },
                            onPress: () => router.back(),
                        },
                    ],
                    unstable_headerRightItems: () => [
                        {
                            type: "button",
                            label: t("sample.addSampleButton"),
                            variant: "prominent",
                            tintColor: palette.accent,
                            icon: { type: "sfSymbol", name: "plus" },
                            onPress: addSample,
                        },
                    ],
                    headerLeft: () => (
                        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8} style={styles.androidAction}>
                            <Icon name="close" size={22} color={palette.text} />
                        </Pressable>
                    ),
                    headerRight: () => (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t("sample.addSampleButton")}
                            onPress={addSample}
                            hitSlop={8}
                            style={styles.androidAction}
                        >
                            <Icon name="plus" size={22} color={palette.accent} />
                        </Pressable>
                    ),
                    headerSearchBarOptions: searchable
                        ? {
                              placeholder: t("sample.searchPlaceholder"),
                              hideWhenScrolling: false,
                              autoCapitalize: "none",
                              onChangeText: (event) => setSearch(event.nativeEvent.text),
                              onCancelButtonPress: () => setSearch(""),
                          }
                        : undefined,
                }}
            />
            <FlatList
                style={styles.screen}
                contentContainerStyle={styles.content}
                contentInsetAdjustmentBehavior="automatic"
                keyboardDismissMode="on-drag"
                data={samples}
                keyExtractor={(sample) => sample.id}
                ListHeaderComponent={<Summary batch={batch} />}
                renderItem={({ item, index }) => <SampleRow sample={item} index={index} />}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Icon name="flask" size={40} color={palette.textSubtle} />
                        <Text style={styles.emptyText}>
                            {search ? t("sample.noSamplesMatch") : t("sample.emptySamplesDesc")}
                        </Text>
                    </View>
                }
                ListFooterComponent={
                    <Text style={styles.footer}>
                        {t("sample.samplesTitle")}: <Text style={styles.footerCount}>{batch.samples.length.toLocaleString(locale)}</Text>
                    </Text>
                }
            />
        </>
    )
}

/** Which batch this is, and how much of it has gone to samples. */
function Summary({ batch }: { batch: BeverageBatch }) {
    const { t, locale } = useTranslation()
    const figures = batchFigures(batch)
    const ml = t("common.milliliters")
    const used = figures.sampleVolume.toLocaleString(locale)
    const remaining = figures.batchVolume !== null ? Math.max(0, figures.batchVolume - figures.sampleVolume) : null

    return (
        <View style={styles.summary}>
            <View style={styles.summaryHead}>
                <View style={styles.summaryTile}>
                    <Icon name="flask" size={20} color={palette.accent} />
                </View>
                <View style={styles.summaryText}>
                    <Text style={styles.lot} numberOfLines={1}>
                        {batch.lotNumber || `ID: ${batch.id.slice(-6).toUpperCase()}`}
                    </Text>
                    <Text style={styles.summarySubtitle}>
                        {figures.batchVolume !== null
                            ? t("sample.modalSubtitle", {
                                  count: batch.samples.length,
                                  used,
                                  total: figures.batchVolume.toLocaleString(locale),
                              })
                            : t("sample.modalSubtitleNoLimit", { count: batch.samples.length, used })}
                    </Text>
                </View>
            </View>

            {figures.batchVolume !== null && figures.allocationTone ? (
                <View style={styles.allocation}>
                    <View style={styles.allocationRow}>
                        <Text style={styles.allocationText}>
                            {t("sample.allocatedVolume", { used, total: figures.batchVolume.toLocaleString(locale) })}
                        </Text>
                        <Text style={[styles.allocationText, figures.allocationTone === "over" && styles.over]}>
                            {t("sample.batchVolumeRemaining")}:{" "}
                            <Text style={[styles.remaining, remaining === 0 && styles.over]}>
                                {remaining!.toLocaleString(locale)} {ml}
                            </Text>
                        </Text>
                    </View>
                    <View style={styles.track}>
                        <View
                            style={[
                                styles.fill,
                                {
                                    width: `${(figures.allocatedFraction ?? 0) * 100}%`,
                                    backgroundColor: allocationColor[figures.allocationTone],
                                },
                            ]}
                        />
                    </View>
                </View>
            ) : null}
        </View>
    )
}

function SampleRow({ sample, index }: { sample: BeverageSample; index: number }) {
    const { t, locale, formatDateTime } = useTranslation()
    const [copied, setCopied] = useState(false)
    const reset = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => () => {
        if (reset.current) clearTimeout(reset.current)
    }, [])

    const code = sample.id.slice(-6).toUpperCase()
    const copy = async () => {
        await Clipboard.setStringAsync(sample.id)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        setCopied(true)
        if (reset.current) clearTimeout(reset.current)
        reset.current = setTimeout(() => setCopied(false), 2000)
    }

    return (
        <View style={styles.row}>
            <View style={styles.number}>
                <Text style={styles.numberLabel}>#{index + 1}</Text>
            </View>
            <View style={styles.rowText}>
                <View style={styles.rowLine}>
                    <Icon name="droplet" size={14} color={palette.accentBright} />
                    <Text style={styles.volume}>
                        {sample.volumeMl ? `${sample.volumeMl.toLocaleString(locale)} ${t("common.milliliters")}` : t("common.standard")}
                    </Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={copied ? t("sample.copyIdSuccess") : `#${code}`}
                        accessibilityHint={sample.id}
                        onPress={copy}
                        hitSlop={6}
                        style={({ pressed }) => [styles.code, (pressed || copied) && styles.codeActive]}
                    >
                        <Text style={[styles.codeLabel, copied && styles.codeLabelActive]}>#{code}</Text>
                        <Icon
                            name={copied ? "done" : "copy"}
                            size={10}
                            color={copied ? palette.positive : palette.textFaint}
                            weight="semibold"
                        />
                    </Pressable>
                </View>
                {sample.createdAt ? (
                    <View style={styles.rowLine}>
                        <Icon name="calendar" size={12} color={palette.textFaint} />
                        <Text style={styles.created}>{formatDateTime(sample.createdAt)}</Text>
                    </View>
                ) : null}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.surface },
    content: { padding: 20, paddingBottom: 32 },
    androidAction: { padding: 8 },
    summary: { gap: 14, marginBottom: 20 },
    summaryHead: { flexDirection: "row", alignItems: "center", gap: 12 },
    summaryTile: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: palette.accentSoft,
        ...continuous,
    },
    summaryText: { flex: 1, minWidth: 0 },
    lot: { fontSize: 16, fontWeight: "800", color: palette.heading },
    summarySubtitle: { marginTop: 2, fontSize: 12, fontWeight: "600", color: palette.textFaint },
    allocation: {
        padding: 14,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
        ...continuous,
    },
    allocationRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 6 },
    allocationText: { fontSize: 12, fontWeight: "600", color: palette.textMuted },
    remaining: { fontWeight: "800", color: "#432dd7" },
    over: { color: palette.danger },
    track: { marginTop: 8, height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: palette.border },
    fill: { height: "100%", borderRadius: 4 },
    separator: { height: 10 },
    // p-3.5 rounded-2xl border-slate-100 bg-slate-50/40
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: "rgba(248, 250, 252, 0.4)",
        ...continuous,
    },
    number: {
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.surface,
    },
    numberLabel: { fontSize: 11, fontWeight: "700", color: palette.textFaint },
    rowText: { flex: 1, minWidth: 0, gap: 4 },
    rowLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
    volume: { fontSize: 12, fontWeight: "800", color: palette.heading },
    code: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginLeft: 2,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
    },
    codeActive: { borderColor: "#c6d2ff" },
    codeLabel: { fontFamily: MONOSPACE, fontSize: 10, fontWeight: "700", color: palette.textMuted },
    codeLabelActive: { color: palette.accent },
    created: { fontSize: 10, fontWeight: "500", color: palette.textFaint },
    empty: { alignItems: "center", gap: 8, paddingVertical: 48 },
    emptyText: { fontSize: 12, fontWeight: "700", color: palette.textMuted },
    footer: { marginTop: 20, fontSize: 12, fontWeight: "600", color: palette.textMuted, textAlign: "center" },
    footerCount: { fontWeight: "800", color: palette.heading },
})
