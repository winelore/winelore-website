import type { ActiveCommission } from "@winelore/core/dashboard"
import { CommissionCard } from "../../../src/dashboard/cards"
import { useCommissions } from "../../../src/dashboard/useDashboard"
import { useTranslation } from "../../../src/i18n/LocaleProvider"
import { EntityList } from "../../../src/lists/EntityList"
import type { ListController } from "../../../src/lists/usePagedList"

/**
 * The web's /myCommissions: every commission the judge is on, whatever its
 * status — their history, not just live work.
 *
 * The backend cannot list "my" commissions, so both apps fetch them all and
 * filter; with everything already here there is no next page to load, and
 * the list is handed over whole. Each card opens the commission's page, on
 * the judge's own replica.
 */
export default function CommissionsRoute() {
    const { t, tCount } = useTranslation()
    const { state, reload } = useCommissions()

    const items = state.status === "ready" ? state.commissions : []
    const list: ListController<ActiveCommission> = {
        status: state.status,
        items,
        total: items.length,
        hasMore: false,
        loadingMore: false,
        loadMoreFailed: false,
        refresh: reload,
        loadMore: () => {},
    }

    return (
        <EntityList
            title={t("myCommissions.title")}
            subtitle={t("myCommissions.subtitle")}
            countLabel={(total) => tCount("common.commissionsCount", total)}
            list={list}
            keyExtractor={(commission) => commission.id}
            renderItem={(commission) => <CommissionCard commission={commission} density="list" />}
            empty={{
                icon: "commission",
                title: t("myCommissions.emptyTitle"),
                description: t("myCommissions.emptyDescription"),
            }}
            error={{ title: t("myCommissions.errorTitle"), description: t("myCommissions.errorDescription") }}
        />
    )
}
