import { useMemo } from "react"
import type { DashboardCompetition } from "@winelore/core/dashboard"
import { CompetitionCard } from "../dashboard/cards"
import { useTranslation } from "../i18n/LocaleProvider"
import { useDisplayNames } from "../users/useDisplayNames"
import { EntityList } from "./EntityList"
import { usePagedList, type Page } from "./usePagedList"

interface CompetitionListProps {
    title: string
    subtitle?: string
    source: (offset: number, limit: number) => Promise<Page<DashboardCompetition>>
    /** Opens the create form; the list reloads once it closes. */
    onCreate?: () => Promise<void>
    empty: { title: string; description: string }
    error: { title: string; description: string }
}

/** A list of competition cards — the web's /competitions and /myCompetitions. */
export function CompetitionList({ title, subtitle, source, onCreate, empty, error }: CompetitionListProps) {
    const { t, tCount } = useTranslation()
    const list = usePagedList(source)
    const holders = useMemo(
        () => Array.from(new Set(list.items.flatMap((competition) => competition.holder.map(String)))),
        [list.items],
    )
    const usernames = useDisplayNames(holders)

    return (
        <EntityList
            title={title}
            subtitle={subtitle}
            countLabel={(total) => tCount("common.competitionsCount", total)}
            action={
                onCreate
                    ? {
                          label: t("myCompetitions.createButton"),
                          onPress: async () => {
                              await onCreate()
                              list.refresh()
                          },
                      }
                    : undefined
            }
            list={list}
            keyExtractor={(competition) => competition.id}
            renderItem={(competition) => (
                <CompetitionCard competition={competition} usernames={usernames} density="list" />
            )}
            empty={{ icon: "competition", ...empty }}
            error={error}
        />
    )
}
