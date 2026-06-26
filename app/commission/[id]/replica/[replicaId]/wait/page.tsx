"use client"

import React, { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { Users, Wine, Loader2, ArrowRight, ChevronDown, ChevronUp } from "lucide-react"
import WineJumperGame from "@/components/WineJumperGame"
import { AppHeader } from "@/components/AppHeader"
import { useTranslation } from "@/lib/i18n/context"
import { TranslatedText } from "@/lib/i18n/TranslatedText"
import {
    getWaitDataAction,
    markCandidateEvaluatedAction,
} from "../../../../actions"

type PropertyMeta = { name: string; isResult: boolean }

function isResultOrGeneralComment(
    comment: { propertyId?: string | null },
    propertyMap: Record<string, PropertyMeta>,
) {
    if (!comment.propertyId) return true
    return propertyMap[comment.propertyId]?.isResult === true
}

function SubmittedScores({
    scores,
    propertyMap,
    accent = "slate",
    resultsOnly = false,
}: {
    scores: Array<{ code: string; value: string }>
    propertyMap: Record<string, PropertyMeta>
    accent?: "indigo" | "slate"
    resultsOnly?: boolean
}) {
    const { t } = useTranslation()

    const regularScores = resultsOnly
        ? []
        : scores.filter((score) => propertyMap[score.code]?.isResult !== true)
    const resultScores = scores.filter((score) => propertyMap[score.code]?.isResult === true)

    const borderClass = accent === "indigo" ? "border-indigo-300" : "border-indigo-200"

    const renderScoreChip = (score: { code: string; value: string }, isResult: boolean) => {
        const displayName = propertyMap[score.code]?.name || score.code

        return (
            <div
                key={score.code}
                className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs shadow-sm ${
                    isResult
                        ? "border border-indigo-300 bg-indigo-600 text-white"
                        : "border border-slate-200 bg-white"
                }`}
            >
                <span className={`mr-1 ${isResult ? "text-indigo-100" : "text-slate-500"}`}>
                    <TranslatedText text={displayName} />
                </span>
                <span className={`font-bold ${isResult ? "text-white" : "text-slate-800"}`}>
                    {score.value}
                </span>
            </div>
        )
    }

    if (regularScores.length === 0 && resultScores.length === 0) return null

    return (
        <div className={`pl-3 border-l-2 ${borderClass} mt-2 space-y-3`}>
            {regularScores.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {t("evaluation.submittedScores")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {regularScores.map((score) => renderScoreChip(score, false))}
                    </div>
                </div>
            )}

            {resultScores.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                        {t("evaluation.resultsSection")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {resultScores.map((score) => renderScoreChip(score, true))}
                    </div>
                </div>
            )}
        </div>
    )
}

function hasFullAssessmentDetails(
    evaluation: { scores?: Array<{ code: string; value: string }>; comments?: Array<{ text?: string; voiceUrl?: string | null; propertyId?: string | null }> },
    propertyMap: Record<string, PropertyMeta>,
) {
    const scores = evaluation.scores || []
    const hasNonResultScores = scores.some((s) => propertyMap[s.code]?.isResult !== true)
    const allComments = (evaluation.comments || []).filter((c) => c.text || c.voiceUrl)
    const hasHiddenComments = allComments.some((c) => !isResultOrGeneralComment(c, propertyMap))
    return hasNonResultScores || hasHiddenComments
}

function MemberEvaluationSection({
    evaluation,
    propertyMap,
    accent,
}: {
    evaluation: { scores?: Array<{ code: string; value: string }>; comments?: Array<{ id: string; text?: string; voiceUrl?: string | null; propertyId?: string | null }> }
    propertyMap: Record<string, PropertyMeta>
    accent: "indigo" | "slate"
}) {
    const { t } = useTranslation()
    const [expanded, setExpanded] = useState(false)
    const canExpand = hasFullAssessmentDetails(evaluation, propertyMap)

    return (
        <div className="space-y-2">
            <MemberEvaluationDetails
                evaluation={evaluation}
                propertyMap={propertyMap}
                accent={accent}
                showAll={expanded}
            />
            {canExpand && (
                <button
                    type="button"
                    onClick={() => setExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                            <span>{t("commission.showResultsOnly")}</span>
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                            <span>{t("commission.showAllAssessments")}</span>
                        </>
                    )}
                </button>
            )}
        </div>
    )
}

function MemberEvaluationDetails({
    evaluation,
    propertyMap,
    accent,
    showAll,
}: {
    evaluation: { scores?: Array<{ code: string; value: string }>; comments?: Array<{ id: string; text?: string; voiceUrl?: string | null; propertyId?: string | null }> }
    propertyMap: Record<string, PropertyMeta>
    accent: "indigo" | "slate"
    showAll: boolean
}) {
    const { t } = useTranslation()

    const scores = evaluation.scores || []
    const allComments = (evaluation.comments || []).filter((c) => c.text || c.voiceUrl)
    const visibleComments = showAll
        ? allComments
        : allComments.filter((c) => isResultOrGeneralComment(c, propertyMap))

    const visibleScores = showAll
        ? scores
        : scores.filter((s) => propertyMap[s.code]?.isResult === true)

    const commentAccentClass = accent === "indigo" ? "border-slate-300" : "border-slate-200"
    const commentLabelClass = accent === "indigo" ? "text-indigo-500" : "text-slate-500"
    const commentTextClass = accent === "indigo" ? "text-indigo-950" : "text-slate-600"

    return (
        <>
            {visibleScores.length > 0 && (
                <SubmittedScores
                    scores={visibleScores}
                    propertyMap={propertyMap}
                    accent={accent}
                    resultsOnly={!showAll}
                />
            )}

            {visibleComments.length > 0 && (
                <div className={`pl-2 border-l-2 ${commentAccentClass} mt-2`}>
                    <p className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t("commission.comments")}</p>
                    <div className="space-y-1.5">
                        {visibleComments.map((comment) => {
                            const displayName = comment.propertyId
                                ? propertyMap[comment.propertyId]?.name || comment.propertyId
                                : t("evaluation.generalCommentLabel")
                            return (
                                <div key={comment.id} className={`text-xs ${commentTextClass} space-y-1`}>
                                    <span className={`font-semibold ${commentLabelClass}`}><TranslatedText text={displayName} />:</span>
                                    {comment.text && <span> {comment.text}</span>}
                                    {comment.voiceUrl && (
                                        <div className="mt-1">
                                            <audio
                                                src={comment.voiceUrl}
                                                controls
                                                className="h-7 w-full max-w-xs"
                                            />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </>
    )
}

export default function WaitPage({ params }: { params: Promise<{ id: string; replicaId: string }> }) {
    const { id: commissionId, replicaId } = use(params);
    const router = useRouter();
    const { t, tCount } = useTranslation();
    const [auid, setAuid] = useState<number>(1);
    const [role, setRole] = useState<string>("EXPERT");
    const [members, setMembers] = useState<any[]>([]);
    const [currentCandidateId, setCurrentCandidateId] = useState<string | null>(null);
    const [currentCandidateCode, setCurrentCandidateCode] = useState<string | null>(null);
    const [isSwitching, setIsSwitching] = useState(false);
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [propertyMap, setPropertyMap] = useState<Record<string, PropertyMeta>>({});
    const [candidatesLeft, setCandidatesLeft] = useState<number>(0);
    const [candidatesLeftAfterCurrent, setCandidatesLeftAfterCurrent] = useState<number>(0);
    const [allDone, setAllDone] = useState(false);

    // 1. Read AUID from cookie (fallback to 1)
    useEffect(() => {
        const cookieAuid = Cookies.get("auid");
        setAuid(cookieAuid ? parseInt(cookieAuid, 10) : 1);
    }, []);

    // 2. Polling loop every 3 seconds
    useEffect(() => {
        if (auid === null) return;

        const fetchData = async () => {
            try {
                const { members: commMembers, currentCandidateId: newCandidateId, currentCandidateCode: newCandidateCode, allCandidatesEvaluated, evaluations: newEvaluations, propertyMap: newPropertyMap, candidatesLeft: newCandidatesLeft, candidatesLeftAfterCurrent: newCandidatesLeftAfterCurrent } =
                    await getWaitDataAction(commissionId, replicaId);

                setMembers(commMembers);
                setEvaluations(newEvaluations || []);
                setPropertyMap(newPropertyMap || {});
                setCandidatesLeft(newCandidatesLeft ?? 0);
                setCandidatesLeftAfterCurrent(newCandidatesLeftAfterCurrent ?? 0);

                // Find current user's role
                const me = commMembers.find((m: any) => Array.isArray(m.auid) ? m.auid.includes(auid) : m.auid === auid);
                if (me) setRole(me.role);

                if (!newCandidateId || allCandidatesEvaluated) {
                    setAllDone(true);
                    return;
                }

                // If candidate changed (HEAD advanced) — redirect everyone to evaluation
                if (currentCandidateId && currentCandidateId !== newCandidateId) {
                    router.push(`/commission/${commissionId}/replica/${replicaId}/candidate/${newCandidateId}`);
                    return;
                }

                setCurrentCandidateId(newCandidateId);
                setCurrentCandidateCode(newCandidateCode);

            } catch (err) {
                console.error("Polling error", err);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, [commissionId, replicaId, auid, currentCandidateId, router]);

    // HEAD action: advance to next beverage
    const handleNextBeverage = async () => {
        if (!currentCandidateId || isSwitching) return;
        setIsSwitching(true);
        try {
            await markCandidateEvaluatedAction(currentCandidateId);
            // Polling will detect the status change and redirect automatically
        } catch (err) {
            console.error(err);
            setIsSwitching(false);
        }
    };

    const heads = members.filter(m => m.role === "HEAD");
    const experts = members.filter(m => m.role === "EXPERT" || m.role === "TRAINEE_EXPERT");

    // ==========================================
    // HEAD OF COMMISSION VIEW
    // ==========================================
    if (allDone) {
        return (
            <div className="flex min-h-screen flex-col bg-slate-50">
                <AppHeader activeTab="competitions" />
                <main className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Wine className="w-10 h-10 text-emerald-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-800">{t("commission.allCandidatesEvaluated")}</h1>
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">{t("commission.allCandidatesEvaluatedDesc")}</p>
                    </div>
                    <button
                        onClick={() => router.push(`/commission/${commissionId}/results`)}
                        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
                    >
                        {t("commission.continueToResults")} <ArrowRight className="w-4 h-4" />
                    </button>
                </main>
            </div>
        )
    }

    if (role === "HEAD") {
        return (
            <div className="flex min-h-screen flex-col bg-slate-50">
                <AppHeader activeTab="competitions" />
                <main className="flex-1 p-6 md:p-10">
                <div className="max-w-4xl mx-auto space-y-8">
                    <header className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">{t("commission.headDashboard")}</h1>
                            <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5 flex-wrap">
                                <span>{t("commission.currentCandidateLabel")}</span>
                                <span className="font-mono font-semibold text-indigo-600">
                                    {currentCandidateCode || (currentCandidateId ? t("common.loading") : t("common.none"))}
                                </span>
                                {currentCandidateId && (
                                    <span className="text-[11px] text-slate-400 font-mono font-normal">
                                        ({currentCandidateId})
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
                            disabled={!currentCandidateId || isSwitching}
                            className="px-8 py-3.5 rounded-xl font-bold text-white transition-all flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
                        >
                            {isSwitching ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>{t("commission.nextBeverage")} <ArrowRight className="w-5 h-5" /></>
                            )}
                        </button>
                    </header>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Experts list */}
                        <div className="xl:col-span-2 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                            <h2 className="text-lg font-bold flex items-center gap-2 mb-6 text-slate-800">
                                <Users className="text-indigo-500 w-5 h-5" />
                                {t("commission.commissionMembers", { count: members.length })}
                            </h2>
                            <div className="space-y-3">
                                {members.length === 0 && (
                                    <p className="text-slate-400 text-sm">{t("commission.loadingMembers")}</p>
                                )}
                                
                                {/* 1. Render Heads */}
                                {heads.map((headMember, i) => {
                                    const headAuid = Array.isArray(headMember.auid) ? headMember.auid[0] : headMember.auid;
                                    const headAuidsStr = Array.isArray(headMember.auid) ? headMember.auid.join(", ") : String(headMember.auid);
                                    
                                    // Find if there is an evaluation for this head member
                                    const evaluation = evaluations.find((ev: any) => {
                                        const evAuid = Array.isArray(ev.evaluatorAuid) ? ev.evaluatorAuid : [ev.evaluatorAuid];
                                        return evAuid.some((id: any) => String(id) === String(headAuid));
                                    });

                                    const isCompleted = evaluation?.isComplete || false;

                                    return (
                                        <div key={`${currentCandidateId}-head-${headAuid}`} className="flex flex-col p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 space-y-3">
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
                                                />
                                            )}
                                        </div>
                                    );
                                })}

                                {/* 2. Render Experts */}
                                {experts.map((expert, i) => {
                                    const expertAuid = Array.isArray(expert.auid) ? expert.auid[0] : expert.auid;
                                    const expertAuidsStr = Array.isArray(expert.auid) ? expert.auid.join(", ") : String(expert.auid);
                                    
                                    // Find if there is an evaluation for this expert
                                    const evaluation = evaluations.find((ev: any) => {
                                        const evAuid = Array.isArray(ev.evaluatorAuid) ? ev.evaluatorAuid : [ev.evaluatorAuid];
                                        return evAuid.some((id: any) => String(id) === String(expertAuid));
                                    });

                                    const isCompleted = evaluation?.isComplete || false;

                                    return (
                                        <div key={`${currentCandidateId}-expert-${expertAuid}`} className="flex flex-col p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
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
                                            
                                            {isCompleted && evaluation && (
                                                <MemberEvaluationSection
                                                    evaluation={evaluation}
                                                    propertyMap={propertyMap}
                                                    accent="slate"
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Mini game */}
                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col items-center">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{t("commission.boredPlay")}</h3>
                            <WineJumperGame />
                        </div>
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
        <div className="flex min-h-screen flex-col bg-[#0f172a]">
            <AppHeader activeTab="competitions" />
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="relative mb-10 flex justify-center">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center animate-pulse">
                        <Wine className="w-10 h-10 text-white" />
                    </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
                    {t("commission.evaluationSubmitted")}
                </h1>
                <div className="max-w-md mx-auto mb-14 space-y-4">
                    <p className="text-slate-400 text-lg">
                        {t("commission.waitingNextRound")} {t("commission.autoRefreshNotice")}
                    </p>
                    {candidatesLeftAfterCurrent > 0 && (
                        <p className="text-indigo-300 text-sm font-semibold">
                            {tCount("commission.candidatesLeftToEvaluate", candidatesLeftAfterCurrent)}
                        </p>
                    )}
                </div>

                <div className="w-full max-w-2xl bg-white p-2 rounded-[2.5rem] shadow-2xl shadow-black/50 border border-slate-800">
                    <WineJumperGame />
                </div>

                <div className="mt-12 flex items-center gap-3 text-slate-400 font-medium">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t("commission.waitingOtherExperts")}
                </div>
            </main>
        </div>
    );
}
