import { useSyncExternalStore } from "react"
import type { WineRegionFeature } from "@winelore/core"

/**
 * The regions of the beverage open in the map's sheet. The sheet is its own
 * screen, above the map; the map behind it outlines these, as the web's map
 * highlights them beside its panel.
 */
let selected: WineRegionFeature[] = []
const listeners = new Set<() => void>()

export function setSelectedRegions(regions: WineRegionFeature[]) {
    selected = regions
    listeners.forEach((listener) => listener())
}

export function useSelectedRegions(): WineRegionFeature[] {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
        () => selected,
    )
}
