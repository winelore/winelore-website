import { useTranslation } from "../../../src/i18n/LocaleProvider"
import { destinations } from "../../../src/navigation/destinations"
import { NotPortedScreen } from "../../../src/navigation/NotPortedScreen"

/** The web's /competitions. Not ported yet — see NotPortedScreen. */
export default function CompetitionsTab() {
    const { t } = useTranslation()
    return <NotPortedScreen title={t("common.competitions")} icon="competition" destination={destinations.competitions} />
}
