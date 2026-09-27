import { useState } from "react"
import { useLocalSearchParams } from "expo-router"
import { ResultsScreen } from "../../../../../src/results/ResultsScreen"

/**
 * The web's /competition/[id]/results, in whichever tab the competition was
 * opened. `?commission=` narrows it to one commission, as on the web.
 */
export default function CompetitionResultsRoute() {
    const { id, commission } = useLocalSearchParams<{ id: string; commission?: string }>()
    // Where it opened; the filter on the screen takes over from there.
    const [requested] = useState(commission ?? null)
    return <ResultsScreen competitionId={String(id)} commissionId={requested} />
}
