import { useMemo } from "react"
import { useAuth } from "../../../src/auth/AuthProvider"
import { useTranslation } from "../../../src/i18n/LocaleProvider"
import { BeverageList } from "../../../src/lists/BeverageList"
import { myBeveragesSource } from "../../../src/lists/sources"
import { destinations, useOpenDestination } from "../../../src/navigation/destinations"

/**
 * The web's /myBeverages: the beverages this user produces, with each one's
 * origin. Creating one opens the web's form, and the list reloads when it
 * closes.
 */
export default function MyBeveragesRoute() {
    const { t } = useTranslation()
    const { session } = useAuth()
    const open = useOpenDestination()
    const source = useMemo(() => myBeveragesSource(session?.auid ?? ""), [session?.auid])

    return (
        <BeverageList
            title={t("myBeverages.title")}
            subtitle={t("myBeverages.subtitle")}
            source={source}
            onCreate={() => open(destinations.createBeverage)}
            showOrigin
            empty={{ title: t("myBeverages.emptyTitle"), description: t("myBeverages.emptyDescription") }}
            error={{ title: t("myBeverages.errorTitle"), description: t("myBeverages.errorDescription") }}
        />
    )
}
