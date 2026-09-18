import { useLocalSearchParams } from "expo-router"
import { BeverageScreen } from "../../../../src/beverage/BeverageScreen"

/**
 * The web's /beverage/[id]. Shared by the Home and Beverages tabs, so a
 * beverage opens inside whichever tab it was tapped in. `?tab=` picks the
 * opening tab, as on the web.
 */
export default function BeverageRoute() {
    const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>()
    return <BeverageScreen id={String(id)} tab={tab} />
}
