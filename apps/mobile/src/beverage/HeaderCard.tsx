import { useEffect, useMemo, useRef, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Animated,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    type KeyboardTypeOptions,
    type LayoutChangeEvent,
} from "react-native"
import * as Haptics from "expo-haptics"
import {
    ADDABLE_PRODUCER_ROLES,
    beverageColor,
    beverageCreatorAuid,
    beverageStatusTone,
    producerAuid,
    producerName,
    producerRoleKey,
    type AddableProducerRole,
    type BeveragePageData,
    type BeverageProducer,
    type BeverageStatusTone,
} from "@winelore/core/beverage"
import { useBeverageOrigins } from "../geocoding/useBeverageOrigins"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius } from "../theme"
import { Icon, type IconName } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"
import { Segmented } from "../ui/Segmented"
import { panelSurface } from "../ui/Surface"
import { HolderAvatar } from "../competition/parts"
import { useAvatarUrls } from "../users/useAvatarUrls"
import { useUserSearch } from "../users/useUserSearch"
import { patchBeverage } from "./useBeveragePage"
import { registerBeverageProducer, unregisterBeverageProducer } from "./mutations"

interface HeaderCardProps {
    page: BeveragePageData
    usernames: Record<string, string>
    auid: string | null
    isProducer: boolean
    submitting: boolean
    nameBusy: boolean
    originBusy: boolean
    onRename: (name: string) => Promise<boolean>
    onSaveOrigin: (origin: { latitude: number; longitude: number } | null) => Promise<boolean>
    onSubmitForReview: () => void
    /** Where the name ends within the card, so the screen can title itself once it scrolls away. */
    onNameLayout: (event: LayoutChangeEvent) => void
}

// A coordinate can be negative, and iOS's decimal pad has no minus key.
const COORDINATE_KEYBOARD: KeyboardTypeOptions = Platform.select({
    ios: "numbers-and-punctuation",
    default: "numeric",
})

/**
 * The beverage's own card, as the web stacks it on a phone: the wine tile,
 * its type, colour and id, the name (editable in place by a producer, as a
 * competition's name is), the status (and a producer's "Submit for Review"),
 * then where it is from (edited in place too), who makes it (changed in
 * place as well) and when it was entered.
 */
export function HeaderCard({
    page,
    usernames,
    auid,
    isProducer,
    submitting,
    nameBusy,
    originBusy,
    onRename,
    onSaveOrigin,
    onSubmitForReview,
    onNameLayout,
}: HeaderCardProps) {
    const { t, formatBeverageType, formatDateTime } = useTranslation()
    const { beverage } = page
    const color = beverageColor(beverage.attributes)
    const creator = beverageCreatorAuid(beverage)

    const [editingName, setEditingName] = useState(false)
    const [nameDraft, setNameDraft] = useState("")

    const [originDraft, setOriginDraft] = useState<{ latitude: string; longitude: string } | null>(null)
    const editingOrigin = originDraft !== null

    const saveName = async () => {
        if (await onRename(nameDraft)) setEditingName(false)
    }

    const startEditingOrigin = () =>
        setOriginDraft({
            latitude: beverage.origin?.latitude != null ? String(beverage.origin.latitude) : "",
            longitude: beverage.origin?.longitude != null ? String(beverage.origin.longitude) : "",
        })

    const saveOrigin = async () => {
        if (!originDraft) return
        const latRaw = originDraft.latitude.trim()
        const lngRaw = originDraft.longitude.trim()
        if ((latRaw && !lngRaw) || (!latRaw && lngRaw)) {
            Alert.alert(t("beverage.edit.originLabel"), t("beverage.edit.saveError"))
            return
        }
        const lat = latRaw ? Number(latRaw) : null
        const lng = lngRaw ? Number(lngRaw) : null
        if ((latRaw && !Number.isFinite(lat)) || (lngRaw && !Number.isFinite(lng))) {
            Alert.alert(t("beverage.edit.originLabel"), t("beverage.createErrorCoords"))
            return
        }
        const saved = await onSaveOrigin(lat !== null && lng !== null ? { latitude: lat, longitude: lng } : null)
        if (saved) setOriginDraft(null)
    }

    return (
        <View style={[panelSurface, styles.card]}>
            <View style={styles.tile}>
                <Icon name="beverage" size={40} color={palette.accentSoft} />
            </View>

            <View style={styles.chips}>
                <View style={[styles.chip, styles.typeChip]}>
                    <Text style={[styles.chipLabel, styles.typeChipLabel]}>{page.typeName || "Beverage"}</Text>
                </View>
                {color ? (
                    <View style={[styles.chip, styles.colorChip]}>
                        <ColorDot color={color} />
                        <Text style={[styles.chipLabel, styles.colorChipLabel]}>{formatBeverageType(color)}</Text>
                    </View>
                ) : null}
                <View style={[styles.chip, styles.idChip]}>
                    <Text style={[styles.chipLabel, styles.idChipLabel]}>ID: {beverage.id.slice(-6)}</Text>
                </View>
            </View>

            <View style={styles.nameRow} onLayout={onNameLayout}>
                {editingName ? (
                    <View style={styles.editRow}>
                        <TextInput
                            value={nameDraft}
                            onChangeText={setNameDraft}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={saveName}
                            editable={!nameBusy}
                            style={styles.nameInput}
                            accessibilityLabel={t("beverage.edit.button")}
                        />
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t("common.save")}
                            onPress={saveName}
                            disabled={nameBusy}
                            style={({ pressed }) => [styles.saveButton, (pressed || nameBusy) && styles.dimmed]}
                        >
                            {nameBusy ? (
                                <ActivityIndicator size="small" color={palette.onAccent} />
                            ) : (
                                <Icon name="done" size={16} color={palette.onAccent} weight="bold" />
                            )}
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t("competition.cancel")}
                            onPress={() => setEditingName(false)}
                            disabled={nameBusy}
                            style={({ pressed }) => [styles.cancelButton, pressed && styles.dimmed]}
                        >
                            <Icon name="close" size={16} color={palette.textMuted} weight="bold" />
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.nameDisplayRow}>
                        <Text style={styles.name} accessibilityRole="header">
                            {beverage.name}
                        </Text>
                        {isProducer ? (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t("beverage.edit.button")}
                                hitSlop={8}
                                onPress={() => {
                                    Haptics.selectionAsync()
                                    setNameDraft(beverage.name)
                                    setEditingName(true)
                                }}
                                style={({ pressed }) => [styles.pencil, pressed && styles.pencilPressed]}
                            >
                                <Icon name="edit" size={16} color={palette.textFaint} />
                            </Pressable>
                        ) : null}
                    </View>
                )}
            </View>

            <View style={styles.statusRow}>
                {beverage.status === "DRAFT" && isProducer ? (
                    <PressableSurface
                        onPress={onSubmitForReview}
                        disabled={submitting}
                        style={[styles.submit, submitting && styles.submitBusy]}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={palette.onAccent} />
                        ) : (
                            <Icon name="send" size={14} color={palette.onAccent} weight="semibold" />
                        )}
                        <Text style={styles.submitLabel}>{t("beverage.submitReviewButton")}</Text>
                    </PressableSurface>
                ) : null}
                <StatusBadge status={beverage.status} />
            </View>

            <View style={styles.divider} />

            <View style={styles.meta}>
                <View style={styles.metaBlock}>
                    <View style={styles.metaLabelRow}>
                        <View style={styles.metaLabelWithIcon}>
                            <Icon name="location" size={14} color={palette.accentBright} />
                            <Text style={styles.metaLabel}>{t("beverage.origin")}</Text>
                        </View>
                        {isProducer ? (
                            editingOrigin ? (
                                <View style={styles.editActions}>
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel={t("common.saveDates")}
                                        onPress={saveOrigin}
                                        disabled={originBusy}
                                        style={({ pressed }) => [styles.saveLabelButton, (pressed || originBusy) && styles.dimmed]}
                                    >
                                        {originBusy ? (
                                            <ActivityIndicator size="small" color={palette.onAccent} />
                                        ) : (
                                            <Icon name="done" size={14} color={palette.onAccent} weight="bold" />
                                        )}
                                        <Text style={styles.saveLabelText}>{t("common.save")}</Text>
                                    </Pressable>
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel={t("competition.cancel")}
                                        onPress={() => setOriginDraft(null)}
                                        disabled={originBusy}
                                        style={({ pressed }) => [styles.cancelSmallButton, pressed && styles.dimmed]}
                                    >
                                        <Icon name="close" size={14} color={palette.textMuted} weight="bold" />
                                    </Pressable>
                                </View>
                            ) : (
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={t("common.editPlannedDates")}
                                    hitSlop={8}
                                    onPress={() => {
                                        Haptics.selectionAsync()
                                        startEditingOrigin()
                                    }}
                                    style={({ pressed }) => [styles.pencil, pressed && styles.dimmed]}
                                >
                                    <Icon name="edit" size={16} color={palette.textFaint} />
                                </Pressable>
                            )
                        ) : null}
                    </View>
                    {editingOrigin && originDraft ? (
                        <View style={styles.coordinates}>
                            <View style={styles.coordinate}>
                                <Text style={styles.smallLabel}>{t("beverage.edit.latitudeLabel")}</Text>
                                <TextInput
                                    value={originDraft.latitude}
                                    onChangeText={(value) => setOriginDraft({ ...originDraft, latitude: value })}
                                    keyboardType={COORDINATE_KEYBOARD}
                                    editable={!originBusy}
                                    style={[styles.input, styles.coordinateInput]}
                                    accessibilityLabel={t("beverage.edit.latitudeLabel")}
                                />
                            </View>
                            <View style={styles.coordinate}>
                                <Text style={styles.smallLabel}>{t("beverage.edit.longitudeLabel")}</Text>
                                <TextInput
                                    value={originDraft.longitude}
                                    onChangeText={(value) => setOriginDraft({ ...originDraft, longitude: value })}
                                    keyboardType={COORDINATE_KEYBOARD}
                                    editable={!originBusy}
                                    style={[styles.input, styles.coordinateInput]}
                                    accessibilityLabel={t("beverage.edit.longitudeLabel")}
                                />
                            </View>
                        </View>
                    ) : (
                        <Origin page={page} />
                    )}
                </View>
                <Producers beverageId={beverage.id} producers={beverage.producers ?? []} usernames={usernames} auid={auid} isProducer={isProducer} />
                <MetaBlock icon="calendar" label={t("beverage.created")}>
                    <Text style={styles.metaValue}>{formatDateTime(beverage.createdAt)}</Text>
                    {creator !== null ? (
                        <Text style={styles.enteredBy}>
                            {t("beverage.enteredBy")}:{" "}
                            <Text style={styles.enteredByName}>{usernames[creator] || `AUID ${creator}`}</Text>
                        </Text>
                    ) : null}
                </MetaBlock>
            </View>
        </View>
    )
}

/**
 * Where the beverage comes from. The web names the place from a server-side
 * lookup; here the lookup runs on the phone, so the coordinates stand in
 * until the name arrives — and are what stays if it cannot be found.
 */
function Origin({ page }: { page: BeveragePageData }) {
    const { t } = useTranslation()
    const origin = page.beverage.origin
    const located = typeof origin?.latitude === "number" && typeof origin?.longitude === "number"
    // Keyed by the point, so an edited origin is looked up afresh.
    const point = useMemo(
        () =>
            located ? [{ id: `${origin!.latitude},${origin!.longitude}`, origin: origin as { latitude: number; longitude: number } }] : [],
        [located, origin],
    )
    const parts = useBeverageOrigins(point)[point[0]?.id ?? ""]

    if (!located) return <Text style={styles.metaMissing}>{t("common.na")}</Text>
    return (
        <Text style={[styles.metaValue, !parts && styles.tabular]}>
            {parts ? parts.join(", ") : `${origin!.latitude!.toFixed(4)}, ${origin!.longitude!.toFixed(4)}`}
        </Text>
    )
}

function MetaBlock({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
    return (
        <View style={styles.metaBlock}>
            <View style={styles.metaLabelRow}>
                <Icon name={icon} size={14} color={palette.accentBright} />
                <Text style={styles.metaLabel}>{label}</Text>
            </View>
            {children}
        </View>
    )
}

function Producers({
    beverageId,
    producers,
    usernames,
    auid,
    isProducer,
}: {
    beverageId: string
    producers: BeverageProducer[]
    usernames: Record<string, string>
    auid: string | null
    isProducer: boolean
}) {
    const { t } = useTranslation()
    const [removing, setRemoving] = useState<string | null>(null)
    const [adding, setAdding] = useState(false)
    const avatarUrls = useAvatarUrls(
        producers.flatMap((producer) => {
            const id = producerAuid(producer)
            return id === null ? [] : [String(id)]
        }),
    )

    const label = (producer: BeverageProducer) => {
        const producerId = producerAuid(producer)
        return producerName(
            { ...producer, displayName: producerId !== null ? usernames[producerId] : null },
            t("common.unknownUser"),
        )
    }

    /**
     * Removing a producer is asked about first — the web does not — since
     * removing yourself takes away your own right to edit the beverage.
     */
    const remove = (producer: BeverageProducer) =>
        Alert.alert(t("beverage.edit.removeProducer"), label(producer), [
            { text: t("competition.cancel"), style: "cancel" },
            {
                text: t("beverage.edit.removeProducer"),
                style: "destructive",
                onPress: async () => {
                    setRemoving(producer.id)
                    try {
                        const updated = await unregisterBeverageProducer(beverageId, producer.id, auid ?? "")
                        patchBeverage(beverageId, { producers: updated.producers })
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                    } catch (error) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                        Alert.alert(
                            t("beverage.edit.removeProducerError"),
                            error instanceof Error ? error.message : String(error),
                        )
                    } finally {
                        setRemoving(null)
                    }
                },
            },
        ])

    return (
        <View style={styles.metaBlock}>
            <View style={styles.metaLabelRow}>
                <View style={styles.metaLabelWithIcon}>
                    <Icon name="people" size={14} color={palette.accentBright} />
                    <Text style={styles.metaLabel}>{t("beverage.producers")}</Text>
                </View>
                {isProducer && !adding ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("beverage.edit.addProducer")}
                        hitSlop={8}
                        onPress={() => {
                            Haptics.selectionAsync()
                            setAdding(true)
                        }}
                        style={({ pressed }) => [styles.addButton, pressed && styles.dimmed]}
                    >
                        <Icon name="personAdd" size={14} color={palette.onAccent} weight="bold" />
                        <Text style={styles.addButtonLabel}>{t("beverage.edit.addProducer")}</Text>
                    </Pressable>
                ) : null}
            </View>

            {producers.length > 0 ? (
                <View style={styles.producerList}>
                    {producers.map((producer) => {
                        const producerId = producerAuid(producer)
                        const roleKey = producerRoleKey(producer.role)
                        return (
                            <View key={producer.id} style={styles.producer}>
                                <HolderAvatar
                                    auid={producerId ?? 0}
                                    username={label(producer)}
                                    size={32}
                                    imageUrl={producerId === null ? null : avatarUrls[String(producerId)]}
                                />
                                <View style={styles.producerText}>
                                    <Text style={styles.producerName} numberOfLines={1}>
                                        {label(producer)}
                                    </Text>
                                    <Text style={styles.producerRole}>{roleKey ? t(roleKey) : producer.role}</Text>
                                </View>
                                {isProducer ? (
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel={`${t("beverage.edit.removeProducer")}, ${label(producer)}`}
                                        hitSlop={8}
                                        disabled={removing === producer.id}
                                        onPress={() => remove(producer)}
                                        style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}
                                    >
                                        {removing === producer.id ? (
                                            <ActivityIndicator size="small" color={palette.textFaint} />
                                        ) : (
                                            <Icon name="trash" size={16} color={palette.textFaint} />
                                        )}
                                    </Pressable>
                                ) : null}
                            </View>
                        )
                    })}
                </View>
            ) : adding ? null : (
                <Text style={styles.metaMissing}>{t("common.na")}</Text>
            )}

            {isProducer && adding ? (
                <AddProducer beverageId={beverageId} auid={auid} onDone={() => setAdding(false)} />
            ) : null}
        </View>
    )
}

function AddProducer({ beverageId, auid, onDone }: { beverageId: string; auid: string | null; onDone: () => void }) {
    const { t } = useTranslation()
    const [username, setUsername] = useState("")
    const { searching, error: searchError, found } = useUserSearch(username, {
        notFound: t("beverage.edit.userNotFound"),
        failed: t("beverage.edit.searchError"),
    })
    const avatarUrls = useAvatarUrls(found ? [String(found.auid)] : [])
    const [role, setRole] = useState<AddableProducerRole>("MAKER")
    const [addingProducer, setAddingProducer] = useState(false)

    const add = async () => {
        if (!found) return
        setAddingProducer(true)
        try {
            const updated = await registerBeverageProducer(beverageId, found.auid, role, auid ?? "")
            patchBeverage(beverageId, { producers: updated.producers })
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            onDone()
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert(t("beverage.edit.addProducerError"), error instanceof Error ? error.message : String(error))
        } finally {
            setAddingProducer(false)
        }
    }

    return (
        <View style={styles.addBox}>
            <View style={styles.usernameField}>
                <Text style={styles.at}>@</Text>
                <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder={t("beverage.edit.usernameLabel")}
                    placeholderTextColor={palette.textFaint}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="username"
                    style={styles.usernameInput}
                    accessibilityLabel={t("beverage.edit.usernameLabel")}
                />
                {searching ? <ActivityIndicator size="small" color={palette.accent} /> : null}
            </View>

            {searchError ? (
                <View style={styles.error}>
                    <Icon name="alert" size={14} color={palette.danger} />
                    <Text style={styles.errorText}>{searchError}</Text>
                </View>
            ) : null}

            {found ? (
                <View style={styles.found}>
                    <View style={styles.foundUser}>
                        <HolderAvatar
                            auid={found.auid}
                            username={found.displayName}
                            size={36}
                            imageUrl={avatarUrls[String(found.auid)]}
                        />
                        <View style={styles.producerText}>
                            <Text style={styles.producerName} numberOfLines={1}>
                                {found.displayName}
                            </Text>
                            <Text style={styles.foundUsername}>@{found.username}</Text>
                        </View>
                    </View>
                    <Segmented
                        options={ADDABLE_PRODUCER_ROLES.map((value) => ({
                            value,
                            label: t(value === "MAKER" ? "roles.maker" : "roles.bottler"),
                        }))}
                        value={role}
                        onChange={setRole}
                        accessibilityLabel={t("beverage.edit.roleLabel")}
                    />
                </View>
            ) : null}

            <View style={styles.addFooter}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("competition.cancel")}
                    onPress={onDone}
                    disabled={addingProducer}
                    style={({ pressed }) => [styles.footerCancel, pressed && styles.dimmed]}
                >
                    <Text style={styles.footerCancelLabel}>{t("competition.cancel")}</Text>
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("beverage.edit.addProducer")}
                    onPress={add}
                    disabled={!found || addingProducer}
                    style={({ pressed }) => [styles.footerAdd, (!found || addingProducer || pressed) && styles.dimmed]}
                >
                    {addingProducer ? (
                        <ActivityIndicator size="small" color={palette.onAccent} />
                    ) : (
                        <Icon name="personAdd" size={14} color={palette.onAccent} weight="bold" />
                    )}
                    <Text style={styles.footerAddLabel}>{t("beverage.edit.addProducer")}</Text>
                </Pressable>
            </View>
        </View>
    )
}

// --- Colour dot -------------------------------------------------------------

// The web's getColorDotClass: bg-*-* with a border one step darker.
const DOTS: Record<string, { fill: string; border: string }> = {
    RED: { fill: "#e7000b", border: "#c10007" }, // red-600 / red-700
    ROSE: { fill: "#fb64b6", border: "#f6339a" }, // pink-400 / pink-500
    WHITE: { fill: "#fef3c6", border: "#ffd230" }, // amber-100 / amber-300
    SPARKLING: { fill: "#ffdf20", border: "#fac800" }, // yellow-300 / yellow-400
    FORTIFIED: { fill: "#973c00", border: "#7b3306" }, // amber-800 / amber-900
}
const DEFAULT_DOT = { fill: palette.accentBright, border: palette.accent } // indigo-500 / indigo-600

function ColorDot({ color }: { color: string }) {
    const upper = color.toUpperCase()
    const dot = DOTS[upper] ?? DEFAULT_DOT
    // Sparkling pulses on the web (animate-pulse).
    const opacity = useRef(new Animated.Value(1)).current
    useEffect(() => {
        if (upper !== "SPARKLING") return
        const half = (toValue: number) => Animated.timing(opacity, { toValue, duration: 1000, useNativeDriver: true })
        const loop = Animated.loop(Animated.sequence([half(0.5), half(1)]))
        loop.start()
        return () => loop.stop()
    }, [opacity, upper])
    return <Animated.View style={[styles.dot, { backgroundColor: dot.fill, borderColor: dot.border, opacity }]} />
}

// --- Status -----------------------------------------------------------------

const STATUS: Record<BeverageStatusTone, { icon: IconName; background: string; border: string; color: string }> = {
    approved: { icon: "check", background: "#ecfdf5", border: "#d0fae5", color: palette.positive },
    suspended: { icon: "alert", background: palette.dangerSoft, border: palette.dangerBorder, color: palette.danger },
    pending: { icon: "clock", background: "#fffbeb", border: "#fef3c6", color: palette.warning },
    neutral: { icon: "tag", background: palette.background, border: palette.borderSoft, color: "#45556c" },
}

function StatusBadge({ status }: { status: string }) {
    const { formatStatus } = useTranslation()
    const look = STATUS[beverageStatusTone(status)]
    return (
        <View style={[styles.status, { backgroundColor: look.background, borderColor: look.border }]}>
            <Icon name={look.icon} size={14} color={look.color} weight="semibold" />
            <Text style={[styles.statusLabel, { color: look.color }]}>{formatStatus(status)}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    card: {
        alignItems: "center",
        overflow: "hidden",
        // The web's indigo-50/30 wash, top right.
        experimental_backgroundImage:
            "radial-gradient(circle at 100% 0%, rgba(238, 242, 255, 0.6) 0%, rgba(238, 242, 255, 0) 45%)",
    },
    // h-20 w-20 rounded-[24px] from-indigo-600 to-indigo-700 border-indigo-500
    tile: {
        width: 80,
        height: 80,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: palette.accentBright,
        experimental_backgroundImage: "linear-gradient(135deg, #4f39f6, #432dd7)",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
        ...continuous,
    },
    chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 24 },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: radius.pill,
        borderWidth: 1,
    },
    chipLabel: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
    typeChip: { backgroundColor: palette.accentSoft, borderColor: palette.accentBorder },
    typeChipLabel: { color: palette.accent },
    colorChip: { backgroundColor: palette.borderSoft, borderColor: palette.border },
    colorChipLabel: { color: palette.textStrong },
    idChip: { paddingHorizontal: 10, backgroundColor: palette.background, borderColor: palette.borderSoft },
    idChipLabel: { color: palette.textFaint, letterSpacing: 0.5 },
    dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1 },
    nameRow: {
        alignSelf: "stretch",
        marginTop: 12,
        marginBottom: 8,
    },
    nameDisplayRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    name: {
        flexShrink: 1,
        fontSize: 24,
        lineHeight: 30,
        fontWeight: "800",
        letterSpacing: -0.5,
        color: palette.heading,
        textAlign: "center",
    },
    editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    nameInput: {
        flex: 1,
        minWidth: 0,
        fontSize: 20,
        fontWeight: "800",
        color: palette.text,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: "#7c86ff", // indigo-400
        backgroundColor: palette.surface,
    },
    saveButton: {
        width: 36,
        height: 36,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButton: {
        width: 36,
        height: 36,
        borderRadius: radius.md,
        backgroundColor: palette.borderSoft,
        alignItems: "center",
        justifyContent: "center",
    },
    dimmed: { opacity: 0.6 },
    pencil: {
        padding: 6,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
    },
    pencilPressed: { backgroundColor: palette.accentSoft },
    statusRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8 },
    submit: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
        boxShadow: "0 10px 15px -3px rgba(79, 57, 246, 0.15), 0 4px 6px -4px rgba(79, 57, 246, 0.15)",
        ...continuous,
    },
    submitBusy: { opacity: 0.5 },
    submitLabel: { fontSize: 12, fontWeight: "700", color: palette.onAccent },
    status: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: radius.tile,
        borderWidth: 1,
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        ...continuous,
    },
    statusLabel: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
    divider: { alignSelf: "stretch", height: 1, marginVertical: 24, backgroundColor: palette.borderSoft },
    meta: { alignSelf: "stretch", gap: 24 },
    metaBlock: { gap: 6 },
    metaLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    metaLabelWithIcon: { flexDirection: "row", alignItems: "center", gap: 8 },
    metaLabel: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textFaint },
    metaValue: { fontSize: 14, lineHeight: 20, fontWeight: "700", color: palette.textStrong },
    tabular: { fontVariant: ["tabular-nums"] },
    metaMissing: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: palette.textFaint },
    enteredBy: { fontSize: 11, lineHeight: 16, fontWeight: "600", color: palette.textMuted },
    enteredByName: { fontWeight: "700", color: palette.textStrong },
    editActions: { flexDirection: "row", alignItems: "center", gap: 6 },
    saveLabelButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radius.sm,
        backgroundColor: palette.accent,
    },
    saveLabelText: { fontSize: 12, fontWeight: "700", color: palette.onAccent },
    cancelSmallButton: {
        width: 30,
        height: 30,
        borderRadius: radius.sm,
        backgroundColor: palette.borderSoft,
        alignItems: "center",
        justifyContent: "center",
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
        fontWeight: "600",
        color: palette.heading,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.background,
        ...continuous,
    },
    coordinates: { flexDirection: "row", gap: 12 },
    coordinate: { flex: 1, gap: 4 },
    smallLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textFaint },
    coordinateInput: { paddingHorizontal: 12, paddingVertical: 8, fontVariant: ["tabular-nums"] },
    producerList: { gap: 8 },
    producer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
        ...continuous,
    },
    producerText: { flex: 1, minWidth: 0 },
    producerName: { fontSize: 12, fontWeight: "700", color: palette.heading },
    producerRole: { fontSize: 10, fontWeight: "600", letterSpacing: 0.3, textTransform: "uppercase", color: palette.accent },
    remove: { padding: 6, borderRadius: 8 },
    removePressed: { backgroundColor: palette.dangerSoft },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
    },
    addButtonLabel: { fontSize: 12, fontWeight: "700", color: palette.onAccent },
    addBox: {
        marginTop: 4,
        padding: 12,
        gap: 12,
        borderRadius: radius.tile,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: "rgba(238, 242, 255, 0.4)",
        ...continuous,
    },
    usernameField: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
        ...continuous,
    },
    at: { fontSize: 14, fontWeight: "600", color: palette.textFaint },
    usernameInput: { flex: 1, paddingVertical: 10, fontSize: 14, fontWeight: "500", color: palette.heading },
    error: { flexDirection: "row", alignItems: "center", gap: 6 },
    errorText: { flexShrink: 1, fontSize: 12, fontWeight: "600", color: palette.danger },
    found: { gap: 12 },
    foundUser: { flexDirection: "row", alignItems: "center", gap: 12 },
    foundUsername: { fontSize: 10, fontWeight: "600", color: palette.accent },
    addFooter: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },
    footerCancel: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
    },
    footerCancelLabel: { fontSize: 12, fontWeight: "700", color: palette.textMuted },
    footerAdd: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.sm,
        backgroundColor: palette.accent,
    },
    footerAddLabel: { fontSize: 12, fontWeight: "700", color: palette.onAccent },
})
