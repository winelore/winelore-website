"use client"

import React, { useState, useEffect, use, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Cookies from "js-cookie"
import { Users, Wine, Loader2, ArrowRight, ArrowLeft } from "lucide-react"
import WineJumperGame from "@/components/WineJumperGame"
import { AppHeader } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { useUsernames } from "@/hooks/useUsernames"
import {
    getWaitDataAction,
    markCandidateEvaluatedAction,
} from "../../../../actions"
import { findEvaluationForMember, normalizeAuids } from "../../../../auidUtils"
import {
    clearCachedWaitEvaluation,
    readCachedWaitEvaluation,
} from "../../../../waitEvaluationCache"
import {
    hasEvaluationData,
    MemberEvaluationSection,
} from "../../../../EvaluationCommentsDisplay"
import type { PropertyMeta } from "../../../../propertyMap"

export default function WaitPage({ params }: { params: Promise<{ id: string; replicaId: string }> }) {
    const { id: commissionId, replicaId } = use(params);
    const router = useRouter();
    const { t, tCount } = useTranslation();
    const [auid, setAuid] = useState<number | null>(null);
    const [role, setRole] = useState<string>("EXPERT");
    const [members, setMembers] = useState<any[]>([]);
    const [currentCandidateId, setCurrentCandidateId] = useState<string | null>(null);
    const [currentCandidateCode, setCurrentCandidateCode] = useState<string | null>(null);
    const [currentCandidateBeverageName, setCurrentCandidateBeverageName] = useState<string | null>(null);
    const [isSwitching, setIsSwitching] = useState(false);
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [propertyMap, setPropertyMap] = useState<Record<string, PropertyMeta>>({});
    const [candidatesLeft, setCandidatesLeft] = useState<number>(0);
    const [candidatesLeftAfterCurrent, setCandidatesLeftAfterCurrent] = useState<number>(0);
    const [myEvaluation, setMyEvaluation] = useState<any | null>(null);
    const [wineJumperMiniGameEnabled, setWineJumperMiniGameEnabled] = useState(false);
    const [voiceCommentsEnabled, setVoiceCommentsEnabled] = useState(false);
    const [propertyCommentsEnabled, setPropertyCommentsEnabled] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [currentPanelName, setCurrentPanelName] = useState<string>("");

    const currentCandidateIdRef = useRef<string | null>(null);
    useEffect(() => {
        currentCandidateIdRef.current = currentCandidateId;
    }, [currentCandidateId]);

    // Fetch usernames for commission members
    const allMemberAuids = useMemo(() => {
        return Array.from(new Set(members.flatMap(m => normalizeAuids(m.auid))));
    }, [members]);
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
            setMyEvaluation(cached);
        }
    }, [commissionId, replicaId, router]);

    // 2. Polling loop every 3 seconds with in-flight and unmount guards
    useEffect(() => {
        if (auid === null || isRedirecting) return;

        let isMounted = true;
        let isFetching = false;

        const fetchData = async () => {
            if (!isMounted || isRedirecting || isFetching) return;
            isFetching = true;
            try {
                const { members: commMembers, currentCandidateId: newCandidateId, currentCandidateCode: newCandidateCode, currentCandidateBeverageName: newCandidateBeverageName, evaluations: newEvaluations, propertyMap: newPropertyMap, candidatesLeft: newCandidatesLeft, candidatesLeftAfterCurrent: newCandidatesLeftAfterCurrent, myEvaluation: newMyEvaluation, hasCompletedCurrentCandidate, wineJumperMiniGameEnabled: newWineJumperEnabled, voiceCommentsEnabled: newVoiceCommentsEnabled, propertyCommentsEnabled: newPropertyCommentsEnabled, isPanelFinished: newIsPanelFinished, currentPanelName: newPanelName, currentPanelId: newPanelId, replicaStatus: newReplicaStatus } =
                    await getWaitDataAction(commissionId, replicaId);

                if (!isMounted || isRedirecting) return;

                if (newReplicaStatus === "COMPLETED") {
                    setIsRedirecting(true);
                    window.location.href = `/commission/${commissionId}/replica/${replicaId}/summary`;
                    return;
                }

                setMembers(commMembers);
                setEvaluations(newEvaluations || []);
                setPropertyMap(newPropertyMap || {});
                setWineJumperMiniGameEnabled(newWineJumperEnabled);
                setVoiceCommentsEnabled(newVoiceCommentsEnabled);
                setPropertyCommentsEnabled(newPropertyCommentsEnabled);
                setCurrentPanelName(newPanelName || "");
                const commentFlags = {
                    propertyCommentsEnabled: newPropertyCommentsEnabled,
                    voiceCommentsEnabled: newVoiceCommentsEnabled,
                };
                if (newMyEvaluation && hasEvaluationData(newMyEvaluation, commentFlags)) {
                    setMyEvaluation(newMyEvaluation);
                    clearCachedWaitEvaluation(commissionId, replicaId);
                } else if (newMyEvaluation) {
                    setMyEvaluation(newMyEvaluation);
                }
                setCandidatesLeft(newCandidatesLeft ?? 0);
                setCandidatesLeftAfterCurrent(newCandidatesLeftAfterCurrent ?? 0);

                // Find current user's role
                const me = commMembers.find((m: any) => auid !== null && (Array.isArray(m.auid) ? m.auid.includes(auid) : m.auid === auid));
                if (me) setRole(me.role);

                if (newIsPanelFinished && newPanelId) {
                    setIsRedirecting(true);
                    window.location.href = `/commission/${commissionId}/replica/${replicaId}/panel-summary`;
                    return;
                }

                if (!newCandidateId) {
                    return;
                }

                const cached = readCachedWaitEvaluation(commissionId, replicaId);
                const hasFreshSubmitCache =
                    cached?.candidateId === newCandidateId && cached?.isComplete !== false;

                if (!hasCompletedCurrentCandidate && !hasFreshSubmitCache) {
                    setIsRedirecting(true);
                    window.location.href = `/commission/${commissionId}/replica/${replicaId}/candidate/${newCandidateId}`;
                    return;
                }

                // If candidate changed (HEAD advanced) — redirect everyone to evaluation
                if (currentCandidateIdRef.current && currentCandidateIdRef.current !== newCandidateId) {
                    setIsRedirecting(true);
                    window.location.href = `/commission/${commissionId}/replica/${replicaId}/candidate/${newCandidateId}`;
                    return;
                }

                setCurrentCandidateId(newCandidateId);
                setCurrentCandidateCode(newCandidateCode);
                setCurrentCandidateBeverageName(newCandidateBeverageName || null);
                setIsSwitching(false);

            } catch (err) {
                console.error("Polling error", err);
            } finally {
                isFetching = false;
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [commissionId, replicaId, auid, isRedirecting]);

    const heads = members.filter(m => m.role === "HEAD");
    const experts = members.filter(m => m.role === "EXPERT" || m.role === "TRAINEE_EXPERT");
    const commentFlags = { propertyCommentsEnabled, voiceCommentsEnabled };
    const canAdvanceToNextBeverage =
        Boolean(currentCandidateId) &&
        members.length > 0 &&
        members.every((member) => findEvaluationForMember(evaluations, member.auid)?.isComplete === true);
    const isLastBeverageInPanel = Boolean(currentCandidateId) && candidatesLeft === 1;

    // HEAD action: advance to next beverage
    const handleNextBeverage = async () => {
        if (!canAdvanceToNextBeverage || isSwitching || !currentCandidateId) return;
        setIsSwitching(true);
        try {
            const result = await markCandidateEvaluatedAction(replicaId, currentCandidateId);
            if (!result?.nextCandidateId) {
                setIsRedirecting(true);
                window.location.href = `/commission/${commissionId}/replica/${replicaId}/panel-summary`;
            }
            // For a regular beverage transition, polling detects the new candidate.
        } catch (err) {
            console.error(err);
            setIsSwitching(false);
        }
    };

    if (role === "HEAD") {
        return (
            <div className="flex min-h-screen flex-col bg-slate-50">
                <AppHeader activeTab="competitions" />
                <main className="flex-1 p-6 md:p-10">
                    <div className="max-w-7xl mx-auto space-y-8">
                    <div>
                        <Link
                            href={`/commission/${commissionId}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all w-fit"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {t("commission.backToCommission")}
                        </Link>
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
                            disabled={!canAdvanceToNextBeverage || isSwitching}
                            className="px-8 py-3.5 rounded-xl font-bold text-white transition-all flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
                        >
                            {isSwitching ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {isLastBeverageInPanel
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
                                {tCount("commission.commissionMembers", members.length)}
                            </h2>
                            <div className="space-y-3">
                                {members.length === 0 && (
                                    <p className="text-slate-400 text-sm">{t("commission.loadingMembers")}</p>
                                )}
                                
                                {/* 1. Render Heads */}
                                {heads.map((headMember, i) => {
                                    const headAuidsStr = normalizeAuids(headMember.auid).map(id => usernames[id] || id).join(", ");
                                    const headKeyAuid = normalizeAuids(headMember.auid)[0] ?? i;

                                    const evaluation = findEvaluationForMember(evaluations, headMember.auid);

                                    const isCompleted = evaluation?.isComplete || false;

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
                                                />
                                            )}
                                        </div>
                                    );
                                })}

                                {/* 2. Render Experts */}
                                {experts.map((expert, i) => {
                                    const expertAuidsStr = normalizeAuids(expert.auid).map(id => usernames[id] || id).join(", ");
                                    const expertKeyAuid = normalizeAuids(expert.auid)[0] ?? i;

                                    const evaluation = findEvaluationForMember(evaluations, expert.auid);

                                    const isCompleted = evaluation?.isComplete || false;

                                    return (
                                        <div key={`${currentCandidateId}-expert-${expertKeyAuid}`} className="flex flex-col p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-slate-700">
                                                    {expertAuidsStr} {expert.role === "TRAINEE_EXPERT" ? `(${t("commission.roleTrainee")})` : ""}
                                                </span>
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
                                            
                                            {evaluation && hasEvaluationData(evaluation, commentFlags) && (
                                                <MemberEvaluationSection
                                                    evaluation={evaluation}
                                                    propertyMap={propertyMap}
                                                    accent="slate"
                                                    forceShowAll={!isCompleted}
                                                    propertyCommentsEnabled={propertyCommentsEnabled}
                                                    voiceCommentsEnabled={voiceCommentsEnabled}
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
        <div className="flex min-h-screen flex-col bg-slate-50">
            <AppHeader activeTab="competitions" />
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-full max-w-2xl flex justify-start mb-6">
                    <Link
                        href={`/commission/${commissionId}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t("commission.backToCommission")}
                    </Link>
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

                {(myEvaluation && hasEvaluationData(myEvaluation, commentFlags)) || wineJumperMiniGameEnabled ? (
                <div className="w-full max-w-2xl mb-8 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden text-left">
                    {myEvaluation && hasEvaluationData(myEvaluation, commentFlags) && (
                        <div className="p-5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                                {t("evaluation.submittedScores")}
                            </p>
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

                    {myEvaluation && hasEvaluationData(myEvaluation, commentFlags) && wineJumperMiniGameEnabled && (
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
