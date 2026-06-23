"use client"

import React, { useState, useEffect } from "react"
import Cookies from "js-cookie"
import Link from "next/link"
import { FileText, Trophy, Wine, Tag, AlertCircle, CheckCircle } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { ProfileMenu } from "@/components/wine-lore-main"
import { TranslatedText } from "@/lib/i18n/TranslatedText"

const tabs = (t: any) => [
    { id: "feed", label: t("common.feed"), icon: FileText },
    { id: "competitions", label: t("common.competitions"), icon: Trophy },
    { id: "beverages", label: t("common.beverages"), icon: Wine },
]

const formatEnumStatus = (status: string | undefined): string => {
    if (!status) return ""
    return status
        .toLowerCase()
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
}

// ====================================================================
// INTERFACES
// ====================================================================
type BeverageStatus = "APPROVED" | "DRAFT" | "PUBLISHED" | "SUBMITTED" | "SUSPENDED"
type BeverageType = "FORTIFIED" | "RED" | "ROSE" | "SPARKLING" | "WHITE"

interface ProducerDetails {
    id: string
    auid: number[]
    role: "DISTRIBUTOR" | "MAKER" | "OWNER"
}

interface Beverage {
    id: string
    name: string
    status: BeverageStatus
    type: BeverageType
    producers: ProducerDetails[]
}

interface InitialData {
    beverages: Beverage[]
}

function BeverageCard({ bev }: { bev: Beverage }) {
    const { formatStatus, formatBeverageType } = useTranslation()
    return (
        <Link
            href={`/beverage/${bev.id}`}
            className="group bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 flex flex-col min-h-[140px]"
        >
            <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <Wine className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                        {formatBeverageType(bev.type)}
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 truncate mt-0.5 group-hover:text-indigo-600 transition-colors">
                        <TranslatedText text={bev.name} />
                    </h3>
                </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    bev.status === "APPROVED" || bev.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        bev.status === "SUSPENDED" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                            "bg-amber-50 text-amber-600 border border-amber-100"
                }`}>
                    {bev.status === "APPROVED" || bev.status === "PUBLISHED" ? <CheckCircle className="w-3 h-3" /> :
                        bev.status === "SUSPENDED" ? <AlertCircle className="w-3 h-3" /> :
                            <Tag className="w-3 h-3" />}
                    {formatStatus(bev.status)}
                </span>

                <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[50%]">
                    ID: {bev.id.slice(-6)}
                </span>
            </div>
        </Link>
    )
}

export default function MyBeveragesClientView({ initialData }: { initialData: InitialData }) {
    const [activeTab, setActiveTab] = useState("beverages")
    const [currentAuid, setCurrentAuid] = useState<number>(4) // Замокано для тестування
    const { t } = useTranslation()
    const myTabs = tabs(t)

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) setCurrentAuid(parseInt(cookieAuid, 10))
    }, [])

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <header className="flex shrink-0 items-center border-b border-slate-100 bg-white px-6 py-4">
                <div className="flex-1 flex items-center justify-start">
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">WineLore</h1>
                </div>
                <div className="flex-none">
                    <nav className="flex items-center rounded-full border border-slate-100 bg-slate-50/50 p-1">
                        {myTabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive ? "bg-white text-slate-800 shadow-sm border border-slate-100/50" : "text-slate-500 hover:text-slate-800"}`}
                                >
                                    <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : ""}`} />
                                    <span>{tab.label}</span>
                                </button>
                            )
                        })}
                    </nav>
                </div>
                <div className="flex-1 flex justify-end gap-3">
                    <LanguageSwitcher />
                    <ProfileMenu username="likespro" />
                </div>
            </header>

            <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-7xl flex flex-col gap-8">

                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{t("myBeverages.title")}</h2>
                            <p className="text-sm text-slate-500 mt-1">{t("myBeverages.subtitle")}</p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                            {t("myBeverages.count", { count: initialData.beverages.length })}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {initialData.beverages.map((bev) => (
                            <BeverageCard key={bev.id} bev={bev} />
                        ))}

                        {initialData.beverages.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-slate-100 rounded-[32px] shadow-xl shadow-slate-200/50">
                                <Wine className="w-12 h-12 text-slate-300 mb-4" />
                                <h3 className="text-lg font-bold text-slate-700">{t("myBeverages.emptyTitle")}</h3>
                                <p className="text-sm text-slate-500 mt-1 max-w-md">{t("myBeverages.emptyDescription")}</p>
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    )
}