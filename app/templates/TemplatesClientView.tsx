"use client"

import { useState, useEffect, useMemo } from "react"
import { Layers } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { useRouter, usePathname } from "next/navigation"
import { useUsernames } from "@/hooks/useUsernames"
import {
    ListPageShell,
    ListPageHeader,
    Pagination,
    StateCard,
    TemplateCard,
    type TemplateCardData,
} from "@/components/list"

interface TemplatesClientViewProps {
    initialTemplates: TemplateCardData[]
    currentPage: number
    totalPages?: number
    totalCount?: number
    hasError?: boolean
}

export default function TemplatesClientView({
    initialTemplates,
    currentPage,
    totalPages = 1,
    totalCount = 0,
    hasError = false,
}: TemplatesClientViewProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { t, tCount } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)

    const allOwnerAuids = useMemo(() => {
        return Array.from(new Set(initialTemplates.flatMap((tmpl) => (tmpl.owners || []).flat())))
    }, [initialTemplates])
    const { usernames } = useUsernames(allOwnerAuids)

    const handleJumpToPage = (pageNumber: number) => {
        setIsLoading(true)
        router.push(`${pathname}?page=${pageNumber}`)
    }

    useEffect(() => {
        setIsLoading(false)
    }, [initialTemplates])

    return (
        <ListPageShell activeTab="none" isLoading={isLoading}>
            <ListPageHeader
                title={t("common.templates")}
                countLabel={tCount("common.templatesCount", totalCount)}
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start flex-1">
                {hasError && (
                    <StateCard
                        variant="error"
                        title={t("templates.errorTitle")}
                        description={t("templates.errorDescription")}
                    />
                )}

                {!hasError && initialTemplates.length === 0 && (
                    <StateCard
                        variant="empty"
                        icon={Layers}
                        title={t("templates.emptyTitle")}
                        description={t("templates.emptyDescription")}
                    />
                )}

                {!hasError &&
                    initialTemplates.map((template) => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            usernames={usernames}
                            density="compact"
                        />
                    ))}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                isLoading={isLoading}
                onPageChange={handleJumpToPage}
            />
        </ListPageShell>
    )
}
