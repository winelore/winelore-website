import { useTranslation } from "../../../src/i18n/LocaleProvider"
import { BeverageList } from "../../../src/lists/BeverageList"
import { fetchBeveragesPage } from "../../../src/lists/sources"

/** The web's /beverages: every beverage in the catalogue. */
export default function BeveragesTab() {
    const { t } = useTranslation()
    return (
        <BeverageList
            title={t("common.beverages")}
            source={fetchBeveragesPage}
            empty={{ title: t("beverages.emptyTitle"), description: t("beverages.emptyDescription") }}
            error={{ title: t("beverages.errorTitle"), description: t("beverages.errorDescription") }}
        />
    )
}
