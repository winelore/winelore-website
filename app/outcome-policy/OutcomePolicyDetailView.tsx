"use client"

import React, { useState, useEffect } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { ScrollText, Calendar, Save, Loader2, CheckCircle } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { getDateLocale } from "@/lib/i18n"
import { AppHeader } from "@/components/AppHeader"
import { fetchGraphQL } from "@/lib/apiClient"
import { useRouter } from "next/navigation"
import { UPDATE_OUTCOME_POLICY_EDITION_SCRIPT } from "./mutations"

interface OutcomePolicy {
    id: string
    name: string
    createdAt: string
}

interface OutcomePolicyEdition {
    id: string
    version: number
    scriptCode: string
    status: string
}

interface OutcomePolicyDetailProps {
    policy: OutcomePolicy
    edition: OutcomePolicyEdition | null
}

export default function OutcomePolicyDetailView({ policy, edition }: OutcomePolicyDetailProps) {
    const { t, locale } = useTranslation()
    const [scriptCode, setScriptCode] = useState(edition?.scriptCode || "")
    const [isSaving, setIsSaving] = useState(false)
    const [savedRecently, setSavedRecently] = useState(false)
    const router = useRouter()
    const formattedDate = new Intl.DateTimeFormat(getDateLocale(locale), {
        month: "short", day: "numeric", year: "numeric"
    }).format(new Date(policy.createdAt))

    useEffect(() => {
        if (edition && typeof edition.scriptCode === 'string') {
            setScriptCode(edition.scriptCode);
        }
    }, [edition?.scriptCode]);

    const hasChanges = scriptCode !== (edition?.scriptCode || "")

    const handleSave = async () => {
        if (!edition || !hasChanges) return

        setIsSaving(true)
        try {
            await fetchGraphQL(UPDATE_OUTCOME_POLICY_EDITION_SCRIPT, {
                id: edition.id,
                scriptCode,
            })
            setSavedRecently(true)
            router.push("/myOutcomePolicies")
        } catch (error) {
            console.error("Failed to save script:", error)
        } finally {
            setIsSaving(false)
        }
    }



    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab="none" />

            <main className="flex-1 overflow-auto p-6 flex flex-col gap-6">
                <div className="bg-white border border-slate-100 rounded-[32px] p-7 shadow-xl shadow-slate-200/50 flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <ScrollText className="h-7 w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold text-slate-800 truncate">{policy.name}</h2>
                        <span className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-semibold">
                            <Calendar className="w-3.5 h-3.5" />
                            {formattedDate}
                            {edition && (
                                <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider">
                                    v{edition.version} · {edition.status}
                                </span>
                            )}
                        </span>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-[32px] shadow-xl shadow-slate-200/50 flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                            {t("outcomePolicyDetail.scriptTitle")}
                        </h3>
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || isSaving || !edition}
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