import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Platform, StyleSheet, Text, View } from "react-native"
import { Stack, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"
import { AppleMaps, GoogleMaps, type CameraMoveEvent } from "expo-maps"
import {
    boundsAround,
    distanceKm,
    visibleWineRegionLayers,
    wineRegionOutlines,
    type WineRegionFeature,
    type WineRegionLayer,
} from "@winelore/core"
import { sdk } from "../api/client"
import { useTranslation } from "../i18n/LocaleProvider"
import { palette } from "../theme"
import { useSelectedRegions } from "./selection"
import { useWineRegions } from "./useWineRegions"

/** Where the web's map opens: Ukraine, at country scale. */
const START = { coordinates: { latitude: 49.0, longitude: 31.0 }, zoom: 5 }

/**
 * Regions are outlined only once the view is this narrow (degrees of
 * latitude) and holds no more than this many: a whole country's worth is
 * thousands of outlines, too many for a phone to redraw as it pans. The
 * count still says how many are in view.
 */
const OUTLINE_SPAN = 6
const OUTLINE_LIMIT = 150

// The web's region styles: violet and dashed behind, indigo for the open beverage's.
const REGION_LINE = "#7c3aed9e"
const REGION_FILL = "#8b5cf611"
const SELECTED_LINE = "#4f46e5d9"
const SELECTED_FILL = "#6366f11f"

type Hit = { id: string; name: string; latitude: number; longitude: number }
type Viewport = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }

/**
 * The web's /map: every beverage with a recorded origin, as pins, over the
 * mapped wine regions. Panning searches around the new view, as the web does;
 * a pin opens the beverage in a sheet that leaves the map usable behind it,
 * as Apple Maps does, and its regions are outlined in indigo.
 *
 * The map is the system's — Apple Maps on iOS, Google Maps on Android —
 * where the web draws OpenStreetMap tiles.
 */
export function MapScreen() {
    const { t, tCount } = useTranslation()
    const router = useRouter()
    const insets = useSafeAreaInsets()
    const regions = useWineRegions()
    const selected = useSelectedRegions()
    const [view, setView] = useState<Viewport | null>(null)
    const [hits, setHits] = useState<Hit[]>([])
    const search = useRef(0)
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

    const searchAround = useCallback(async (next: Viewport) => {
        const request = ++search.current
        const center = { latitude: next.latitude, longitude: next.longitude }
        const corner = {
            latitude: Math.min(90, next.latitude + next.latitudeDelta / 2),
            longitude: next.longitude + next.longitudeDelta / 2,
        }
        try {
            const response = await sdk.SearchMapBeverages({
                lat: next.latitude,
                lng: next.longitude,
                radiusKm: distanceKm(center, corner),
                limit: 500,
            })
            if (request !== search.current) return
            setHits(
                (response.search?.items ?? []).filter(
                    (item): item is Hit => typeof item.latitude === "number" && typeof item.longitude === "number" && !!item.latitude && !!item.longitude,
                ),
            )
        } catch {
            // The pins already shown stay.
        }
    }, [])

    const onCameraMove = useCallback(
        (event: CameraMoveEvent) => {
            const { latitude, longitude } = event.coordinates
            if (typeof latitude !== "number" || typeof longitude !== "number") return
            const next = { latitude, longitude, latitudeDelta: event.latitudeDelta, longitudeDelta: event.longitudeDelta }
            if (debounce.current) clearTimeout(debounce.current)
            // Once the map settles, not for every frame of a pan.
            debounce.current = setTimeout(() => {
                setView(next)
                searchAround(next)
            }, 350)
        },
        [searchAround],
    )

    useEffect(() => () => {
        if (debounce.current) clearTimeout(debounce.current)
    }, [])

    const inView: WineRegionLayer[] = useMemo(
        () => (view ? visibleWineRegionLayers(regions, boundsAround(view.latitude, view.longitude, view.latitudeDelta, view.longitudeDelta)) : []),
        [regions, view],
    )

    const polygons = useMemo(() => {
        const tolerance = view ? view.latitudeDelta / 400 : 0.01
        const selectedIds = new Set(selected.map((feature) => feature.properties.id))
        const outline = (feature: WineRegionFeature, line: string, fill: string, width: number) =>
            wineRegionOutlines(feature, tolerance).map((coordinates, index) => ({
                id: `${feature.properties.id}#${index}`,
                coordinates,
                color: fill,
                lineColor: line,
                lineWidth: width,
            }))
        const background =
            view && view.latitudeDelta <= OUTLINE_SPAN && inView.length <= OUTLINE_LIMIT
                ? inView.filter((layer) => !selectedIds.has(layer.id)).flatMap((layer) => outline(layer.geojson, REGION_LINE, REGION_FILL, 1.5))
                : []
        return [...background, ...selected.flatMap((feature) => outline(feature, SELECTED_LINE, SELECTED_FILL, 2.5))]
    }, [inView, selected, view])

    const markers = useMemo(
        () =>
            hits.map((hit) => ({
                id: hit.id,
                title: hit.name,
                coordinates: { latitude: hit.latitude, longitude: hit.longitude },
                ...(Platform.OS === "ios" ? { systemImage: "wineglass", tintColor: palette.accent } : {}),
            })),
        [hits],
    )

    const openBeverage = (event: { id?: string }) => {
        if (!event.id) return
        Haptics.selectionAsync()
        router.push(`/map/beverage/${event.id}`)
    }

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.screen}>
                {Platform.OS === "ios" ? (
                    <AppleMaps.View
                        style={StyleSheet.absoluteFill}
                        cameraPosition={START}
                        markers={markers}
                        polygons={polygons}
                        colorScheme={AppleMaps.MapColorScheme.LIGHT}
                        uiSettings={{ compassEnabled: true, scaleBarEnabled: true }}
                        properties={{ pointsOfInterest: { including: [] } }}
                        onCameraMove={onCameraMove}
                        onMarkerClick={openBeverage}
                    />
                ) : (
                    <GoogleMaps.View
                        style={StyleSheet.absoluteFill}
                        cameraPosition={START}
                        markers={markers}
                        polygons={polygons}
                        onCameraMove={onCameraMove}
                        onMarkerClick={openBeverage}
                    />
                )}
                {/* The web's legend: how many mapped regions the view holds. */}
                <View pointerEvents="none" style={[styles.legend, { top: insets.top + 8 }]}>
                    <View style={styles.legendSwatch} />
                    <Text style={styles.legendLabel}>
                        {inView.length > 0 ? tCount("map.regionsInView", inView.length) : t("map.noRegionsInView")}
                    </Text>
                </View>
            </View>
        </>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    // rounded-full border-violet-200/80 bg-white/95 text-violet-700, as the web's
    legend: {
        position: "absolute",
        left: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(221, 214, 255, 0.8)",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        boxShadow: "0 4px 12px rgba(15, 23, 43, 0.12)",
    },
    legendSwatch: { width: 20, height: 10, borderRadius: 2, borderWidth: 1, borderColor: "#8e51ff", backgroundColor: "#ede9fe" },
    legendLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", color: "#7008e7" },
})
