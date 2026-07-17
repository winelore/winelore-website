"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Search } from "lucide-react";
import Cookies from "js-cookie";
import { useTranslation } from "@/lib/i18n/context";
import { TranslatedText } from "@/lib/i18n/TranslatedText";
import { useUsernames } from "@/hooks/useUsernames";
import { normalizeAuids } from "../../../../auidUtils";
import { MemberEvaluationSection } from "../../../../EvaluationCommentsDisplay";
import { aggregatePropertyScores, formatPropertyScoreValue, hasStoredScoreValue } from "@/lib/formatPropertyScore";
import {
    getReplicaBeverageOutcome,
    resolveReplicaBeverageOutcomes,
    type OverallOutcomeByProperty,
    aggregateOverallFromReplicas,
} from "@/lib/outcomePolicy/resolveBeverageOutcomes";
import { buildOutcomePropertyMap } from "@/lib/outcomePolicy/outcomePropertyMap";
import { isReplicaCandidateFinished } from "../../../../replicaUtils";
import {
    hasEvaluationTotalScore,
    parseEvaluationTotal,
} from "@/lib/evaluationTotals";
import type { PropertyMeta } from "../../../../propertyMap";
import type { TemplateEdition } from "@/lib/evaluationScores";
import { getPanelResultsAction } from "./actions";
interface WaitPanelResultsProps {
    commissionId: string;
    replicaId: string;
    panelId: string;
    panelName: string;
    propertyCommentsEnabled: boolean;
    voiceCommentsEnabled: boolean;
}
interface ExpertBreakdownEntry {
    key: string;
    replicaId: string;
    replicaName: string;
    replicaType: string;
    evaluatorAuids: string[];
    totalScore: string;
    evaluation: {
        scores?: Array<{ code: string; value: string }>;
        comments?: Array<{ id: string; text?: string; voiceUrl?: string | null; propertyId?: string | null }>;
    };
}
interface CandidateRow {
    candidate: any;
    beverageName: string;
    producerAuids: string[];
    outcomeOverall: OverallOutcomeByProperty | null;
    awards: any[];
    expertBreakdown: ExpertBreakdownEntry[];
    myEvaluation: any;
}
function getBeverageProducerAuids(candidate: any): string[] {
    const producers = candidate.sample?.batch?.beverage?.producers;
    if (!Array.isArray(producers)) return [];
    const auids = new Set<string>();
    producers.forEach((producer: { auid?: unknown }) => {
        normalizeAuids(producer.auid).forEach((id) => auids.add(id));
    });
    return Array.from(auids);
}
export default function WaitPanelResults({
                                             commissionId,
                                             replicaId,
                                             panelId,
                                             panelName,
                                             propertyCommentsEnabled,
                                             voiceCommentsEnabled,
                                         }: WaitPanelResultsProps) {
    const { t, formatReplicaType } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        commission: any;
        awardsMap: Record<string, any[]>;
        propertyMap: Record<string, PropertyMeta>;
        templateEditionById: Record<string, TemplateEdition>;
    } | null>(null);
    const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
    const [myAuid, setMyAuid] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [sortMode, setSortMode] = useState<"score" | "order">("order");

    useEffect(() => {
        const auidStr = Cookies.get("auid");
        if (auidStr) setMyAuid(auidStr);
    }, []);
    useEffect(() => {
        let mounted = true;
        setLoading(true);
        getPanelResultsAction(commissionId, replicaId, panelId)
            .then((res) => {
                if (mounted && res) {
                    setData(res);
                }
            })
            .catch(console.error)
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => { mounted = false; };
    }, [commissionId, replicaId, panelId]);
    const allPersonAuids = useMemo(() => {
        if (!data?.commission) return [];
        const auids = new Set<string>();
        data.commission.replicas?.forEach((r: any) => {
            r.replicaCandidates?.forEach((rc: any) => {
                rc.evaluations?.forEach((ev: any) => {
                    normalizeAuids(ev.evaluatorAuid).forEach((id) => auids.add(id));
                });
            });
        });
        data.commission.candidates?.forEach((candidate: any) => {
            getBeverageProducerAuids(candidate).forEach((id) => auids.add(id));
        });
        if (myAuid) auids.add(myAuid);
        return Array.from(auids);
    }, [data?.commission, myAuid]);
    const { usernames } = useUsernames(allPersonAuids);
    const resolveEvaluatorName = useCallback(
        (auids: string[]) => auids.map((id) => usernames[id] || id).join(", "),
        [usernames],
    );
    const resolveProducerName = useCallback(
        (auids: string[]) => {
            if (auids.length === 0) return t("commission.results.unknownProducer");
            return auids.map((id) => usernames[id] || id).join(", ");
        },
        [usernames, t],
    );
    const isReplicaBeverageIncomplete = useCallback(
        (checkReplicaId: string, beverageId: string): boolean => {
            if (!data?.commission) return false;
            const commission = data.commission;
            const candidateIds = commission.candidates
                .filter((c: any) => c.sample?.batch?.beverage?.id === beverageId)
                .map((c: any) => c.id);
            const replica = commission.replicas.find((r: any) => r.id === checkReplicaId);
            if (!replica) return false;
            const expectedEvaluators = replica.members?.length ?? 0;
            for (const candidateId of candidateIds) {
                const rc = replica.replicaCandidates?.find(
                    (item: any) => item.candidate.id === candidateId,
                );
                if (!rc) {
                    if (expectedEvaluators > 0) return true;
                    continue;
                }
                if (isReplicaCandidateFinished(rc.status)) {
                    continue;
                }
                let completeCount = 0;
                rc.evaluations?.forEach((ev: any) => {
                    if (ev.isComplete) completeCount++;
                });
                if (expectedEvaluators > 0 && completeCount < expectedEvaluators) return true;
            }
            return false;
        },
        [data?.commission],
    );
    const resolvedOutcomes = useMemo(() => {
        if (!data?.commission?.outcomePolicyEdition) {
            return { replicaOutcomes: new Map(), outputProperties: [] };
        }
        return resolveReplicaBeverageOutcomes({
            commission: data.commission,
            policyEdition: data.commission.outcomePolicyEdition,
            templateEditionById: data.templateEditionById,
            templatePropertyMap: data.propertyMap,
            isReplicaBeverageIncomplete,
        });
    }, [data, isReplicaBeverageIncomplete]);
    const replicaBeverageOutcomes = resolvedOutcomes.replicaOutcomes;
    const policyOutputProperties = resolvedOutcomes.outputProperties;
    const outcomePropertyMap = useMemo(
        () => data?.commission?.outcomePolicyEdition
            ? buildOutcomePropertyMap(data.commission.outcomePolicyEdition, policyOutputProperties, data.propertyMap)
            : {},
        [data, policyOutputProperties],
    );
    const sortScorePropertyCode = policyOutputProperties[0]?.code ?? null;
    const candidateHasEvaluations = useCallback(
        (candidateId: string): boolean => {
            if (!data?.commission?.replicas) return false;
            return data.commission.replicas.some((replica: any) => {
                const rc = replica.replicaCandidates?.find((item: any) => item.candidate.id === candidateId);
                return (rc?.evaluations?.length ?? 0) > 0;
            });
        },
        [data?.commission?.replicas],
    );
    const getExpertBreakdown = useCallback(
        (candidateId: string): ExpertBreakdownEntry[] => {
            if (!data?.commission?.replicas) return [];
            const breakdown: ExpertBreakdownEntry[] = [];
            data.commission.replicas.forEach((r: any) => {
                const rc = r.replicaCandidates?.find((c: any) => c.candidate.id === candidateId);
                if (rc?.evaluations) {
                    rc.evaluations.forEach((ev: any, idx: number) => {
                        if (ev.isComplete) {
                            const totalVal = parseEvaluationTotal(ev.scores, data.propertyMap);
                            const evaluatorAuids = normalizeAuids(ev.evaluatorAuid);
                            breakdown.push({
                                key: `${r.id}-${evaluatorAuids.join("-")}-${idx}`,
                                replicaId: r.id,
                                replicaName: r.name || formatReplicaType(r.type),
                                replicaType: r.type,
                                evaluatorAuids,
                                totalScore: totalVal !== null ? String(totalVal) : "-",
                                evaluation: {
                                    scores: ev.scores || [],
                                    comments: ev.comments || [],
                                },
                            });
                        }
                    });
                }
            });
            return breakdown;
        },
        [data, formatReplicaType],
    );
    const getMyEvaluation = useCallback(
        (candidateId: string): any => {
            if (!data?.commission?.replicas || !myAuid) return null;
            const targetReplica = data.commission.replicas.find((r: any) => r.id === replicaId);
            if (!targetReplica) return null;
            const rc = targetReplica.replicaCandidates?.find((c: any) => c.candidate.id === candidateId);
            if (!rc?.evaluations) return null;
            return rc.evaluations.find((ev: any) => normalizeAuids(ev.evaluatorAuid).includes(myAuid)) || null;
        },
        [data, replicaId, myAuid],
    );
    const candidateOrderIndex = useMemo(() => {
        const map = new Map<string, number>();
        if (data?.commission?.candidates) {
            data.commission.candidates.forEach((candidate: any, index: number) => {
                map.set(candidate.id, index + 1);
            });
        }
        return map;
    }, [data?.commission?.candidates]);
    const candidateRows = useMemo((): CandidateRow[] => {
        if (!data?.commission) return [];
        const panelCandidates = data.commission.candidates.filter((c: any) => c.panelId === panelId);
        return panelCandidates.map((candidate: any) => {
            const beverageId = candidate.sample?.batch?.beverage?.id;
            const beverageName =
                candidate.sample?.batch?.beverage?.name || t("commission.results.unknownBeverage");
            const hasEvaluations = candidateHasEvaluations(candidate.id);
            const outcomeOverall: OverallOutcomeByProperty | null =
                data.commission.outcomePolicyEdition && beverageId && hasEvaluations
                    ? aggregateOverallFromReplicas(
                        replicaBeverageOutcomes,
                        beverageId,
                        data.commission.replicas,
                        policyOutputProperties,
                    )
                    : null;
            const allBeverageAwards = data.awardsMap[beverageId] || [];
            const currentCommissionAwards = allBeverageAwards.filter(
                (a: any) => a.commissionId === commissionId,
            );
            return {
                candidate,
                beverageName,
                producerAuids: getBeverageProducerAuids(candidate),
                outcomeOverall,
                awards: currentCommissionAwards,
                expertBreakdown: getExpertBreakdown(candidate.id),
                myEvaluation: getMyEvaluation(candidate.id),
            };
        });
    }, [
        data,
        panelId,
        commissionId,
        replicaBeverageOutcomes,
        policyOutputProperties,
        getExpertBreakdown,
        getMyEvaluation,
        candidateHasEvaluations,
        t,
    ]);
    const filteredAndSortedRows = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        let rows: CandidateRow[] = candidateRows;
        if (query) {
            rows = rows.filter((row) => {
                const code = (row.candidate.anonymizedCode || "").toLowerCase();
                const beverage = row.beverageName.toLowerCase();
                const producer = resolveProducerName(row.producerAuids).toLowerCase();
                return (
                    code.includes(query) ||
                    beverage.includes(query) ||
                    producer.includes(query)
                );
            });
        }
        if (sortMode === "score" && sortScorePropertyCode) {
            rows = [...rows].sort((a, b) => {
                const aScore = a.outcomeOverall?.[sortScorePropertyCode]?.numeric;
                const bScore = b.outcomeOverall?.[sortScorePropertyCode]?.numeric;
                if (aScore === null && bScore === null) return 0;
                if (aScore === null || aScore === undefined) return 1;
                if (bScore === null || bScore === undefined) return -1;
                return bScore - aScore;
            });
        } else if (sortMode === "order") {
            rows = [...rows].sort((a, b) => {
                const idxA = candidateOrderIndex.get(a.candidate.id) ?? Number.MAX_SAFE_INTEGER;
                const idxB = candidateOrderIndex.get(b.candidate.id) ?? Number.MAX_SAFE_INTEGER;
                return idxA - idxB;
            });
        }
        return rows;
    }, [
        candidateRows,
        searchQuery,
        sortMode,
        candidateOrderIndex,
        resolveProducerName,
        sortScorePropertyCode,
    ]);
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2rem] shadow-sm border border-slate-100">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">{t("common.loading")}</p>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    function OutcomePropertyLabel({ code }: { code: string }) {
        const label = outcomePropertyMap[code]?.name ?? code;
        return <TranslatedText text={label} />;
    }
    return (
        <section className="bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden mb-8 w-full text-left">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-800">
                        {t("commission.results.resultsTitle")}: {panelName}
                    </h2>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t("commission.results.searchPlaceholder")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-56 transition-all bg-white"
                        />
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-1 bg-slate-100/50 border border-slate-200 p-1 rounded-lg shrink-0">
                        <button
                            onClick={() => setSortMode("score")}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                sortMode === "score"
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            }`}
                        >
                            {t("commission.results.sortByScore")}
                        </button>
                        <button
                            onClick={() => setSortMode("order")}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                sortMode === "order"
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            }`}
                        >
                            {t("commission.results.sortByOrder")}
                        </button>
                    </div>
                </div>
            </div>
            <p className="px-6 py-2 text-xs text-slate-400 border-b border-slate-50 bg-slate-50/80">
                {t("commission.results.clickToExpand")}
            </p>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                        {sortMode === "order" && (
                            <th className="py-4 px-4 font-semibold text-slate-600 text-sm w-16 text-center">
                                {t("commission.results.candidateOrder")}
                            </th>
                        )}
                        <th className="py-4 px-6 font-semibold text-slate-600 text-sm">
                            {t("commission.results.codeBeverage")}
                        </th>
                        {policyOutputProperties.map((prop) => (
                            <th
                                key={prop.code}
                                className="py-4 px-6 font-bold text-indigo-700 text-sm text-center border-l border-slate-100 bg-indigo-50/30 min-w-[8rem]"
                            >
                                <OutcomePropertyLabel code={prop.code} />
                            </th>
                        ))}
                        <th className="py-4 px-6 font-semibold text-slate-600 text-sm border-l border-slate-100 w-1/2">
                            {t("commission.results.awards")}
                        </th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {filteredAndSortedRows.map((row) => {
                        const isExpanded = expandedCandidateId === row.candidate.id;
                        const numAvgCols = policyOutputProperties.length > 0 ? policyOutputProperties.length : 1;
                        const sessionOrder = candidateOrderIndex.get(row.candidate.id);
                        const colSpan = 1 + numAvgCols + 1 + (sortMode === "order" ? 1 : 0);
                        return (
                            <React.Fragment key={row.candidate.id}>
                                <tr
                                    role="button"
                                    tabIndex={0}
                                    aria-expanded={isExpanded}
                                    className="hover:bg-slate-50/50 transition-colors cursor-pointer focus-within:bg-slate-50/50"
                                    onClick={() => setExpandedCandidateId(isExpanded ? null : row.candidate.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            setExpandedCandidateId(isExpanded ? null : row.candidate.id);
                                        }
                                    }}
                                >
                                    {sortMode === "order" && (
                                        <td className="py-4 px-4 text-center font-bold text-slate-500 text-sm">
                                            {sessionOrder != null ? `#${sessionOrder}` : "—"}
                                        </td>
                                    )}
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            {isExpanded ? (
                                                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                            )}
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                    <span className="font-bold text-slate-800 text-sm leading-snug">
                                                        {row.beverageName}
                                                    </span>
                                                <span className="text-xs text-slate-600">
                                                        <span className="font-medium text-slate-500">
                                                            {t("commission.results.producer")}:
                                                        </span>{" "}
                                                    {resolveProducerName(row.producerAuids)}
                                                    </span>
                                                {row.candidate.anonymizedCode && (
                                                    <span className="text-[11px] font-mono text-slate-400">
                                                            {t("commission.results.candidateCode")}: {row.candidate.anonymizedCode}
                                                        </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    {/* Average Score */}
                                    {policyOutputProperties.map((prop) => {
                                        const outcome = row.outcomeOverall?.[prop.code];
                                        return (
                                            <td
                                                key={prop.code}
                                                className="py-4 px-6 text-center border-l border-slate-50 font-bold text-lg text-slate-700"
                                            >
                                                {outcome?.average ?? "-"}
                                                {outcome?.isPreview && (
                                                    <span className="block mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded w-fit mx-auto">
                                                            {t("commission.results.previewBadge")}
                                                        </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="py-4 px-6 border-l border-slate-50">
                                        <div className="flex flex-wrap gap-1.5">
                                            {row.awards.map((assignment: any) => (
                                                <span
                                                    key={assignment.id}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 shadow-xs"
                                                >
                                                        {assignment.award?.badgeUrl && (
                                                            <img
                                                                src={assignment.award.badgeUrl}
                                                                alt={assignment.award.name}
                                                                className="w-3.5 h-3.5 object-contain"
                                                            />
                                                        )}
                                                    {assignment.award?.name || t("commission.results.unknownAward")}
                                                    </span>
                                            ))}
                                            {row.awards.length === 0 && (
                                                <span className="text-xs text-slate-400 font-normal">
                                                        {t("commission.results.noAwards")}
                                                    </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                <tr className={isExpanded ? undefined : "hidden"}>
                                    <td
                                        colSpan={colSpan}
                                        className="p-0 border-b border-slate-200 bg-slate-50/80 shadow-inner"
                                    >
                                        <div className="p-6">
                                            <h4 className="text-sm font-bold text-slate-700 mb-4">
                                                {t("commission.results.expertBreakdown")}
                                            </h4>
                                            {row.expertBreakdown.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {row.expertBreakdown.map((expert) => (
                                                        <div
                                                            key={expert.key}
                                                            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col"
                                                        >
                                                            <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="text-xs font-bold text-slate-500 uppercase">
                                                                                {expert.replicaName}
                                                                            </span>
                                                                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                                                                                {formatReplicaType(expert.replicaType)}
                                                                            </span>
                                                                    </div>
                                                                    <span className="text-xs text-slate-600 font-semibold">
                                                                            {resolveEvaluatorName(expert.evaluatorAuids)}
                                                                        </span>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1 shrink overflow-hidden min-w-0 max-w-[60%]">
                                                                    {(() => {
                                                                        const booleanLabels = {
                                                                            yesLabel: t("common.yes"),
                                                                            noLabel: t("common.no"),
                                                                        };
                                                                        const formatScore = (s: { code: string; value: string }) =>
                                                                            formatPropertyScoreValue(
                                                                                s.value,
                                                                                data.propertyMap[s.code],
                                                                                booleanLabels,
                                                                            );
                                                                        const results = expert.evaluation.scores?.filter((s) => data.propertyMap[s.code]?.isResult) || [];
                                                                        if (results.length === 1) {
                                                                            return (
                                                                                <div className="text-xl font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg shrink-0 max-w-full">
                                                                                    {formatScore(results[0])}
                                                                                </div>
                                                                            );
                                                                        }
                                                                        if (results.length > 1) {
                                                                            return results.map((s) => (
                                                                                <div
                                                                                    key={s.code}
                                                                                    className="text-[10px] sm:text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg text-right whitespace-nowrap"
                                                                                >
                                                                                    {data.propertyMap[s.code]?.name ?? s.code}: {formatScore(s)}
                                                                                </div>
                                                                            ));
                                                                        }
                                                                        return (
                                                                            <div className="text-xl font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg shrink-0">
                                                                                -
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                            <MemberEvaluationSection
                                                                evaluation={expert.evaluation}
                                                                propertyMap={data.propertyMap}
                                                                accent="indigo"
                                                                propertyCommentsEnabled={propertyCommentsEnabled}
                                                                voiceCommentsEnabled={voiceCommentsEnabled}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500 italic">
                                                    {t("commission.results.noEvaluationsYet")}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            </React.Fragment>
                        );
                    })}
                    {filteredAndSortedRows.length === 0 && (
                        <tr>
                            <td colSpan={1 + (policyOutputProperties.length > 0 ? policyOutputProperties.length : 1) + 1} className="py-12 text-center text-slate-400 text-sm">
                                {t("commission.emptyPanel")}
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}