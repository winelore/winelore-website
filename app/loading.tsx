import { Loader2 } from "lucide-react"

// Shown by Next.js while a route segment's server component is fetching data
// and no closer loading.tsx exists — deliberately header-less (we don't know
// which tab is active yet) and untranslated (this can render before the
// locale cookie is read on the client).
export default function Loading() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50/50">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
    )
}
