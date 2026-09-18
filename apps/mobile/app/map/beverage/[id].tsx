import { useLocalSearchParams } from "expo-router"
import { MapBeverageSheet } from "../../../src/map/MapBeverageSheet"

/** A beverage opened from a pin on the map, in a sheet over it. */
export default function MapBeverageRoute() {
    const { id } = useLocalSearchParams<{ id: string }>()
    return <MapBeverageSheet id={String(id)} />
}
