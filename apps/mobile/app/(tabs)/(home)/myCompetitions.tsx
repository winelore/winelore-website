import { useMemo } from "react"
import { useAuth } from "../../../src/auth/AuthProvider"
import { useTranslation } from "../../../src/i18n/LocaleProvider"
import { CompetitionList } from "../../../src/lists/CompetitionList"
import { myCompetitionsSource } from "../../../src/lists/sources"
import { destinations, useOpenDestination } from "../../../src/navigation/destinations"

/**
 * The web's /myCompetitions: the competitions this user holds. Creating one
 * opens the web's form, and the list reloads when it closes.
 */
export default function MyCompetitionsRoute() {
    const { t } = useTranslation()
    const { session } = useAuth()
    const open = useOpenDestination()
    const source = useMemo(() => myCompetitionsSource(session?.auid ?? ""), [session?.auid])

    return (
        <CompetitionList
            title={t("myCompetitions.title")}
            subtitle={t("myCompetitions.subtitle")}
            source={source}
            onCreate={() => open(destinations.createCompetition)}
            empty={{ title: t("myCompetitions.emptyTitle"), description: t("myCompetitions.emptyDescription") }}
            error={{ title: t("myCompetitions.errorTitle"), description: t("myCompetitions.errorDescription") }}
        />
    )
}
