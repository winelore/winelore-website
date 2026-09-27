import { useLocalSearchParams } from "expo-router"
import { CompetitionScreen } from "../../../../src/competition/CompetitionScreen"

/**
 * The web's /competition/[id]. Shared by the Home and Competitions tabs, so a
 * competition opens inside whichever tab it was tapped in, as a pushed
 * screen does in any tab bar app.
 */
export default function CompetitionRoute() {
    const { id } = useLocalSearchParams<{ id: string }>()
    return <CompetitionScreen id={String(id)} />
}
