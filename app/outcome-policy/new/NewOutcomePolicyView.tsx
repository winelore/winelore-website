"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { ScrollText, Loader2, ArrowLeft } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { AppHeader } from "@/components/AppHeader"
import { fetchGraphQL } from "@/lib/apiClient"
import { CREATE_OUTCOME_POLICY, CREATE_OUTCOME_POLICY_EDITION } from "./mutations"

interface NewOutcomePolicyProps {
    currentAuid: number
}

const DEFAULT_SCRIPT = "// outcome policy script\n"

export default function NewOutcomePolicyView({ currentAuid }: NewOutcomePolicyProps) {
    const { t } = useTranslation()
    const router = useRouter()

    const [name, setName] = useState("")
    const [scriptCode, setScriptCode] = useState(DEFAULT_SCRIPT)
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const canCreate = name.trim().length > 0 && !isCreating

    const handleCreate = async () => {
        if (!canCreate) return
        setIsCreating(true)
        setError(null)

        try {
            const policyResponse = await fetchGraphQL(CREATE_OUTCOME_POLICY, {
                input: {
                    name: name.trim(),
                    owners: [[currentAuid]],
                },
            })
            const policy = policyResponse.createOutcomePolicy

            await fetchGraphQL(CREATE_OUTCOME_POLICY_EDITION, {
                input: {
                    policyId: policy.id,
                    version: 1,
                    scriptCode,
                    calculationScope: "REPLICA_WIDE",
                },
            })

            router.push("/myOutcomePolicies")
        } catch (err) {
            console.error("Failed to create outcome policy:", err)
            setError(t("newOutcomePolicy.error"))
            setIsCreating(false)
        }
    }

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab="none" />

            <main className="flex-1 overflow-auto p-6 flex flex-col gap-6">
                <button
                    onClick={() => router.push("/myOutcomePolicies")}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors w-fit"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {t("newOutcomePolicy.back")}
                </button>

                <div className="bg-white border border-slate-100 rounded-[32px] p-7 shadow-xl shadow-slate-200/50 flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <ScrollText className="h-7 w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold text-slate-800">{t("newOutcomePolicy.title")}</h2>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t("newOutcomePolicy.namePlaceholder")}
                            className="mt-2 w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                        />
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-[32px] shadow-xl shadow-slate-200/50 flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                            {t("newOutcomePolicy.scriptTitle")}
                        </h3>
                        <button
                            onClick={handleCreate}
                            disabled={!canCreate}
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:scale-105 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                        >
                            {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            {t("newOutcomePolicy.create")}
                        </button>
                    </div>

                    {error && (
                        <div className="px-6 py-3 text-sm text-rose-600 bg-rose-50 border-b border-rose-100">
                            {error}
                        </div>
                    )}

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