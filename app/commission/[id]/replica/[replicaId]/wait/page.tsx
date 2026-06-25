"use client"

import React, { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { Users, Wine, Loader2, ArrowRight } from "lucide-react"
import WineJumperGame from "@/components/WineJumperGame"
import {
    getWaitDataAction,
    markCandidateEvaluatedAction,
} from "../../../../actions"

export default function WaitPage({ params }: { params: Promise<{ id: string; replicaId: string }> }) {
    const { id: commissionId, replicaId } = use(params);
    const router = useRouter();
    const [auid, setAuid] = useState<number>(1);
    const [role, setRole] = useState<string>("EXPERT");
    const [members, setMembers] = useState<any[]>([]);
    const [currentCandidateId, setCurrentCandidateId] = useState<string | null>(null);
    const [isSwitching, setIsSwitching] = useState(false);
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [propertyMap, setPropertyMap] = useState<Record<string, string>>({});

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
                const { members: commMembers, currentCandidateId: newCandidateId, allCandidatesEvaluated, evaluations: newEvaluations, propertyMap: newPropertyMap } =
                    await getWaitDataAction(commissionId, replicaId);

                setMembers(commMembers);
                setEvaluations(newEvaluations || []);
                setPropertyMap(newPropertyMap || {});

                // Find current user's role
                const me = commMembers.find((m: any) => Array.isArray(m.auid) ? m.auid.includes(auid) : m.auid === auid);
                if (me) setRole(me.role);

                if (!newCandidateId || allCandidatesEvaluated) {
                    // Tasting is complete!
                    router.push(`/commission/${commissionId}`);
                    return;
                }

                // If candidate changed (HEAD advanced) — redirect everyone to evaluation
                if (currentCandidateId && currentCandidateId !== newCandidateId) {
                    router.push(`/commission/${commissionId}/replica/${replicaId}/candidate/${newCandidateId}`);
                    return;
                }

                setCurrentCandidateId(newCandidateId);

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
    if (role === "HEAD") {
        return (
            <main className="min-h-screen bg-slate-50 p-6 md:p-10">
                <div className="max-w-4xl mx-auto space-y-8">
                    <header className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Head Dashboard</h1>
                            <p className="text-slate-500 text-sm mt-1">
                                Current candidate:{" "}
                                <span className="font-mono font-semibold text-indigo-600">
                                    {currentCandidateId ? currentCandidateId.slice(0, 8) + "…" : "Loading…"}
                                </span>
                            </p>
                        </div>
                        <button
                            onClick={handleNextBeverage}
                            disabled={!currentCandidateId || isSwitching}
                            className="px-8 py-3.5 rounded-xl font-bold text-white transition-all flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
                        >
                            {isSwitching ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>Next Beverage <ArrowRight className="w-5 h-5" /></>
                            )}
                        </button>
                    </header>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Experts list */}
                        <div className="xl:col-span-2 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                            <h2 className="text-lg font-bold flex items-center gap-2 mb-6 text-slate-800">
                                <Users className="text-indigo-500 w-5 h-5" />
                                Commission Members ({members.length} members)
                            </h2>
                            <div className="space-y-3">
                                {members.length === 0 && (
                                    <p className="text-slate-400 text-sm">Loading members…</p>
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
                                        <div key={`head-${i}`} className="flex flex-col p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-indigo-950">
                                                        {headAuidsStr}
                                                    </span>
                                                    <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                        Head of Commission
                                                    </span>
                                                </div>
                                                {isCompleted ? (
                                                    <span className="text-emerald-600 font-bold bg-emerald-100 px-3 py-1 rounded-full text-xs animate-fade-in">
                                                        Completed
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-600 font-bold bg-amber-100 px-3 py-1 rounded-full text-xs">
                                                        Evaluating…
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {isCompleted && evaluation.scores && evaluation.scores.length > 0 && (
                                                <div className="pl-2 border-l-2 border-indigo-300 mt-2">
                                                    <p className="text-[10px] font-bold text-indigo-500 mb-1.5 uppercase tracking-wider">Submitted Scores:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {evaluation.scores.map((score: any) => {
                                                            const displayName = propertyMap[score.code] || score.code;
                                                            return (
                                                                <div key={score.code} className="inline-flex items-center bg-white border border-indigo-100 rounded-lg px-2 py-0.5 text-xs shadow-sm">
                                                                    <span className="text-slate-500 mr-1">{displayName}:</span>
                                                                    <span className="font-bold text-indigo-950">{score.value}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {isCompleted && evaluation.comments && evaluation.comments.length > 0 && (
                                                <div className="pl-2 border-l-2 border-slate-300 mt-2">
                                                    <p className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Comments:</p>
                                                    <div className="space-y-1">
                                                        {evaluation.comments.map((comment: any) => {
                                                            if (!comment.text) return null;
                                                            const displayName = propertyMap[comment.propertyId] || comment.propertyId;
                                                            return (
                                                                <div key={comment.id} className="text-xs text-indigo-950">
                                                                    <span className="font-semibold text-indigo-500">{displayName}:</span> {comment.text}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
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
                                        <div key={i} className="flex flex-col p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-slate-700">
                                                    {expertAuidsStr} {expert.role === "TRAINEE_EXPERT" ? "(Trainee)" : ""}
                                                </span>
                                                {isCompleted ? (
                                                    <span className="text-emerald-600 font-bold bg-emerald-100 px-3 py-1 rounded-full text-xs animate-fade-in">
                                                        Completed
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-600 font-bold bg-amber-100 px-3 py-1 rounded-full text-xs">
                                                        Evaluating…
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {isCompleted && evaluation.scores && evaluation.scores.length > 0 && (
                                                <div className="pl-2 border-l-2 border-indigo-200 mt-2">
                                                    <p className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Submitted Scores:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {evaluation.scores.map((score: any) => {
                                                            const displayName = propertyMap[score.code] || score.code;
                                                            return (
                                                                <div key={score.code} className="inline-flex items-center bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs shadow-sm">
                                                                    <span className="text-slate-500 mr-1">{displayName}:</span>
                                                                    <span className="font-bold text-slate-800">{score.value}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {isCompleted && evaluation.comments && evaluation.comments.length > 0 && (
                                                <div className="pl-2 border-l-2 border-slate-200 mt-2">
                                                    <p className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Comments:</p>
                                                    <div className="space-y-1">
                                                        {evaluation.comments.map((comment: any) => {
                                                            if (!comment.text) return null;
                                                            const displayName = propertyMap[comment.propertyId] || comment.propertyId;
                                                            return (
                                                                <div key={comment.id} className="text-xs text-slate-600">
                                                                    <span className="font-semibold text-slate-500">{displayName}:</span> {comment.text}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Mini game */}
                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col items-center">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Bored? Play!</h3>
                            <WineJumperGame />
                        </div>
                    </div>
                </div>
            </main>
        )
    }

    // ==========================================
    // EXPERT VIEW
    // ==========================================
    return (
        <main className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-10 flex justify-center">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center animate-pulse">
                    <Wine className="w-10 h-10 text-white" />
                </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
                Evaluation Submitted!
            </h1>
            <p className="text-slate-400 text-lg max-w-md mx-auto mb-14">
                Waiting for the Head of Commission to start the next tasting round.
                Don&apos;t close this page, it will automatically refresh.
            </p>

            <div className="w-full max-w-2xl bg-white p-2 rounded-[2.5rem] shadow-2xl shadow-black/50 border border-slate-800">
                <WineJumperGame />
            </div>

            <div className="mt-12 flex items-center gap-3 text-slate-400 font-medium">
                <Loader2 className="w-5 h-5 animate-spin" />
                Waiting for other experts…
            </div>
        </main>
    );
}
