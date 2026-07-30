// app/map/page.tsx
export const dynamic = "force-dynamic"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import MapClientView from "./MapClientView"

export default async function MapPage() {
    const cookieStore = await cookies()
    const currentAuidStr = cookieStore.get("auid")?.value

    if (!currentAuidStr) {
        redirect("/auth/login")
    }

    // Рендеримо клієнтську карту, яка сама запросить дані просторовим пошуком
    return <MapClientView />
}