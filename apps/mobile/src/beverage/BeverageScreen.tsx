import { useMemo, useRef, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
    type LayoutChangeEvent,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from "react-native"
import { Stack, useRouter } from "expo-router"
import { useHeaderHeight } from "expo-router/react-navigation"
import * as Haptics from "expo-haptics"
import {
    beverageCreatorAuid,
    beverageTabs,
    defaultBeverageTab,
    isBeverageProducer,
    isBeverageTab,
    producerAuid,
    technicalSpecs,
    type BeveragePageData,
    type BeverageTab,
} from "@winelore/core/beverage"
import { useTranslation } from "../i18n/LocaleProvider"
import { useOnChanged } from "../navigation/changes"
import { destinations, useOpenDestination } from "../navigation/destinations"
import { palette, radius } from "../theme"
import { Icon } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"
import { panelSurface } from "../ui/Surface"
import { useDisplayNames } from "../users/useDisplayNames"
import { AwardsTab } from "./AwardsTab"
import { BatchesTab } from "./BatchesTab"
import { HeaderCard } from "./HeaderCard"
import { submitBeverageForReview } from "./mutations"
import { SpecsTab } from "./SpecsTab"
import { TabStrip, type TabOption } from "./parts"
import { patchBeverage, useBeveragePage } from "./useBeveragePage"

/**
 * The web's /beverage/[id], stacked as its phone layout stacks it: the
 * beverage's card, then its tabs — technical specs, vintages and batches,
 * awards.
 *
 * A producer edits it in a sheet, as the web edits it in a modal, and a
 * batch's samples open in a sheet too, and so do the create forms for a batch
 * and a sample; the page reloads when one is made.
 */
export function BeverageScreen({ id, tab }: { id: string; tab?: string }) {
    const { t } = useTranslation()
    const open = useOpenDestination()
    const { state, reload } = useBeveragePage(id)
    const [refreshing, setRefreshing] = useState(false)

    const refresh = async () => {
        setRefreshing(true)
        await reload()
        setRefreshing(false)
    }

    const header = (title: string) => <Stack.Screen options={{ title, headerLargeTitle: false }} />

    if (state.status === "loading") {
        return (
            <>
                {header("")}
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
                {header("")}
                <ScrollView
                    style={styles.screen}
                    contentContainerStyle={styles.content}
                    contentInsetAdjustmentBehavior="automatic"
                >
                    <View style={[panelSurface, styles.missing]}>
                        <View style={[styles.missingTile, failed && styles.missingTileError]}>
                            <Icon name={failed ? "alert" : "beverage"} size={40} color={failed ? palette.danger : palette.textFaint} />
                        </View>
                        <Text style={styles.missingTitle}>
                            {failed ? t("beverage.errorLoading") : t("beverage.notFoundTitle")}
                        </Text>
                        <Text style={styles.missingBody}>{failed ? t("beverage.tryAgain") : t("beverage.notFoundDesc")}</Text>
                        <PressableSurface
                            onPress={() => (failed ? reload() : open(destinations.myBeverages))}
                            style={styles.missingButton}
                        >
                            <Text style={styles.missingButtonLabel}>
                                {failed ? t("errors.retry") : t("beverage.backToMyBeverages")}
                            </Text>
                        </PressableSurface>
                    </View>
                </ScrollView>
            </>
        )
    }

    return (
        <Loaded
            page={state.page}
            auid={state.auid}
            requestedTab={tab}
            reload={reload}
            refreshing={refreshing}
            onRefresh={refresh}
            header={header}
        />
    )
}

function Loaded({
    page,
    auid,
    requestedTab,
    reload,
    refreshing,
    onRefresh,
    header,
}: {
    page: BeveragePageData
    auid: string | null
    requestedTab?: string
    reload: () => Promise<void>
    refreshing: boolean
    onRefresh: () => void
    header: (title: string) => React.ReactNode
}) {
    const { t } = useTranslation()
    const router = useRouter()
    const open = useOpenDestination()
    const headerHeight = useHeaderHeight()
    const { beverage, awards, batches } = page

    const specs = useMemo(() => technicalSpecs(beverage.attributes), [beverage.attributes])
    // Chosen once, as the web chooses on load: the tab asked for, else specs when there are any.
    const [tab, setTab] = useState<BeverageTab>(() =>
        isBeverageTab(requestedTab) ? requestedTab : defaultBeverageTab(specs.length),
    )
    const [submitting, setSubmitting] = useState(false)
    const [titleShown, setTitleShown] = useState(false)
    const cardY = useRef(0)
    const nameBottom = useRef(0)

    const people = useMemo(() => {
        const ids = (beverage.producers ?? []).map(producerAuid).filter((auid) => auid !== null)
        const creator = beverageCreatorAuid(beverage)
        if (creator !== null) ids.push(creator)
        return ids.map(String)
    }, [beverage])
    const usernames = useDisplayNames(people)
    const isProducer = isBeverageProducer(beverage.producers, auid)

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        // Content starts under the header, so the name has gone once the
        // offset past the header's edge reaches its bottom.
        const shown = event.nativeEvent.contentOffset.y + headerHeight > cardY.current + nameBottom.current
        if (shown !== titleShown) setTitleShown(shown)
    }

    /**
     * Submitting cannot be taken back, and a phone is easier to tap by
     * accident than a desk, so it asks first — where the web does not.
     */
    const submit = () =>
        Alert.alert(t("beverage.submitReviewButton"), t("beverage.submitReviewDescription"), [
            { text: t("competition.cancel"), style: "cancel" },
            {
                text: t("beverage.submitReviewButton"),
                onPress: async () => {
                    setSubmitting(true)
                    try {
                        const updated = await submitBeverageForReview(beverage.id, auid ?? "")
                        patchBeverage(beverage.id, { status: updated?.status || "IN_REVIEW" })
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                    } catch (error) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                        Alert.alert(
                            t("beverage.submitReviewError"),
                            error instanceof Error ? error.message : String(error),
                        )
                    } finally {
                        setSubmitting(false)
                    }
                },
            },
        ])

    // A batch or sample created from its sheet shows here once it is made.
    useOnChanged(`beverage:${beverage.id}`, reload)

    const tabs: TabOption[] = beverageTabs(specs.length).map((id) =>
        id === "specs"
            ? { id, label: t("beverage.tabs.specs"), icon: "specs" }
            : id === "batches"
              ? { id, label: t("beverage.tabs.batches"), icon: "barcode", count: batches.length }
              : { id, label: t("beverage.tabs.awards"), icon: "competition", count: awards.length },
    )

    return (
        <>
            {header(titleShown ? beverage.name : "")}
            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
                contentInsetAdjustmentBehavior="automatic"
                onScroll={onScroll}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={palette.accent}
                        colors={[palette.accent]}
                    />
                }
            >
                <View onLayout={(event: LayoutChangeEvent) => (cardY.current = event.nativeEvent.layout.y)}>
                    <HeaderCard
                        page={page}
                        usernames={usernames}
                        isProducer={isProducer}
                        submitting={submitting}
                        onEdit={() => {
                            Haptics.selectionAsync()
                            router.push(`/beverage/${beverage.id}/edit`)
                        }}
                        onSubmitForReview={submit}
                        onNameLayout={(event) => {
                            // Relative to the card; its own offset is added on scroll.
                            const { y, height } = event.nativeEvent.layout
                            nameBottom.current = y + height
                        }}
                    />
                </View>

                <TabStrip tabs={tabs} current={tab} onChange={setTab} />

                {tab === "batches" ? (
                    <BatchesTab
                        batches={batches}
                        onCreateBatch={() => open(destinations.createBatch(beverage.id))}
                        onAddSample={(batch) => open(destinations.createSample(batch.id, beverage.id))}
                        onShowSamples={(batch) => {
                            Haptics.selectionAsync()
                            router.push(`/beverage/${beverage.id}/samples/${batch.id}`)
                        }}
                    />
                ) : tab === "awards" ? (
                    <AwardsTab awards={awards} />
                ) : (
                    <SpecsTab specs={specs} />
                )}
            </ScrollView>
        </>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 24 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.background },
    missing: { alignItems: "center", paddingVertical: 48, gap: 8 },
    missingTile: {
        width: 80,
        height: 80,
        marginBottom: 16,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
    },
    missingTileError: { borderColor: palette.dangerBorder, backgroundColor: palette.dangerSoft },
    missingTitle: { fontSize: 22, fontWeight: "800", color: palette.heading, textAlign: "center" },
    missingBody: { fontSize: 14, lineHeight: 20, color: palette.textMuted, textAlign: "center" },
    missingButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
    },
    missingButtonLabel: { fontSize: 14, fontWeight: "700", color: palette.onAccent },
})
