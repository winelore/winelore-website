export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import CreateCompetitionSeriesClientView from "./CreateCompetitionSeriesClientView"

export default async function CreateCompetitionSeriesPage() {
    const cookieStore = await cookies()
    const currentAuidStr = cookieStore.get("auid")?.value
    if (!currentAuidStr) {
        redirect("/auth/login")
    }
    const currentAuid = parseInt(currentAuidStr, 10)

    return <CreateCompetitionSeriesClientView currentAuid={currentAuid} />
}
