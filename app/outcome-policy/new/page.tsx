export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import NewOutcomePolicyView from "./NewOutcomePolicyView"

export default async function NewOutcomePolicyPage() {
    const cookieStore = await cookies()
    const currentAuidStr = cookieStore.get("auid")?.value
    if (!currentAuidStr) {
        redirect("/auth/login")
    }
    const currentAuid = parseInt(currentAuidStr, 10);

    return (
        <NewOutcomePolicyView currentAuid={currentAuid} />
    )
}