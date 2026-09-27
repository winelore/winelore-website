import { useRef, useState } from "react"
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
import { AppleMaps, GoogleMaps } from "expo-maps"
import { nominatimPlaceUrl, nominatimSearchUrl, parseNominatimSearch, roundCoordinate } from "@winelore/core"
import { useTranslation } from "../i18n/LocaleProvider"
import { MapUnavailable, mapAvailable } from "./availability"
import { MONOSPACE, continuous, palette, radius } from "../theme"
import { FormInput } from "../ui/Form"
import { Icon } from "../ui/Icon"

type Point = { latitude: number; longitude: number }

async function nominatim(url: string): Promise<any | null> {
    try {
        const response = await fetch(url, {
            headers: { "User-Agent": "WineLoreApp/1.0 (contact@winelore.com)", "Accept-Language": "uk,en,hu,sk" },
        })
        return response.ok ? await response.json() : null
    } catch {
        return null
    }
}

/**
 * The web's origin picker: a tap on the map sets the point, a search finds a
 * place and flies there, and the card beneath names what was chosen. The map
 * is the system's, as on the Map tab.
 */
export function LocationPicker({ value, onChange, disabled }: { value: Point | null; onChange: (point: Point | null) => void; disabled?: boolean }) {
    const { t } = useTranslation()
    const apple = useRef<AppleMaps.MapView>(null)
    const google = useRef<GoogleMaps.MapView>(null)
    const [query, setQuery] = useState("")
    const [searching, setSearching] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)
    const [placeName, setPlaceName] = useState<string | null>(null)

    const choose = async (point: Point) => {
        if (disabled) return
        const rounded = { latitude: roundCoordinate(point.latitude), longitude: roundCoordinate(point.longitude) }
        Haptics.selectionAsync()
        onChange(rounded)
        setPlaceName(null)
        const data = await nominatim(nominatimPlaceUrl(rounded.latitude, rounded.longitude))
        if (data?.display_name) setPlaceName(String(data.display_name))
    }

    const search = async () => {
        const text = query.trim()
        if (!text) return
        setSearching(true)
        setSearchError(null)
        const data = await nominatim(nominatimSearchUrl(text))
        setSearching(false)
        if (data === null) {
            setSearchError(t("beverage.mapSearchNetworkError"))
            return
        }
        const found = parseNominatimSearch(data)
        if (!found) {
            setSearchError(t("beverage.mapSearchNotFound"))
            return
        }
        onChange({ latitude: found.latitude, longitude: found.longitude })
        setPlaceName(found.name)
        const camera = { coordinates: { latitude: found.latitude, longitude: found.longitude }, zoom: 10 }
        apple.current?.setCameraPosition(camera)
        google.current?.setCameraPosition(camera)
    }

    const clear = () => {
        onChange(null)
        setPlaceName(null)
        setQuery("")
        setSearchError(null)
    }

    const start = value ? { coordinates: value, zoom: 8 } : { coordinates: { latitude: 49.0, longitude: 31.0 }, zoom: 5 }
    const markers = value ? [{ id: "origin", coordinates: value, ...(Platform.OS === "ios" ? { tintColor: palette.accent } : {}) }] : []

    return (
        <View style={styles.picker}>
            <View style={styles.searchRow}>
                <FormInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder={t("beverage.mapSearchPlaceholder")}
                    returnKeyType="search"
                    onSubmitEditing={search}
                    editable={!disabled && !searching}
                    style={styles.search}
                />
                <Pressable
                    accessibilityRole="button"
                    onPress={search}
                    disabled={disabled || searching || !query.trim()}
                    style={[styles.searchButton, (disabled || searching || !query.trim()) && styles.dimmed]}
                >
                    {searching ? (
                        <ActivityIndicator size="small" color={palette.onAccent} />
                    ) : (
                        <Text style={styles.searchLabel}>{t("beverage.mapSearchButton")}</Text>
                    )}
                </Pressable>
            </View>
            {searchError ? <Text style={styles.error}>{searchError}</Text> : null}

            <View style={styles.map}>
                {Platform.OS === "ios" ? (
                    <AppleMaps.View
                        ref={apple}
                        style={StyleSheet.absoluteFill}
                        cameraPosition={start}
                        markers={markers}
                        colorScheme={AppleMaps.MapColorScheme.LIGHT}
                        uiSettings={{ myLocationButtonEnabled: false }}
                        properties={{ pointsOfInterest: { including: [] } }}
                        onMapClick={(event) => {
                            const { latitude, longitude } = event.coordinates
                            if (typeof latitude === "number" && typeof longitude === "number") choose({ latitude, longitude })
                        }}
                    />
                ) : !mapAvailable ? (
                    <MapUnavailable />
                ) : (
                    <GoogleMaps.View
                        ref={google}
                        style={StyleSheet.absoluteFill}
                        cameraPosition={start}
                        uiSettings={{ myLocationButtonEnabled: false }}
                        markers={markers}
                        onMapClick={(event) => {
                            const { latitude, longitude } = event.coordinates
                            if (typeof latitude === "number" && typeof longitude === "number") choose({ latitude, longitude })
                        }}
                    />
                )}
                {mapAvailable ? (
                    <View pointerEvents="none" style={styles.hint}>
                        <Icon name="location" size={13} color={palette.accent} />
                        <Text style={styles.hintLabel}>{value ? t("beverage.mapHintSelected") : t("beverage.mapHintEmpty")}</Text>
                    </View>
                ) : null}
            </View>

            {value ? (
                <View style={styles.chosen}>
                    <View style={styles.chosenTile}>
                        <Icon name="location" size={16} color={palette.onAccent} />
                    </View>
                    <View style={styles.chosenText}>
                        <Text style={styles.chosenName} numberOfLines={2}>
                            {placeName || t("beverage.mapLocationSelected")}
                        </Text>
                        <Text style={styles.chosenCoordinates} selectable>
                            Lat: {value.latitude.toFixed(5)}, Lng: {value.longitude.toFixed(5)}
                        </Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={t("beverage.edit.clearOrigin")} onPress={clear} hitSlop={8} disabled={disabled}>
                        <Icon name="close" size={16} color={palette.textFaint} />
                    </Pressable>
                </View>
            ) : (
                <View style={styles.empty}>
                    <Icon name="location" size={16} color={palette.textFaint} />
                    <Text style={styles.emptyText}>{t("beverage.mapLocationEmpty")}</Text>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    picker: { gap: 12 },
    searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    search: { flex: 1, paddingVertical: 10, fontSize: 13 },
    searchButton: {
        minWidth: 72,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
        paddingVertical: 11,
        borderRadius: radius.md,
        backgroundColor: palette.accent,
        ...continuous,
    },
    searchLabel: { fontSize: 13, fontWeight: "700", color: palette.onAccent },
    dimmed: { opacity: 0.5 },
    error: { fontSize: 12, fontWeight: "600", color: palette.danger },
    map: { height: 288, borderRadius: radius.tile, borderWidth: 1, borderColor: palette.border, overflow: "hidden", backgroundColor: palette.borderSoft, ...continuous },
    hint: {
        position: "absolute",
        top: 12,
        left: 12,
        right: 12,
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: "rgba(255, 255, 255, 0.92)",
    },
    hintLabel: { flexShrink: 1, fontSize: 11, fontWeight: "800", color: "#432dd7" },
    chosen: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 12,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.accentBorder,
        backgroundColor: "rgba(238, 242, 255, 0.6)",
        ...continuous,
    },
    chosenTile: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: palette.accent },
    chosenText: { flex: 1, minWidth: 0 },
    chosenName: { fontSize: 12, fontWeight: "800", color: "#1e1a4d" },
    chosenCoordinates: { marginTop: 2, fontSize: 11, fontFamily: MONOSPACE, color: palette.accent },
    empty: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 12,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        backgroundColor: palette.background,
    },
    emptyText: { flex: 1, fontSize: 12, fontWeight: "500", color: palette.textMuted },
})
