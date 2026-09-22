import { redirect } from "next/navigation"

interface PageProps {
    params: Promise<{
        id: string
    }>
    searchParams: Promise<{
        version?: string
        edit?: string
    }>
}

export default async function TemplateSingularRedirectPage({ params, searchParams }: PageProps) {
    const { id } = await params
    const resolvedSearch = await searchParams
    const query = new URLSearchParams()
    if (resolvedSearch.version) query.set("version", resolvedSearch.version)
    if (resolvedSearch.edit) query.set("edit", resolvedSearch.edit)
    const queryString = query.toString() ? `?${query.toString()}` : ""

    redirect(`/templates/${id}${queryString}`)
}
