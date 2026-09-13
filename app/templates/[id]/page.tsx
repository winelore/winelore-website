export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getEvaluationTemplateDetailAction } from "../../myTemplates/actions"
import TemplateDetailClientView from "./TemplateDetailClientView"

interface PageProps {
    params: Promise<{
        id: string
    }>
    searchParams: Promise<{
        version?: string
    }>
}

export default async function TemplateDetailPage({ params, searchParams }: PageProps) {
    const resolvedParams = await params
    const templateId = resolvedParams.id
    const requestedVersion = Number((await searchParams).version)

    const cookieStore = await cookies()
    const auidStr = cookieStore.get("auid")?.value

    if (!auidStr) {
        redirect("/auth/login")
    }
    const currentAuid = parseInt(auidStr, 10)

    let template: any = null
    let hasError = false

    try {
        template = await getEvaluationTemplateDetailAction(templateId)
    } catch (error) {
        console.error("Failed to load template detail:", error)
        hasError = true
    }

    return (
        <TemplateDetailClientView
            template={template}
            currentAuid={currentAuid}
            hasError={hasError}
            initialVersion={Number.isInteger(requestedVersion) ? requestedVersion : undefined}
        />
    )
}
