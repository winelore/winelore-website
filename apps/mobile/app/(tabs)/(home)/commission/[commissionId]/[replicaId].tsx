import { useLocalSearchParams } from "expo-router"
import { CommissionScreen } from "../../../../../src/commission/CommissionScreen"

/**
 * The commission page opened on one replica — the judge's own, from a card
 * on Home or the competition page.
 */
export default function CommissionReplicaRoute() {
    const { commissionId, replicaId } = useLocalSearchParams<{ commissionId: string; replicaId: string }>()
    return <CommissionScreen id={String(commissionId)} replicaId={String(replicaId)} />
}
