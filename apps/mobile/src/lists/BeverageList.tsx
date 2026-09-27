import { useMemo } from "react"
import { useBeverageTypes } from "../dashboard/beverageTypes"
import { BeverageCard } from "../dashboard/cards"
import type { DashboardBeverage } from "../dashboard/useHome"
import { useBeverageOrigins } from "../geocoding/useBeverageOrigins"
import { useTranslation } from "../i18n/LocaleProvider"
import { useDisplayNames } from "../users/useDisplayNames"
import { useOnChanged } from "../navigation/changes"
import { EntityList } from "./EntityList"
import { usePagedList, type Page } from "./usePagedList"

interface BeverageListProps {
    title: string
    subtitle?: string
    source: (offset: number, limit: number) => Promise<Page<DashboardBeverage>>
    /** Opens the create form; the list reloads when a beverage is created. */
    onCreate?: () => void
    /** Reverse-geocode each beverage's origin, as the web's My Beverages does. */
    showOrigin?: boolean
    empty: { title: string; description: string }
    error: { title: string; description: string }
}

const NO_BEVERAGES: DashboardBeverage[] = []

/** A list of beverage cards — the web's /beverages and /myBeverages. */
export function BeverageList({ title, subtitle, source, onCreate, showOrigin, empty, error }: BeverageListProps) {
    const { t, tCount } = useTranslation()
    const list = usePagedList(source)
    useOnChanged("beverages", list.refresh)
    const typeMap = useBeverageTypes()
    const producers = useMemo(
        () =>
            Array.from(
                new Set(
                    list.items.flatMap((beverage) =>
                        (beverage.producers ?? []).flatMap((producer) => (producer.auid ?? []).map(String)),
                    ),
                ),
            ),
        [list.items],
    )
    const usernames = useDisplayNames(producers)
    const origins = useBeverageOrigins(showOrigin ? list.items : NO_BEVERAGES)

    return (
        <EntityList
            title={title}
            subtitle={subtitle}
            countLabel={(total) => tCount("common.beveragesCount", total)}
            action={
                onCreate
                    ? {
                          label: t("myBeverages.createButton"),
                          onPress: onCreate,
                      }
                    : undefined
            }
            list={list}
            keyExtractor={(beverage) => beverage.id}
            renderItem={(beverage) => (
                <BeverageCard
                    beverage={beverage}
                    typeMap={typeMap}
                    usernames={usernames}
                    originParts={origins[beverage.id]}
                    density="list"
                />
            )}
            empty={{ icon: "beverage", ...empty }}
            error={error}
        />
    )
}
