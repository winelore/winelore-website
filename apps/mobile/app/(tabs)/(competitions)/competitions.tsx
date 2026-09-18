import { useTranslation } from "../../../src/i18n/LocaleProvider"
import { CompetitionList } from "../../../src/lists/CompetitionList"
import { fetchCompetitionsPage } from "../../../src/lists/sources"

/** The web's /competitions: every competition, newest pages first. */
export default function CompetitionsTab() {
    const { t } = useTranslation()
    return (
        <CompetitionList
            title={t("common.competitions")}
            source={fetchCompetitionsPage}
            empty={{ title: t("competitions.emptyTitle"), description: t("competitions.emptyDescription") }}
            error={{ title: t("competitions.errorTitle"), description: t("competitions.errorDescription") }}
        />
    )
}
