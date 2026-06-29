"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { TranslatedText } from "@/lib/i18n/TranslatedText";
import type { PropertyMeta } from "./propertyMap";
import { formatPropertyScoreValue, hasStoredScoreValue } from "@/lib/formatPropertyScore";

export type CompetitionFeatureFlags = {
    propertyCommentsEnabled: boolean;
    voiceCommentsEnabled: boolean;
};

export function commentHasVisibleContent(
    comment: { text?: string | null; voiceUrl?: string | null; propertyId?: string | null },
    flags: CompetitionFeatureFlags,
) {
    if (comment.propertyId && !flags.propertyCommentsEnabled) return false;
    const hasText = Boolean(comment.text?.trim());
    const hasVoice = flags.voiceCommentsEnabled && Boolean(comment.voiceUrl);
    return hasText || hasVoice;
}

export function isResultOrGeneralComment(
    comment: { propertyId?: string | null },
    propertyMap: Record<string, PropertyMeta>,
) {
    if (!comment.propertyId) return true;
    return propertyMap[comment.propertyId]?.isResult === true;
}

function hasScoreValue(
    value: string | null | undefined,
    kind?: PropertyMeta["kind"],
): boolean {
    return hasStoredScoreValue(value, kind);
}

export function hasEvaluationData(
    evaluation: {
        scores?: Array<{ code: string; value: string | null }>;
        comments?: Array<{ text?: string; voiceUrl?: string | null; propertyId?: string | null }>;
    },
    flags: CompetitionFeatureFlags,
) {
    const hasScores = (evaluation.scores || []).some((s) => hasStoredScoreValue(s.value));
    const hasComments = (evaluation.comments || []).some((c) => commentHasVisibleContent(c, flags));
    return hasScores || hasComments;
}

export function hasFullAssessmentDetails(
    evaluation: {
        scores?: Array<{ code: string; value: string }>;
        comments?: Array<{ text?: string; voiceUrl?: string | null; propertyId?: string | null }>;
    },
    propertyMap: Record<string, PropertyMeta>,
    flags: CompetitionFeatureFlags,
) {
    const scores = evaluation.scores || [];
    const hasNonResultScores = scores.some((s) => propertyMap[s.code]?.isResult !== true);
    const allComments = (evaluation.comments || []).filter((c) => commentHasVisibleContent(c, flags));
    const hasHiddenComments = allComments.some((c) => !isResultOrGeneralComment(c, propertyMap));
    return hasNonResultScores || hasHiddenComments;
}

export function hasHiddenComments(
    evaluation: { comments?: Array<{ text?: string; voiceUrl?: string | null; propertyId?: string | null }> },
    propertyMap: Record<string, PropertyMeta>,
    flags: CompetitionFeatureFlags,
) {
    const allComments = (evaluation.comments || []).filter((c) => commentHasVisibleContent(c, flags));
    return allComments.some((c) => !isResultOrGeneralComment(c, propertyMap));
}

function SubmittedScores({
    scores,
    propertyMap,
    accent = "slate",
    collapseRegularScores = false,
}: {
    scores: Array<{ code: string; value: string }>;
    propertyMap: Record<string, PropertyMeta>;
    accent?: "indigo" | "slate";
    collapseRegularScores?: boolean;
}) {
    const { t } = useTranslation();

    const regularScores = scores.filter((score) => propertyMap[score.code]?.isResult !== true);
    const resultScores = scores.filter((score) => propertyMap[score.code]?.isResult === true);

    const borderClass = accent === "indigo" ? "border-indigo-300" : "border-indigo-200";

    const booleanLabels = { yesLabel: t("common.yes"), noLabel: t("common.no") };

    const renderScoreChip = (score: { code: string; value: string }, isResult: boolean) => {
        const displayName = propertyMap[score.code]?.name || score.code;
        const displayValue = formatPropertyScoreValue(
            score.value,
            propertyMap[score.code],
            booleanLabels,
        );

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
                    {displayValue}
                </span>
            </div>
        );
    };

    if (regularScores.length === 0 && resultScores.length === 0) return null;

    return (
        <div className={`pl-3 border-l-2 ${borderClass} mt-2 space-y-3`}>
            {regularScores.length > 0 && (
                <div
                    className={`space-y-1.5${collapseRegularScores ? " hidden print:block" : ""}`}
                >
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
    );
}

function EvaluationCommentsDetails({
    comments,
    propertyMap,
    accent,
    showAll,
    propertyCommentsEnabled,
    voiceCommentsEnabled,
}: {
    comments: Array<{ id: string; text?: string; voiceUrl?: string | null; propertyId?: string | null }>;
    propertyMap: Record<string, PropertyMeta>;
    accent: "indigo" | "slate";
    showAll: boolean;
    propertyCommentsEnabled: boolean;
    voiceCommentsEnabled: boolean;
}) {
    const { t } = useTranslation();
    const flags = { propertyCommentsEnabled, voiceCommentsEnabled };

    const allComments = comments.filter((c) => commentHasVisibleContent(c, flags));

    if (allComments.length === 0) return null;

    const commentAccentClass = accent === "indigo" ? "border-slate-300" : "border-slate-200";
    const commentLabelClass = accent === "indigo" ? "text-indigo-500" : "text-slate-500";
    const commentTextClass = accent === "indigo" ? "text-indigo-950" : "text-slate-600";

    return (
        <div className={`pl-2 border-l-2 ${commentAccentClass} mt-2`}>
            <p className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                {t("commission.comments")}
            </p>
            <div className="space-y-1.5">
                {allComments.map((comment) => {
                    const displayName = comment.propertyId
                        ? propertyMap[comment.propertyId]?.name || comment.propertyId
                        : t("evaluation.generalCommentLabel");
                    const collapsed =
                        !showAll && !isResultOrGeneralComment(comment, propertyMap);
                    return (
                        <div
                            key={comment.id}
                            className={`text-xs ${commentTextClass} space-y-1${collapsed ? " hidden print:block" : ""}`}
                        >
                            <span className={`font-semibold ${commentLabelClass}`}>
                                <TranslatedText text={displayName} />:
                            </span>
                            {comment.text && <span> {comment.text}</span>}
                            {voiceCommentsEnabled && comment.voiceUrl && (
                                <div className="mt-1">
                                    <audio
                                        src={comment.voiceUrl}
                                        controls
                                        className="h-7 w-full max-w-xs"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function EvaluationCommentsSection({
    evaluation,
    propertyMap,
    accent,
    forceShowAll = false,
    propertyCommentsEnabled,
    voiceCommentsEnabled,
}: {
    evaluation: {
        comments?: Array<{ id: string; text?: string; voiceUrl?: string | null; propertyId?: string | null }>;
    };
    propertyMap: Record<string, PropertyMeta>;
    accent: "indigo" | "slate";
    forceShowAll?: boolean;
    propertyCommentsEnabled: boolean;
    voiceCommentsEnabled: boolean;
}) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(forceShowAll);
    const flags = { propertyCommentsEnabled, voiceCommentsEnabled };
    const comments = evaluation.comments || [];
    const canExpand = !forceShowAll && hasHiddenComments(evaluation, propertyMap, flags);

    if (!comments.some((c) => commentHasVisibleContent(c, flags))) {
        return null;
    }

    return (
        <div className="space-y-2">
            <EvaluationCommentsDetails
                comments={comments}
                propertyMap={propertyMap}
                accent={accent}
                showAll={forceShowAll || expanded}
                propertyCommentsEnabled={propertyCommentsEnabled}
                voiceCommentsEnabled={voiceCommentsEnabled}
            />
            {canExpand && (
                <button
                    type="button"
                    onClick={() => setExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors print:hidden"
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
    );
}

function MemberEvaluationDetails({
    evaluation,
    propertyMap,
    accent,
    showAll,
    propertyCommentsEnabled,
    voiceCommentsEnabled,
}: {
    evaluation: {
        scores?: Array<{ code: string; value: string }>;
        comments?: Array<{ id: string; text?: string; voiceUrl?: string | null; propertyId?: string | null }>;
    };
    propertyMap: Record<string, PropertyMeta>;
    accent: "indigo" | "slate";
    showAll: boolean;
    propertyCommentsEnabled: boolean;
    voiceCommentsEnabled: boolean;
}) {
    const scores = (evaluation.scores || []).filter((s) =>
        hasScoreValue(s.value, propertyMap[s.code]?.kind),
    );

    return (
        <>
            {scores.length > 0 && (
                <SubmittedScores
                    scores={scores}
                    propertyMap={propertyMap}
                    accent={accent}
                    collapseRegularScores={!showAll}
                />
            )}

            <EvaluationCommentsDetails
                comments={evaluation.comments || []}
                propertyMap={propertyMap}
                accent={accent}
                showAll={showAll}
                propertyCommentsEnabled={propertyCommentsEnabled}
                voiceCommentsEnabled={voiceCommentsEnabled}
            />
        </>
    );
}

export function MemberEvaluationSection({
    evaluation,
    propertyMap,
    accent,
    forceShowAll = false,
    propertyCommentsEnabled,
    voiceCommentsEnabled,
}: {
    evaluation: {
        scores?: Array<{ code: string; value: string }>;
        comments?: Array<{ id: string; text?: string; voiceUrl?: string | null; propertyId?: string | null }>;
    };
    propertyMap: Record<string, PropertyMeta>;
    accent: "indigo" | "slate";
    forceShowAll?: boolean;
    propertyCommentsEnabled: boolean;
    voiceCommentsEnabled: boolean;
}) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(forceShowAll);
    const flags = { propertyCommentsEnabled, voiceCommentsEnabled };
    const canExpand = !forceShowAll && hasFullAssessmentDetails(evaluation, propertyMap, flags);

    return (
        <div className="space-y-2">
            <MemberEvaluationDetails
                evaluation={evaluation}
                propertyMap={propertyMap}
                accent={accent}
                showAll={forceShowAll || expanded}
                propertyCommentsEnabled={propertyCommentsEnabled}
                voiceCommentsEnabled={voiceCommentsEnabled}
            />
            {canExpand && (
                <button
                    type="button"
                    onClick={() => setExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors print:hidden"
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
    );
}
