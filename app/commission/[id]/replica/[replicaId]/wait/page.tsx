"use client"

import React, { useState, useEffect, useCallback, use, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { toast } from "sonner"
import { Users, Wine, Loader2, ArrowRight, AlertTriangle } from "lucide-react"
import WineJumperGame from "@/components/WineJumperGame"
import { AppHeader } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { useUsernames } from "@/hooks/useUsernames"
import { useEvaluationLiveUpdates } from "@/hooks/useEvaluationLiveUpdates"

import {
    getWaitDataAction,
    markCandidateEvaluatedAction,
    confirmEvaluationAction,
} from "../../../../actions"
import { formatSignedDiff } from '@winelore/core';
import { advancePanelErrorKey, emptyWaitRoom, type WaitRoomProgress, type WaitRoomState } from '@winelore/core/commission';
import { resolveWaitDestination } from '@winelore/core/evaluation';
import {
    clearCachedWaitEvaluation,
    readCachedWaitEvaluation,
} from "../../../../waitEvaluationCache"
import {
    hasEvaluationData,
    MemberEvaluationSection,
} from "../../../../EvaluationCommentsDisplay"
import { BackLink } from "@/components/BackLink"

export default function WaitPage({ params }: { params: Promise<{ id: string; replicaId: string }> }) {
    const { id: commissionId, replicaId } = use(params);
    const router = useRouter();
    const { t, tCount } = useTranslation();
    const [auid, setAuid] = useState<number | null>(null);
    const [room, setRoom] = useState<WaitRoomState>(() => emptyWaitRoom());
    const [isSwitching, setIsSwitching] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    // The evaluation cached at submit, until the server reports it back.
    const [cachedEvaluation, setCachedEvaluation] = useState<any | null>(null);

    // The candidate this screen has been waiting on, so the chair advancing
    // is detectable across polls.
    const waitingOnRef = useRef<string | null>(null);

    // Fetch usernames for commission members
    const allMemberAuids = useMemo(
        () => Array.from(new Set(room.members.flatMap((member) => member.auids))),
        [room.members],
    );
    const { usernames } = useUsernames(allMemberAuids);

    // 1. Read AUID from cookie and restore cached evaluation from submit
    useEffect(() => {
        const cookieAuid = Cookies.get("auid");
        if (!cookieAuid) {
            router.push("/auth/login");
            return;
        }
        setAuid(parseInt(cookieAuid, 10));

        const cached = readCachedWaitEvaluation(commissionId, replicaId);
        if (cached) {
            setCachedEvaluation(cached);
        }
    }, [commissionId, replicaId, router]);

    // 2. Real-time updates via SSE with in-flight guard and relaxed fallback polling
    const isFetchingRef = useRef(false);

    const fetchData = useCallback(async () => {
        if (auid === null || isRedirecting || isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            const data = await getWaitDataAction(commissionId, replicaId);
            if (isRedirecting) return;

            setRoom(data);

            if (data.myEvaluation && hasEvaluationData(data.myEvaluation, data.flags)) {
                clearCachedWaitEvaluation(commissionId, replicaId);
                setCachedEvaluation(null);
            }

            // Where a waiting judge belongs is core's rule, shared with the
            // app, so both are sent to the same place by the same state.
            const cached = readCachedWaitEvaluation(commissionId, replicaId);
            const destination = resolveWaitDestination({
                replicaStatus: data.replicaStatus,
                isPanelFinished: data.isPanelFinished,
                currentCandidateId: data.currentCandidateId,
                hasCompletedCurrentCandidate: data.hasCompletedCurrentCandidate,
                waitingOnCandidateId: waitingOnRef.current,
                recentSubmission: cached
                    ? { candidateId: cached.candidateId, isComplete: cached.isComplete }
                    : null,
            });

            const base = `/commission/${commissionId}`;
            switch (destination.kind) {
                case "results":
                    setIsRedirecting(true);
                    router.replace(`${base}/results`);
                    return;
                case "panelSummary":
                    if (!data.currentPanelId) break;
                    setIsRedirecting(true);
                    router.replace(`${base}/replica/${replicaId}/panel-summary`);
                    return;
                case "candidate":
                    setIsRedirecting(true);
                    router.replace(`${base}/replica/${replicaId}/candidate/${destination.candidateId}`);
                    return;
                case "wait":
                    break;
            }

            waitingOnRef.current = data.currentCandidateId;
            setIsSwitching(false);
        } catch (err) {
            console.error("Evaluation update error", err);
        } finally {
            isFetchingRef.current = false;
        }
    }, [commissionId, replicaId, auid, isRedirecting, router]);

    // Initial fetch when authenticated
    useEffect(() => {
        if (auid !== null && !isRedirecting) {
            fetchData();
        }
    }, [auid, isRedirecting, fetchData]);

    // Live Server-Sent Events subscription
    useEvaluationLiveUpdates({
        commissionId,
        replicaId,
        onUpdate: fetchData,
        enabled: auid !== null && !isRedirecting,
    });

    const {
        progress,
        propertyMap,
        flags,
        currentCandidateId,
        currentCandidateCode,
        currentCandidateBeverageName,
        currentPanelName,
        candidatesLeft,
        candidatesLeftAfterCurrent,
    } = room;
    const { wineJumperMiniGameEnabled, propertyCommentsEnabled, voiceCommentsEnabled } = flags;
    const heads = progress.filter((row) => row.member.isHead);
    const experts = progress.filter((row) => !row.member.isHead);
    const myEvaluation = room.myEvaluation ?? cachedEvaluation;
    const nameOf = (row: WaitRoomProgress) =>
        row.member.auids.map((id) => usernames[id] || id).join(", ");

    // HEAD action: advance to next beverage
    const handleNextBeverage = async () => {
        if (!room.canAdvance || isSwitching || !currentCandidateId) return;
        setIsSwitching(true);
        try {
            const result = await markCandidateEvaluatedAction(replicaId, currentCandidateId);
            if (!result?.nextCandidateId) {
                setIsRedirecting(true);
                router.replace(`/commission/${commissionId}/replica/${replicaId}/panel-summary`);
            }
            // For a regular beverage transition, polling detects the new candidate.
        } catch (err: any) {
            console.error(err);
            toast.error(t(advancePanelErrorKey(err?.message || "")));
            setIsSwitching(false);
        }
    };

    const handleConfirmEvaluation = async (evaluationId: string) => {
        try {
            const res = await confirmEvaluationAction(evaluationId);
            if (res.success) {
                toast.success(t("evaluation.confirmSuccess"));
                // The next poll brings the confirmed evaluation back; nudging
                // it now only keeps the button from re-appearing in between.
                setRoom((prev) => ({
                    ...prev,
                    progress: prev.progress.map((row) =>
                        row.evaluation?.id === evaluationId
                            ? { ...row, isCompleted: true, evaluation: { ...row.evaluation, status: "CONFIRMED", isComplete: true } }
                            : row,
                    ),
                    myEvaluation:
                        prev.myEvaluation?.id === evaluationId
                            ? { ...prev.myEvaluation, status: "CONFIRMED", isComplete: true }
                            : prev.myEvaluation,
                }));
            } else {
                toast.error(res.error || t("evaluation.submitError"));
            }
        } catch (err: any) {
            toast.error(err?.message || t("evaluation.submitError"));
        }
    };

    const role = room.myRole;

    if (role === "HEAD") {
        return (
            <div className="flex min-h-app flex-col bg-slate-50/50">
                <AppHeader activeTab="competitions" />
                <main className="flex-1 px-4 pt-1 pb-6 md:p-10">
                    <div className="max-w-7xl mx-auto space-y-8">
                    <div>
                        <BackLink href={`/commission/${commissionId}`} label={t("commission.backToCommission")} />
                    </div>
                    <header className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                                {t("commission.headDashboard")}
                                {currentPanelName && (
                                    <>
                                        <span className="text-slate-300 font-normal">|</span>
                                        <span className="text-slate-800">{t("commission.panel")}:</span>
                                        <span className="text-slate-500 font-normal">{currentPanelName}</span>
                                    </>
                                )}
                            </h1>
                            <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5 flex-wrap">
                                <span>{t("commission.currentCandidateLabel")}</span>
                                <span className="font-mono font-semibold text-indigo-600">
                                    {currentCandidateCode || (currentCandidateId ? `#${currentCandidateId.slice(0, 8)}` : t("common.none"))}
                                </span>
                                {currentCandidateId && (
                                    <span className="text-[11px] text-slate-400 font-mono font-normal">
                                        ({currentCandidateId})
                                    </span>
                                )}
                                {currentCandidateBeverageName && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 ml-1">
                                        <Wine className="w-3 h-3 text-amber-700 shrink-0" />
                                        {currentCandidateBeverageName}
                                    </span>
                                )}
                            </p>
                            {candidatesLeft > 0 && (
                                <p className="text-xs text-slate-500 mt-1">
                                    {tCount("commission.candidatesLeftToEvaluate", candidatesLeft)}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={handleNextBeverage}
                            disabled={!room.canAdvance || isSwitching}
                            className="px-8 py-3.5 rounded-xl font-bold text-white transition-all flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
                        >
                            {isSwitching ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {room.isLastCandidateInPanel
                                        ? t("commission.finishPanel")
                                        : t("commission.nextBeverage")}
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </header>

                    <div className={wineJumperMiniGameEnabled ? "grid grid-cols-1 xl:grid-cols-3 gap-8" : "flex flex-col gap-8"}>
                        {/* Experts list */}
                        <div className={`${wineJumperMiniGameEnabled ? "xl:col-span-2" : "w-full"} bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100`}>
                            <h2 className="text-lg font-bold flex items-center gap-2 mb-6 text-slate-800">
                                <Users className="text-indigo-500 w-5 h-5" />
                                {tCount("commission.commissionMembers", room.members.length)}
                            </h2>
                            <div className="space-y-3">
                                {room.members.length === 0 && (
                                    <p className="text-slate-400 text-sm">{t("commission.loadingMembers")}</p>
                                )}
                                
                                {/* 1. Render Heads */}
                                {heads.map((row, i) => {
                                    const headAuidsStr = nameOf(row);
                                    const headKeyAuid = row.member.auids[0] ?? i;
                                    const { evaluation, isCompleted } = row;

                                    return (
                                        <div key={`${currentCandidateId}-head-${headKeyAuid}`} className="flex flex-col p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-indigo-950">
                                                        {headAuidsStr}
                                                    </span>
                                                    <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                        {t("commission.headOfCommission")}
                                                    </span>
                                                </div>
                                                {isCompleted ? (
                                                    <span className="text-emerald-600 font-bold bg-emerald-100 px-3 py-1 rounded-full text-xs animate-fade-in">
                                                        {t("commission.completed")}
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-600 font-bold bg-amber-100 px-3 py-1 rounded-full text-xs">
                                                        {t("commission.evaluating")}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {isCompleted && evaluation && (
                                                <MemberEvaluationSection
                                                    evaluation={evaluation}
                                                    propertyMap={propertyMap}
                                                    accent="indigo"
                                                    propertyCommentsEnabled={propertyCommentsEnabled}
                                                    voiceCommentsEnabled={voiceCommentsEnabled}
                                                    onConfirmEvaluation={handleConfirmEvaluation}
                                                />
                                            )}
                                        </div>
                                    );
                                })}

                                {/* 2. Render Experts */}
                                {experts.map((row, i) => {
                                    const expertAuidsStr = nameOf(row);
                                    const expertKeyAuid = row.member.auids[0] ?? i;
                                    const { evaluation, isCompleted, outlier: outlierInfo } = row;
                                    const isOutlier = Boolean(outlierInfo?.isOutlier);

                                    return (
                                        <div
                                            key={`${currentCandidateId}-expert-${expertKeyAuid}`}
                                            className={`flex flex-col p-4 rounded-2xl space-y-3 transition-all ${
                                                isOutlier
                                                    ? "bg-amber-50/90 border-2 border-amber-300 shadow-amber-100/50"
                                                    : "bg-slate-50 border border-slate-100"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold text-slate-700">
                                                        {expertAuidsStr} {row.member.isTrainee ? `(${t("commission.roleTrainee")})` : ""}
                                                    </span>
                                                    {isOutlier && (
                                                        <span
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs"
                                                            title={t("commission.results.outOfDeltaTooltip", {
                                                                score: evaluation?.scores?.find((s) => propertyMap[s.code]?.isResult)?.value ?? "-",
                                                                diff: formatSignedDiff(outlierInfo?.signedDiff),
                                                                avg: outlierInfo?.preAvg != null ? outlierInfo.preAvg.toFixed(1) : "-",
                                                                threshold: 5,
                                                            })}
                                                        >
                                                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                                            <span>{t("commission.results.outOfDelta")}</span>
                                                            {outlierInfo?.signedDiff != null && (
                                                                <span className="opacity-90 font-mono">({formatSignedDiff(outlierInfo.signedDiff)})</span>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                                {isCompleted ? (
                                                    <span className="text-emerald-600 font-bold bg-emerald-100 px-3 py-1 rounded-full text-xs animate-fade-in">
                                                        {t("commission.completed")}
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-600 font-bold bg-amber-100 px-3 py-1 rounded-full text-xs">
                                                        {t("commission.evaluating")}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {evaluation && hasEvaluationData(evaluation, flags) && (
                                                <MemberEvaluationSection
                                                    evaluation={evaluation}
                                                    propertyMap={propertyMap}
                                                    accent="slate"
                                                    forceShowAll={!isCompleted}
                                                    propertyCommentsEnabled={propertyCommentsEnabled}
                                                    voiceCommentsEnabled={voiceCommentsEnabled}
                                                    onConfirmEvaluation={handleConfirmEvaluation}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {wineJumperMiniGameEnabled && (
                            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col items-center">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{t("commission.boredPlay")}</h3>
                                <WineJumperGame />
                            </div>
                        )}
                    </div>
                </div>
                </main>
            </div>
        )
    }

    // ==========================================
    // EXPERT VIEW
    // ==========================================
    return (
        <div className="flex min-h-app flex-col bg-slate-50/50">
            <AppHeader activeTab="competitions" />
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-full max-w-2xl flex justify-start mb-6">
                    <BackLink href={`/commission/${commissionId}`} label={t("commission.backToCommission")} />
                </div>

                <div className="relative mb-10 flex justify-center">
                    <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center animate-pulse border border-indigo-100">
                        <Wine className="w-10 h-10 text-indigo-600" />
                    </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-4">
                    {t("commission.evaluationSubmitted")}
                </h1>
                <div className="max-w-md mx-auto mb-8 space-y-4">
                    <p className="text-slate-500 text-lg font-medium">
                        {t("commission.waitingNextRound")} {t("commission.autoRefreshNotice")}
                    </p>
                    {candidatesLeftAfterCurrent > 0 && (
                        <p className="text-indigo-600 text-sm font-semibold">
                            {tCount("commission.candidatesLeftToEvaluate", candidatesLeftAfterCurrent)}
                        </p>
                    )}
                </div>

                {(myEvaluation && hasEvaluationData(myEvaluation, flags)) || wineJumperMiniGameEnabled ? (
                <div className="w-full max-w-2xl mb-8 bg-white rounded-[2rem] shadow-sm sm:shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden text-left">
                    {myEvaluation && hasEvaluationData(myEvaluation, flags) && (
                        <div className="p-5">
                            {/* No heading here: MemberEvaluationSection labels
                                each group of scores itself. */}
                            <MemberEvaluationSection
                                evaluation={myEvaluation}
                                propertyMap={propertyMap}
                                accent="slate"
                                forceShowAll
                                propertyCommentsEnabled={propertyCommentsEnabled}
                                voiceCommentsEnabled={voiceCommentsEnabled}
                            />
                        </div>
                    )}

                    {myEvaluation && hasEvaluationData(myEvaluation, flags) && wineJumperMiniGameEnabled && (
                        <div className="border-t border-slate-100" />
                    )}

                    {wineJumperMiniGameEnabled && (
                    <div className="p-5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
                            {t("commission.boredPlay")}
                        </p>
                        <WineJumperGame embedded />
                    </div>
                    )}
                </div>
                ) : null}

                <div className="mt-12 flex items-center gap-3 text-slate-500 font-medium">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                    {t("commission.waitingOtherExperts")}
                </div>
            </main>
        </div>
    );
}
