"use client"

// This replaces the entire root layout when the layout itself throws, so it
// can't rely on Providers/LocaleProvider (they live inside the layout that
// just failed) — it defines its own <html>/<body> and stays deliberately
// minimal and English-only, matching Next.js's own guidance for this file.

export default function GlobalError({
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="en">
            <body className="font-sans antialiased">
                <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50/50 p-6 text-center">
                    <h2 className="text-2xl font-extrabold text-slate-800">Something went wrong</h2>
                    <p className="max-w-md text-sm text-slate-500">
                        The application hit an unexpected error and couldn&apos;t recover on its own. You can try again, or reload the page.
                    </p>
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 cursor-pointer"
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    )
}
