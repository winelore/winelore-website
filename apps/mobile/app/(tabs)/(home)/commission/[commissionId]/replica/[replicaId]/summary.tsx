import { useLocalSearchParams } from "expo-router"
import { TastingSummaryScreen } from "../../../../../../../src/commission/TastingSummaryScreen"

/**
 * A judge's own tasting summary, at the web's path — reached from the
 * commission page's banner once the judge's session has ended.
 */
export default function TastingSummaryRoute() {
    const { replicaId } = useLocalSearchParams<{ replicaId: string }>()
    return <TastingSummaryScreen replicaId={String(replicaId)} />
}
