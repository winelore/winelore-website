import { getCommissionDataAction, getMyEvaluationForCandidateAction, getReplicaCandidateAction, getReplicaCandidatesAction } from "../../../../../actions"
import { isReplicaCandidateFinished } from "../../../../../replicaUtils"
import { notFound, redirect } from "next/navigation"
import { getGeographicInfo } from "../../../../../../../lib/geocoding"
import CandidateEvaluationClientView from "./CandidateEvaluationClientView"
import { cookies } from "next/headers"

interface Props {
    params: Promise<{ id: string; replicaId: string; candidateId: string }>
}

export default async function CandidateEvaluationPage({ params }: Props) {
    const { id: routeCommissionId, replicaId, candidateId } = await params

    const cookieStore = await cookies()
    const auidStr = cookieStore.get("auid")?.value
    if (!auidStr) {
        redirect("/auth/login")
    }

    // 1. Fetch the replica candidate by its ID (candidateId is replica candidate ID)
    const replicaCandidate = await getReplicaCandidateAction(candidateId)
    if (!replicaCandidate) notFound()

    const commissionId = replicaCandidate.replica.commission.id
    const currentReplicaId = replicaCandidate.replica.id

    if (
        replicaCandidate.replica.currentPanelId !== replicaCandidate.replicaPanel.id ||
        replicaCandidate.replicaPanel.status !== "IN_PROGRESS" ||
        replicaCandidate.replicaPanel.currentCandidateId !== candidateId
    ) {
        redirect(`/commission/${commissionId}/replica/${currentReplicaId}/wait`)
    }

    // If this candidate round is finished, send the user to the wait page
    if (isReplicaCandidateFinished(replicaCandidate.status)) {
        redirect(`/commission/${commissionId}/replica/${currentReplicaId}/wait`)
    }

    const myEvaluation = await getMyEvaluationForCandidateAction(candidateId)
    if (myEvaluation?.isComplete === true) {
        redirect(`/commission/${commissionId}/replica/${currentReplicaId}/wait`)
    }

    // 2. Fetch the commission data (which includes templates/categories)
    const commission = await getCommissionDataAction(commissionId)
    if (!commission) notFound()

    // If this candidate is not the currently active candidate for the replica, redirect to wait
    const currentReplica = (commission.replicas || []).find((r: any) => r.id === currentReplicaId)
    if (currentReplica?.currentCandidateId && currentReplica.currentCandidateId !== candidateId) {
        redirect(`/commission/${commissionId}/replica/${currentReplicaId}/wait`)
    }

    // 3. Fetch all replica candidates and isolate the PANEL
    const replicaCandidatesAll = await getReplicaCandidatesAction(currentReplicaId)

    // Find current candidate to determine its panel
    const currentIndexAll = replicaCandidatesAll.findIndex((c: any) => c.id === candidateId)
    const currentReplicaCandidate = replicaCandidatesAll[currentIndexAll] || replicaCandidate
    const currentCandidate = currentReplicaCandidate.candidate
    const currentPanelId = currentCandidate.panelId

    const panelCandidates = replicaCandidatesAll.filter((c: any) => c.candidate.panelId === currentPanelId)

    const currentIndex = panelCandidates.findIndex((c: any) => c.id === candidateId)
    const evaluatedCount = panelCandidates.filter((c: any) => isReplicaCandidateFinished(c.status)).length
    const candidatesLeft = panelCandidates.length - evaluatedCount

    const panelName = commission.panels?.find((p: any) => p.id === currentPanelId)?.name || "Panel"

    // Fetch candidate origin
    const originVisible = commission.competition.beverageOriginDuringEvaluationEnabled
    const origin = currentCandidate?.sample?.batch?.beverage?.origin
    let originInfo = null
    if (originVisible && origin && typeof origin.latitude === "number" && typeof origin.longitude === "number") {
        originInfo = await getGeographicInfo(origin.latitude, origin.longitude)
    }

    // Use the dynamic evaluation template from the backend
    const categories = commission.competition?.evaluationTemplateEdition?.categories || []
    const evalVisibleAttr = commission.evaluationVisibleAttributes || { beverage: [], batch: [], sample: [] };
    const visibleAttributes: { label: string; value: string }[] = [];

    // === DEBUG LOGGING ===
    console.log("[DEBUG attributes] evalVisibleAttr:", JSON.stringify(evalVisibleAttr));
    console.log("[DEBUG attributes] currentCandidate?.sample:", JSON.stringify(currentCandidate?.sample));
    console.log("[DEBUG attributes] beverage.attributes (raw):", currentCandidate?.sample?.batch?.beverage?.attributes);
    console.log("[DEBUG attributes] batch.attributes (raw):", currentCandidate?.sample?.batch?.attributes);
    console.log("[DEBUG attributes] sample.attributes (raw):", currentCandidate?.sample?.attributes);
    // ====================

    // Функція для надійного парсингу атрибутів (підтримує як JSON, так і Kotlin Map {key=value})
    function parseAttributesString(attrStr: string | any | undefined): Record<string, string> {
        if (!attrStr) return {};
        if (typeof attrStr === 'object') return attrStr;

        const trimmed = String(attrStr).trim();
        if (!trimmed) return {};

        // 1. Спробуємо стандартний JSON
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === "object") {
                const result: Record<string, string> = {};
                Object.entries(parsed).forEach(([k, v]) => {
                    if (v !== null && v !== undefined) result[k] = String(v);
                });
                return result;
            }
        } catch (e) {
            // Це не JSON, йдемо далі
        }

        // 2. Спробуємо Kotlin Map формат: {key1=val1, key2=val2}
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            const content = trimmed.slice(1, -1).trim();
            if (!content) return {};

            const result: Record<string, string> = {};
            const parts = content.split(/,\s*/);
            parts.forEach(part => {
                const eqIdx = part.indexOf('=');
                if (eqIdx !== -1) {
                    const key = part.substring(0, eqIdx).trim().replace(/^["']|["']$/g, "");
                    const val = part.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
                    if (key) result[key] = val;
                }
            });
            return result;
        }

        return {};
    }

    // Допоміжна функція для фільтрації та відбору лише видимих атрибутів
    const processAttributes = (rawAttr: string | any | undefined, visibleKeys: string[]) => {
        if (!rawAttr || !visibleKeys || visibleKeys.length === 0) return;

        const parsed = parseAttributesString(rawAttr);
        const parsedKeys = Object.keys(parsed);

        visibleKeys.forEach((key) => {
            // Шукаємо ключ без урахування регістру (наприклад vintage === Vintage)
            const actualKey = parsedKeys.find(k => k.toLowerCase() === key.toLowerCase());
            if (actualKey && parsed[actualKey] !== undefined && parsed[actualKey] !== null && parsed[actualKey] !== "") {
                visibleAttributes.push({ label: key, value: String(parsed[actualKey]) });
            }
        });
    };

    // Collecting attributes (beverage -> batch -> sample)
    const beverage = currentCandidate?.sample?.batch?.beverage;
    const batch = currentCandidate?.sample?.batch;
    const sample = currentCandidate?.sample;
    processAttributes(beverage?.attributes, evalVisibleAttr.beverage);
    processAttributes(batch?.attributes, evalVisibleAttr.batch);
    processAttributes(sample?.attributes, evalVisibleAttr.sample);
    console.log("[DEBUG attributes] final visibleAttributes:", JSON.stringify(visibleAttributes));

    const mockVisibleAttributes = [
        { label: "vintage", value: "2021" },
        { label: "color", value: "Червоне" },
        { label: "sugar", value: "Сухе" }
    ];

    return (
        <CandidateEvaluationClientView
            replicaName={replicaCandidate.replica.name}
            candidateCode={(currentCandidate?.anonymizedCode && currentCandidate.anonymizedCode.trim()) ? currentCandidate.anonymizedCode.trim() : (currentIndex >= 0 ? `#${currentIndex + 1}` : candidateId)}
            commissionName={commission.name}
            panelName={panelName}
            currentIndex={currentIndex}
            totalCandidates={panelCandidates.length}
            candidatesLeft={candidatesLeft}
            categories={categories}
            candidateId={candidateId}
            commissionId={commissionId}
            replicaId={currentReplicaId}
            originParts={[originInfo?.country, originInfo?.region, originInfo?.district].filter(Boolean) as string[]}
            propertyCommentsEnabled={commission.competition.propertyCommentsEnabled}
            voiceCommentsEnabled={commission.competition.voiceCommentsEnabled}
            visibleAttributes={visibleAttributes}
            // visibleAttributes={mockVisibleAttributes}
        />
    )
}
