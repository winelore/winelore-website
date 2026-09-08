"use client"

import React from "react"
import { CheckCircle, Crown, GraduationCap, Trash2, UserPlus, Users } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { ActionButton, EmptyState, SectionCard, UserAvatar } from "@/components/detail"

interface Member {
    id: string
    auid: number[]
    role: "HEAD" | "EXPERT" | "TRAINEE_EXPERT"
    isReady: boolean
}

const ROLE_STYLES: Record<Member["role"], { className: string; icon?: React.ComponentType<{ className?: string }> }> = {
    HEAD: { className: "border-amber-500/20 bg-amber-500/10 text-amber-700", icon: Crown },
    TRAINEE_EXPERT: { className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700", icon: GraduationCap },
    EXPERT: { className: "border-indigo-100 bg-indigo-50 text-indigo-600" },
}

/**
 * Who is tasting this replica and whether they are ready.
 *
 * Readiness is the number the head of commission checks over and over before
 * starting, so it gets a progress bar rather than a "3 / 5 Ready" chip tucked
 * into the corner of the header.
 */
export function PanelMembers({
    replicaName,
    members,
    usernames,
    currentAuid,
    canAddMember,
    onAddMember,
    canRemoveMember,
    onRemoveMember,
    removingMemberId,
}: {
    replicaName: string
    members: Member[]
    usernames: Record<number, string>
    currentAuid: number | null
    canAddMember: boolean
    onAddMember: () => void
    canRemoveMember: boolean
    onRemoveMember: (id: string) => void
    removingMemberId: string | null
}) {
    const { t } = useTranslation()

    const sorted = [...members].sort((a, b) => {
        const roleOrder = { HEAD: 1, EXPERT: 2, TRAINEE_EXPERT: 3 }
        return (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99)
    })

    const readyCount = members.filter(m => m.isReady).length
    const readyPct = members.length ? Math.round((readyCount / members.length) * 100) : 0

    return (
        <SectionCard
            icon={Users}
            title={t("commission.tastingPanel", { name: replicaName })}
            subtitle={t("commission.tastingPanelSubtitle")}
            actions={
                canAddMember ? (
                    <ActionButton size="sm" variant="secondary" icon={UserPlus} onClick={onAddMember}>
                        {t("commission.addExpert")}
                    </ActionButton>
                ) : null
            }
        >
            {members.length > 0 && (
                <div className="mb-4">
                    <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            {t("commission.readyCount", { ready: readyCount, total: members.length })}
                        </span>
                        <span className="text-xs font-semibold tabular-nums text-slate-500">{readyPct}%</span>
                    </div>
                    <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                        role="progressbar"
                        aria-valuenow={readyCount}
                        aria-valuemin={0}
                        aria-valuemax={members.length}
                        aria-label={t("commission.readyCount", { ready: readyCount, total: members.length })}
                    >
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                readyPct === 100 ? "bg-emerald-500" : "bg-indigo-500"
                            }`}
                            style={{ width: `${readyPct}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-2">
                {sorted.map(p => {
                    const isMe = currentAuid !== null && p.auid.includes(currentAuid)
                    const role = ROLE_STYLES[p.role] ?? ROLE_STYLES.EXPERT
                    const RoleIcon = role.icon

                    return (
                        <div
                            key={p.id}
                            className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                                isMe ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200/70 bg-slate-50/50"
                            }`}
                        >
                            <UserAvatar
                                auid={p.auid[0] || 0}
                                username={usernames[p.auid[0]]}
                                role={p.role}
                                className="h-9 w-9"
                            />

                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <div className="flex min-w-0 items-center gap-1.5">
                                    <span className="truncate text-sm font-semibold text-slate-900">
                                        {p.auid.map(id => usernames[id] || String(id)).join(", ")}
                                    </span>
                                    {isMe && (
                                        <span className="shrink-0 rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                                            {t("common.you")}
                                        </span>
                                    )}
                                </div>
                                <span
                                    className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${role.className}`}
                                >
                                    {RoleIcon && <RoleIcon className="h-3 w-3" />}
                                    {p.role === "HEAD"
                                        ? t("commission.roleHead")
                                        : p.role === "TRAINEE_EXPERT"
                                          ? t("commission.roleTrainee")
                                          : t("commission.roleExpert")}
                                </span>
                            </div>

                            <div
                                className={`flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                                    p.isReady ? "text-emerald-600" : "text-slate-400"
                                }`}
                            >
                                {p.isReady ? (
                                    <>
                                        <CheckCircle className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">{t("commission.statusReady")}</span>
                                    </>
                                ) : (
                                    <>
                                        <span
                                            aria-hidden
                                            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-dashed border-slate-300"
                                            style={{ animationDuration: "3s" }}
                                        />
                                        <span className="hidden sm:inline">{t("commission.statusWaiting")}</span>
                                    </>
                                )}
                            </div>

                            {canRemoveMember && (
                                <button
                                    type="button"
                                    onClick={() => onRemoveMember(p.id)}
                                    disabled={removingMemberId === p.id}
                                    title={t("commission.deleteExpert")}
                                    aria-label={t("commission.deleteExpert")}
                                    className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                                >
                                    {removingMemberId === p.id ? (
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
                                    ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                </button>
                            )}
                        </div>
                    )
                })}

                {members.length === 0 && (
                    <EmptyState
                        icon={Users}
                        title={t("commission.noMembers")}
                        action={
                            canAddMember ? (
                                <ActionButton size="sm" icon={UserPlus} onClick={onAddMember}>
                                    {t("commission.addExpert")}
                                </ActionButton>
                            ) : undefined
                        }
                    />
                )}
            </div>
        </SectionCard>
    )
}
