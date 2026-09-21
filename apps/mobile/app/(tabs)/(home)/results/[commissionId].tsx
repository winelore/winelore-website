import { ActivityIndicator, View } from "react-native"
import { Stack, useLocalSearchParams } from "expo-router"
import { ResultsScreen } from "../../../../src/results/ResultsScreen"
import { useCommissionCompetition } from "../../../../src/results/useCompetitionResults"
import { palette } from "../../../../src/theme"

/**
 * A commission's results, where a finished session hands its judges. The web
 * redirects /commission/[id]/results to its competition's results narrowed
 * to the commission; this shows that same screen in place, so the session
 * screens can still `router.replace` here within the Home stack.
 */
export default function CommissionResultsRoute() {
    const { commissionId } = useLocalSearchParams<{ commissionId: string }>()
    const competition = useCommissionCompetition(String(commissionId))

    if (competition.status === "loading") {
        return (
            <>
                <Stack.Screen options={{ title: "", headerLargeTitle: false }} />
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.background }}>
                    <ActivityIndicator color={palette.accent} />
                </View>
            </>
        )
    }

    return (
        <ResultsScreen
            competitionId={competition.status === "found" ? competition.id : null}
            commissionId={String(commissionId)}
        />
    )
}
