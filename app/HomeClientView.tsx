"use client"

import React, { useState, useEffect } from "react"
import { FileText, Trophy, Wine, CheckCircle, ChevronRight, Activity, ClipboardList } from "lucide-react"
import { AppHeader } from "@/components/AppHeader"
import { EntityCardLink, BeverageCard, CompetitionCard, CommissionCard } from "@/components/list"
import { useTranslation } from "@/lib/i18n/context"
import Link from "next/link"
import { useUsernames } from "@/hooks/useUsernames"
import { useMobileNavTitle } from "@/lib/mobileNav"

function TemplateCard({ template }: { template: any }) {
    return (
        <EntityCardLink href={`/myTemplates?templateId=${template.id}-${template.latestEdition?.version || 0}`} padding="dashboard" layout="row">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <ClipboardList className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {template.beverageType && (
                        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                            {template.beverageType}
                        </span>
                    )}
                    {template.latestEdition?.version && (
                        <span className="text-[10px] font-bold tracking-widest text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                            v{template.latestEdition.version}
                        </span>
                    )}
                </div>
                <h3 className="text-sm font-bold text-slate-800 truncate mt-0.5 group-hover:text-indigo-600 transition-colors">
                    {template.name}
                </h3>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
        </EntityCardLink>
    )
}

/**
 * Section heading of a dashboard block. On phones it also carries the
 * "View all" link (iOS "See All" style), since the block's footer button is
 * hidden there to keep the stack compact.
 */
function SectionTitle({ icon: Icon, title, href, viewAllLabel }: { icon: React.ElementType; title: string; href: string; viewAllLabel: string }) {
    return (
        <div className="flex items-center gap-2 px-1 sm:px-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                <Icon className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 min-w-0 truncate">{title}</h2>
            <Link href={href} className="sm:hidden ml-auto flex shrink-0 items-center gap-0.5 py-1 pl-2 text-[15px] font-semibold text-indigo-600 active:opacity-50">
                {viewAllLabel}
                <ChevronRight className="w-4 h-4" />
            </Link>
        </div>
    )
}

// Phones drop the white container around each block: the cards inside are
// already cards, and a card-in-card eats a third of a narrow screen in padding.
const SECTION_PANEL = "sm:bg-white sm:border sm:border-slate-100 sm:rounded-[32px] sm:shadow-sm h-full flex flex-col"
const SECTION_FOOTER = "mt-5 hidden sm:flex justify-center border-t border-slate-50 pt-5"
const SECTION_EMPTY = "bg-white border border-slate-100 rounded-[24px] sm:rounded-[32px] p-8 text-center shadow-sm flex flex-col items-center justify-center h-full min-h-[160px] sm:min-h-[200px]"

export default function HomeClientView({ recentCompetitions, myCommissions, recentBeverages, myTemplates, beverageTypesMap, nextCursor, currentPage, totalPages, totalCompetitionsCount, totalBeveragesCount }: {
    recentCompetitions: any[];
    myCommissions: any[];
    recentBeverages: any[];
    myTemplates: any[];
    beverageTypesMap: Record<string, string>;
    nextCursor?: string | null;
    currentPage?: number;
    totalPages?: number;
    totalCompetitionsCount?: number;
    totalBeveragesCount?: number;
}) {
    // Collect AUIDs for username fetching
    const auidsToFetch = React.useMemo(() => {
        const ids = new Set<string>()
        recentCompetitions.forEach(c => {
            if (c.holder) {
                c.holder.forEach((id: number) => ids.add(String(id)))
            }
        })
        recentBeverages.forEach(bev => {
            (bev.producers || []).forEach((producer: any) => {
                (producer.auid || []).forEach((id: number) => ids.add(String(id)))
            })
        })
        return Array.from(ids)
    }, [recentCompetitions, recentBeverages])

    const { usernames } = useUsernames(auidsToFetch)
    const { t } = useTranslation()
    const titleRef = useMobileNavTitle<HTMLHeadingElement>(t("common.home"))
    const viewAll = t("dashboard.viewAll")

    const footerLink = (href: string) => (
        <div className={SECTION_FOOTER}>
            <Link href={href} className="px-6 py-2.5 bg-slate-50 hover:bg-slate-100 text-indigo-600 text-sm font-bold rounded-full transition-colors flex items-center gap-2">
                {viewAll}
                <ChevronRight className="w-4 h-4" />
            </Link>
        </div>
    )

    return (
        <div className="app-screen bg-slate-50/50">
            <AppHeader activeTab="home" />

            <main className="app-main px-4 pt-1 pb-6 sm:p-4 lg:p-8">
                <div className="max-w-7xl mx-auto flex flex-col gap-6">
                    
                    {/* Welcome Banner */}
                    <div className="relative overflow-hidden rounded-[28px] sm:rounded-[32px] bg-white border border-slate-100 p-5 sm:p-8 shadow-sm">
                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 ref={titleRef} className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-1">{t("dashboard.welcomeTitle")}</h1>
                                <p className="text-slate-500 font-medium">{t("dashboard.welcomeSubtitle")}</p>
                            </div>
                        </div>
                        {/* Decorative background shapes for clean light theme */}
                        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-50/50 blur-3xl pointer-events-none"></div>
                        <div className="absolute -bottom-20 right-40 h-48 w-48 rounded-full bg-violet-50/50 blur-2xl pointer-events-none"></div>
                    </div>

                    {/* Bento Box Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 sm:gap-6">
                        
                        {/* Active Commissions (Priority - spans 2 columns on desktop) */}
                        <div className="lg:col-span-2 flex flex-col gap-3 sm:gap-4">
                            <SectionTitle icon={Activity} title={t("dashboard.activeCommissions")} href="/myCommissions" viewAllLabel={viewAll} />
                            
                            {myCommissions.length > 0 ? (
                                <div className={`${SECTION_PANEL} sm:p-4`}>
                                    <div className="grid gap-3 sm:grid-cols-2 content-start flex-1">
                                        {myCommissions.slice(0, 8).map(comm => (
                                            <CommissionCard key={comm.id} commission={comm} density="dashboard" />
                                        ))}
                                    </div>
                                    {footerLink("/myCommissions")}
                                </div>
                            ) : (
                                <div className={SECTION_EMPTY}>
                                    <CheckCircle className="w-10 h-10 text-slate-200 mb-3" />
                                    <p className="text-sm font-medium text-slate-500">{t("dashboard.noActiveCommissions")}</p>
                                </div>
                            )}
                        </div>

                        {/* Templates (Utility - spans 1 column) */}
                        <div className="flex flex-col gap-3 sm:gap-4">
                            <SectionTitle icon={ClipboardList} title={t("dashboard.myTemplates")} href="/myTemplates" viewAllLabel={viewAll} />
                            
                            {myTemplates.length > 0 ? (
                                <div className={`${SECTION_PANEL} sm:p-4`}>
                                    <div className="flex flex-col gap-3 flex-1">
                                        {myTemplates.slice(0, 8).map((template, idx) => (
                                            <TemplateCard key={`${template.id}-${idx}`} template={template} />
                                        ))}
                                    </div>
                                    {footerLink("/myTemplates")}
                                </div>
                            ) : (
                                <div className={SECTION_EMPTY}>
                                    <FileText className="w-10 h-10 text-slate-200 mb-3" />
                                    <p className="text-sm font-medium text-slate-500">{t("dashboard.noTemplates")}</p>
                                </div>
                            )}
                        </div>

                        {/* Competitions (Spans 2 columns on desktop) */}
                        <div className="lg:col-span-2 flex flex-col gap-3 sm:gap-4">
                            <SectionTitle icon={Trophy} title={t("dashboard.myCompetitions")} href="/myCompetitions" viewAllLabel={viewAll} />
                            
                            {recentCompetitions.length > 0 ? (
                                <div className={`${SECTION_PANEL} sm:p-5`}>
                                    <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 content-start flex-1">
                                        {recentCompetitions.slice(0, 8).map(comp => (
                                            <CompetitionCard key={comp.id} competition={comp} usernames={usernames} density="dashboard" />
                                        ))}
                                    </div>
                                    {footerLink("/myCompetitions")}
                                </div>
                            ) : (
                                <div className={SECTION_EMPTY}>
                                    <Trophy className="w-10 h-10 text-slate-200 mb-3" />
                                    <p className="text-sm font-medium text-slate-500">{t("dashboard.noRecentCompetitions")}</p>
                                </div>
                            )}
                        </div>

                        {/* Beverages */}
                        <div className="lg:col-span-1 flex flex-col gap-3 sm:gap-4">
                            <SectionTitle icon={Wine} title={t("dashboard.myBeverages")} href="/myBeverages" viewAllLabel={viewAll} />
                            
                            {recentBeverages.length > 0 ? (
                                <div className={`${SECTION_PANEL} sm:p-5`}>
                                    <div className="flex flex-col gap-3 sm:gap-4 flex-1">
                                        {recentBeverages.slice(0, 8).map(bev => (
                                            <BeverageCard key={bev.id} beverage={bev} typeMap={beverageTypesMap} usernames={usernames} density="dashboard" />
                                        ))}
                                    </div>
                                    {footerLink("/myBeverages")}
                                </div>
                            ) : (
                                <div className={SECTION_EMPTY}>
                                    <Wine className="w-10 h-10 text-slate-200 mb-3" />
                                    <p className="text-sm font-medium text-slate-500">{t("dashboard.noRecentBeverages")}</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </main>
        </div>
    )
}
