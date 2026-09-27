import { useLocalSearchParams } from "expo-router"
import { WaitScreen } from "../../../../../src/wait/WaitScreen"

/**
 * Between candidates.
 *
 * A judge lands here after submitting, or when the panel is on a candidate
 * they have already scored; the chair lands here to watch the panel come in
 * and move it on. Back navigation is disabled rather than letting anyone
 * return to a submitted scorecard.
 */
export default function WaitRoute() {
    const { commissionId, replicaId } = useLocalSearchParams<{
        commissionId: string
        replicaId: string
    }>()

    return <WaitScreen commissionId={commissionId} replicaId={replicaId} />
}
