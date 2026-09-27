import { getEvaluationTemplatesAction } from "@/app/myTemplates/actions"
import TemplatesClientView from "./TemplatesClientView"

export const dynamic = "force-dynamic"

export default async function TemplatesPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>
}) {
    const resolvedParams = await searchParams
    const parsedPage = parseInt(resolvedParams.page || "1", 10)
    const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage

    const LIMIT = 16
    let rawTemplates: any[] = []
    let totalCount = 0
    let hasError = false

    try {
        const offset = (currentPage - 1) * LIMIT
        const result = await getEvaluationTemplatesAction(undefined, LIMIT, offset)
        rawTemplates = result.templates || []
        totalCount = result.totalCount || 0
    } catch (error) {
        console.error("Failed to load templates:", error)
        hasError = true
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT))

    return (
        <TemplatesClientView
            initialTemplates={rawTemplates}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            hasError={hasError}
        />
    )
}
