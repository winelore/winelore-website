import { useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    type KeyboardTypeOptions,
} from "react-native"
import { Stack, useRouter } from "expo-router"
import * as Haptics from "expo-haptics"
import {
    ADDABLE_PRODUCER_ROLES,
    producerAuid,
    producerName,
    producerRoleKey,
    type AddableProducerRole,
    type BeverageOrigin,
    type BeverageProducer,
} from "@winelore/core/beverage"
import { HolderAvatar } from "../competition/parts"
import { useTranslation } from "../i18n/LocaleProvider"
import { continuous, palette, radius } from "../theme"
import { Icon } from "../ui/Icon"
import { PressableSurface } from "../ui/Pressable"
import { Segmented } from "../ui/Segmented"
import { useDisplayNames } from "../users/useDisplayNames"
import { useUserSearch } from "../users/useUserSearch"
import {
    changeBeverageOrigin,
    registerBeverageProducer,
    renameBeverage,
    unregisterBeverageProducer,
} from "./mutations"
import { SheetLoading } from "./parts"
import { patchBeverage, useLoadedBeverage } from "./useBeveragePage"

const coordinate = (value: number | null | undefined) => (value != null ? String(value) : "")

// A coordinate can be negative, and iOS's decimal pad has no minus key.
const COORDINATE_KEYBOARD: KeyboardTypeOptions = Platform.select({
    ios: "numbers-and-punctuation",
    default: "numeric",
})

/**
 * The web's "Edit Beverage" modal, as a sheet: the name and origin, saved
 * together from the bar, and the producers, each change to which applies at
 * once as it does on the web. A sheet with unsaved changes cannot be swiped
 * away, so they are not lost by accident.
 */
export function EditBeverageSheet({ id }: { id: string }) {
    const state = useLoadedBeverage(id)
    if (state.status === "loading") return <SheetLoading />
    if (state.status !== "ready") return null
    return (
        <Editor
            id={id}
            name={state.page.beverage.name}
            origin={state.page.beverage.origin ?? null}
            producers={state.page.beverage.producers ?? []}
            auid={state.auid ?? ""}
        />
    )
}

function Editor({
    id,
    name: savedName,
    origin,
    producers,
    auid,
}: {
    id: string
    name: string
    origin: BeverageOrigin | null
    producers: BeverageProducer[]
    auid: string
}) {
    const { t } = useTranslation()
    const router = useRouter()

    const [name, setName] = useState(savedName)
    const [latitude, setLatitude] = useState(coordinate(origin?.latitude))
    const [longitude, setLongitude] = useState(coordinate(origin?.longitude))
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const nameChanged = name.trim() !== savedName
    const originChanged = latitude !== coordinate(origin?.latitude) || longitude !== coordinate(origin?.longitude)
    const hasChanges = nameChanged || originChanged

    const save = async () => {
        const trimmed = name.trim()
        if (!trimmed) {
            setSaveError(t("beverage.edit.nameRequired"))
            return
        }
        const hasCoordinates = latitude.trim() !== "" && longitude.trim() !== ""
        const nextOrigin = hasCoordinates ? { latitude: Number(latitude), longitude: Number(longitude) } : null
        if (nextOrigin && (!Number.isFinite(nextOrigin.latitude) || !Number.isFinite(nextOrigin.longitude))) {
            setSaveError(t("beverage.createErrorCoords"))
            return
        }
        setSaving(true)
        setSaveError(null)
        try {
            if (nameChanged) {
                const updated = await renameBeverage(id, trimmed, auid)
                patchBeverage(id, { name: updated.name })
            }
            if (originChanged) {
                const updated = await changeBeverageOrigin(id, nextOrigin, auid)
                patchBeverage(id, { origin: updated.origin })
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            router.back()
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            setSaveError(error instanceof Error && error.message ? error.message : t("beverage.edit.saveError"))
        } finally {
            setSaving(false)
        }
    }

    const saveLabel = saving ? t("beverage.edit.saving") : t("common.save")

    return (
        <>
            <Stack.Screen
                options={{
                    title: t("beverage.edit.title"),
                    // Unsaved changes hold the sheet: no swipe away until saved or closed.
                    gestureEnabled: !hasChanges,
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
                            label: saveLabel,
                            variant: "prominent",
                            tintColor: palette.accent,
                            icon: { type: "sfSymbol", name: "checkmark" },
                            disabled: !hasChanges || saving,
                            onPress: save,
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
                            onPress={save}
                            disabled={!hasChanges || saving}
                            style={[styles.androidAction, (!hasChanges || saving) && styles.dimmed]}
                        >
                            <Text style={styles.androidSave}>{saveLabel}</Text>
                        </Pressable>
                    ),
                }}
            />
            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
                contentInsetAdjustmentBehavior="automatic"
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                automaticallyAdjustKeyboardInsets
            >
                <View style={styles.field}>
                    <Text style={styles.label}>{t("beverage.edit.nameLabel")}</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder={t("beverage.edit.namePlaceholder")}
                        placeholderTextColor={palette.textFaint}
                        returnKeyType="done"
                        editable={!saving}
                        style={styles.input}
                    />
                </View>

                <View style={styles.field}>
                    <View style={styles.labelRow}>
                        <View style={styles.labelWithIcon}>
                            <Icon name="location" size={14} color={palette.accentBright} />
                            <Text style={styles.label}>{t("beverage.edit.originLabel")}</Text>
                        </View>
                        {latitude || longitude ? (
                            <Pressable
                                accessibilityRole="button"
                                hitSlop={8}
                                onPress={() => {
                                    setLatitude("")
                                    setLongitude("")
                                }}
                            >
                                <Text style={styles.clear}>{t("beverage.edit.clearOrigin")}</Text>
                            </Pressable>
                        ) : null}
                    </View>
                    <Text style={styles.hint}>{t("beverage.edit.originHint")}</Text>
                    <View style={styles.coordinates}>
                        <View style={styles.coordinate}>
                            <Text style={styles.smallLabel}>{t("beverage.edit.latitudeLabel")}</Text>
                            <TextInput
                                value={latitude}
                                onChangeText={setLatitude}
                                keyboardType={COORDINATE_KEYBOARD}
                                editable={!saving}
                                style={[styles.input, styles.coordinateInput]}
                                accessibilityLabel={t("beverage.edit.latitudeLabel")}
                            />
                        </View>
                        <View style={styles.coordinate}>
                            <Text style={styles.smallLabel}>{t("beverage.edit.longitudeLabel")}</Text>
                            <TextInput
                                value={longitude}
                                onChangeText={setLongitude}
                                keyboardType={COORDINATE_KEYBOARD}
                                editable={!saving}
                                style={[styles.input, styles.coordinateInput]}
                                accessibilityLabel={t("beverage.edit.longitudeLabel")}
                            />
                        </View>
                    </View>
                </View>

                {saveError ? (
                    <View style={styles.error}>
                        <Icon name="alert" size={14} color={palette.danger} />
                        <Text style={styles.errorText}>{saveError}</Text>
                    </View>
                ) : null}

                <View style={styles.divider} />

                <Producers id={id} producers={producers} auid={auid} />
            </ScrollView>
        </>
    )
}

function Producers({ id, producers, auid }: { id: string; producers: BeverageProducer[]; auid: string }) {
    const { t } = useTranslation()
    const usernames = useDisplayNames(
        producers.map(producerAuid).filter((value) => value !== null).map(String),
    )
    const [removing, setRemoving] = useState<string | null>(null)

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
                        const updated = await unregisterBeverageProducer(id, producer.id, auid)
                        patchBeverage(id, { producers: updated.producers })
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
        <View style={styles.producers}>
            <View style={styles.labelWithIcon}>
                <Icon name="people" size={14} color={palette.accentBright} />
                <Text style={styles.label}>{t("beverage.edit.producersTitle")}</Text>
            </View>

            {producers.length > 0 ? (
                <View style={styles.producerList}>
                    {producers.map((producer) => {
                        const producerId = producerAuid(producer)
                        const roleKey = producerRoleKey(producer.role)
                        return (
                            <View key={producer.id} style={styles.producer}>
                                <HolderAvatar auid={producerId ?? 0} username={label(producer)} size={32} />
                                <View style={styles.producerText}>
                                    <Text style={styles.producerName} numberOfLines={1}>
                                        {label(producer)}
                                    </Text>
                                    <Text style={styles.producerRole}>{roleKey ? t(roleKey) : producer.role}</Text>
                                </View>
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
                            </View>
                        )
                    })}
                </View>
            ) : (
                <Text style={styles.noProducers}>{t("beverage.edit.noProducers")}</Text>
            )}

            <AddProducer id={id} auid={auid} />
        </View>
    )
}

function AddProducer({ id, auid }: { id: string; auid: string }) {
    const { t } = useTranslation()
    const [username, setUsername] = useState("")
    const { searching, error: searchError, found } = useUserSearch(username, {
        notFound: t("beverage.edit.userNotFound"),
        failed: t("beverage.edit.searchError"),
    })
    const [role, setRole] = useState<AddableProducerRole>("MAKER")
    const [adding, setAdding] = useState(false)

    const add = async () => {
        if (!found) return
        setAdding(true)
        try {
            const updated = await registerBeverageProducer(id, found.auid, role, auid)
            patchBeverage(id, { producers: updated.producers })
            setUsername("")
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert(t("beverage.edit.addProducerError"), error instanceof Error ? error.message : String(error))
        } finally {
            setAdding(false)
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
                        <HolderAvatar auid={found.auid} username={found.displayName} size={36} />
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
                    <PressableSurface onPress={add} disabled={adding} style={[styles.addButton, adding && styles.dimmed]}>
                        {adding ? (
                            <ActivityIndicator size="small" color={palette.onAccent} />
                        ) : (
                            <Icon name="personAdd" size={16} color={palette.onAccent} weight="semibold" />
                        )}
                        <Text style={styles.addLabel}>{t("beverage.edit.addProducer")}</Text>
                    </PressableSurface>
                </View>
            ) : null}
        </View>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.surface },
    content: { padding: 24, gap: 24 },
    androidAction: { padding: 8 },
    androidSave: { fontSize: 16, fontWeight: "700", color: palette.accent },
    dimmed: { opacity: 0.5 },
    field: { gap: 6 },
    labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    labelWithIcon: { flexDirection: "row", alignItems: "center", gap: 6 },
    label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textMuted },
    smallLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: palette.textFaint },
    clear: { fontSize: 11, fontWeight: "600", color: palette.textFaint },
    hint: { fontSize: 11, fontWeight: "500", color: palette.textFaint },
    // bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold
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
    coordinateInput: { paddingHorizontal: 12, paddingVertical: 8, fontVariant: ["tabular-nums"] },
    error: { flexDirection: "row", alignItems: "center", gap: 6 },
    errorText: { flexShrink: 1, fontSize: 12, fontWeight: "600", color: palette.danger },
    divider: { height: 1, backgroundColor: palette.borderSoft },
    producers: { gap: 12 },
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
    noProducers: { fontSize: 12, fontWeight: "500", color: palette.textFaint },
    // p-3 rounded-2xl bg-indigo-50/40 border-indigo-100
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
    found: { gap: 12 },
    foundUser: { flexDirection: "row", alignItems: "center", gap: 12 },
    foundUsername: { fontSize: 10, fontWeight: "600", color: palette.accent },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
        ...continuous,
    },
    addLabel: { fontSize: 14, fontWeight: "700", color: palette.onAccent },
})
