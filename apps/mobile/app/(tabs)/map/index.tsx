import { useTranslation } from "../../../src/i18n/LocaleProvider"
import { destinations } from "../../../src/navigation/destinations"
import { NotPortedScreen } from "../../../src/navigation/NotPortedScreen"

/** The web's /map. Not ported yet — see NotPortedScreen. */
export default function MapTab() {
    const { t } = useTranslation()
    return <NotPortedScreen title={t("common.map")} icon="map" destination={destinations.map} />
}
