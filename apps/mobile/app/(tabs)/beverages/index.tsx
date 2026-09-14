import { useTranslation } from "../../../src/i18n/LocaleProvider"
import { destinations } from "../../../src/navigation/destinations"
import { NotPortedScreen } from "../../../src/navigation/NotPortedScreen"

/** The web's /beverages. Not ported yet — see NotPortedScreen. */
export default function BeveragesTab() {
    const { t } = useTranslation()
    return <NotPortedScreen title={t("common.beverages")} icon="beverage" destination={destinations.beverages} />
}
