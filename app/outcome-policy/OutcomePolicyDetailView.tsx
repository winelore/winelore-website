"use client"

import React, { useState, useEffect, useMemo } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { ScrollText, Calendar, Save, Loader2, CheckCircle, Hash } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { useMobileNavTitle } from "@/lib/mobileNav"
import { getDateLocale } from '@winelore/core/i18n'
import { AppHeader } from "@/components/AppHeader"
import { useMobileNavBack } from "@/lib/mobileNav"
import { useRouter } from "next/navigation"
import { updateOutcomePolicyAction } from "@/app/myOutcomePolicies/actions"
import { policyEditionAt, policyEditions, type OutcomePolicyEdition } from "@winelore/core"

interface OutcomePolicy {
    id: string
    name: string
    createdAt: string
}

interface OutcomePolicyDetailProps {
    policy: OutcomePolicy
    edition?: OutcomePolicyEdition | null
    editions?: OutcomePolicyEdition[]
    initialVersion?: number
    currentAuid: number
}

export default function OutcomePolicyDetailView({
    policy,
    edition,
    editions = [],
    initialVersion,
    currentAuid,
}: OutcomePolicyDetailProps) {
    const { t, locale } = useTranslation()
    const allEditions = useMemo(() => {
        const list = editions && editions.length > 0 ? editions : (edition ? [edition] : [])
        return policyEditions(list)
    }, [editions, edition])

    const [selectedEdition, setSelectedEdition] = useState<OutcomePolicyEdition | null>(
        () => policyEditionAt(allEditions, initialVersion) ?? edition ?? null
    )
    const [scriptCode, setScriptCode] = useState(selectedEdition?.scriptCode || "")
    const [isSaving, setIsSaving] = useState(false)
    const [savedRecently, setSavedRecently] = useState(false)
    const router = useRouter()
    const formattedDate = new Intl.DateTimeFormat(getDateLocale(locale), {
        month: "short", day: "numeric", year: "numeric"
    }).format(new Date(policy.createdAt))

    useEffect(() => {
        if (selectedEdition && typeof selectedEdition.scriptCode === "string") {
            setScriptCode(selectedEdition.scriptCode)
        }
    }, [selectedEdition?.id])

    const hasChanges = scriptCode !== (selectedEdition?.scriptCode || "")

    const handleSelectEdition = (item: OutcomePolicyEdition) => {
        setSelectedEdition(item)
        setSavedRecently(false)
        if (typeof window !== "undefined") {
            const url = new URL(window.location.href)
            url.searchParams.set("version", String(item.version))
            window.history.replaceState(null, "", url.toString())
        }
    }

    const handleSave = async () => {
        if (!selectedEdition || !hasChanges) return

        setIsSaving(true)
        try {
            // As the signed-in owner; this used to fall back to the action's default actor.
            await updateOutcomePolicyAction(policy.id, scriptCode, currentAuid)
            setSavedRecently(true)
            router.push("/myOutcomePolicies")
        } catch (error) {
            console.error("Failed to save script:", error)
        } finally {
            setIsSaving(false)
        }
    }



    // No back control on desktop here; on phones the nav bar still needs one.
    useMobileNavBack("/myOutcomePolicies", t("common.myOutcomePolicies"))

    const navTitleRef = useMobileNavTitle<HTMLHeadingElement>(policy.name)

    return (
        <div className="app-screen bg-slate-50/50">
            <AppHeader activeTab="none" />

            <main className="app-main px-4 pt-2 pb-6 md:p-6 flex flex-col gap-4 md:gap-6">
                <div className="bg-white border border-slate-100 rounded-[24px] sm:rounded-[32px] p-5 sm:p-7 shadow-sm sm:shadow-xl shadow-slate-200/50 flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <ScrollText className="h-7 w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 ref={navTitleRef} className="text-2xl font-bold text-slate-800 truncate">{policy.name}</h2>
                        <span className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-semibold">
                            <Calendar className="w-3.5 h-3.5" />
                            {formattedDate}
                            {selectedEdition && (
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                                    selectedEdition.status === "ACTIVE"
                                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                        : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}>
                                    v{selectedEdition.version} · {selectedEdition.status}
                                </span>
                            )}
                        </span>
                    </div>
                </div>

                {/* Edition selector (if multiple) */}
                {allEditions.length > 1 && (
                    <div className="bg-white border border-slate-100 rounded-[24px] sm:rounded-[32px] shadow-sm sm:shadow-xl shadow-slate-200/50 p-5 sm:p-6">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Hash className="w-4 h-4 text-indigo-500" />
                            {t("outcomePolicyDetail.editionHistory")}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {allEditions.map((item) => {
                                const isActive = selectedEdition?.id === item.id
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelectEdition(item)}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                            isActive
                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                                        }`}
                                    >
                                        v{item.version}
                                        {item.status === "ACTIVE" && (
                                            <span className="ml-1.5 text-emerald-400">●</span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                <div className="bg-white border border-slate-100 rounded-[24px] sm:rounded-[32px] shadow-sm sm:shadow-xl shadow-slate-200/50 flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                            {t("outcomePolicyDetail.scriptTitle")}
                        </h3>
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || isSaving || !selectedEdition}
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:scale-105 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                        >
                            {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : savedRecently ? (
                                <CheckCircle className="w-3.5 h-3.5" />
                            ) : (
                                <Save className="w-3.5 h-3.5" />
                            )}
                            {savedRecently ? t("outcomePolicyDetail.saved") : t("outcomePolicyDetail.save")}
                        </button>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <CodeMirror
                            value={scriptCode}
                            onChange={setScriptCode}
                            extensions={[javascript()]}
                            height="100%"
                            className="h-full text-sm"
                        />
                    </div>
                </div>
            </main>
        </div>
    )
}