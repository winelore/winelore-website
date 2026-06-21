"use server"

import { sdk } from '../../lib/apiClient';

export async function markMemberReadyAction(replicaId: string, memberId: string) {
    try {
        return await sdk.MarkReplicaMemberReady({ replicaId, memberId });
    } catch (err: any) {
        console.error("Server Action Error (markMemberReadyAction):", err);
        throw new Error(err.message || "Failed to mark member ready");
    }
}

export async function markMemberNotReadyAction(replicaId: string, memberId: string) {
    try {
        return await sdk.MarkReplicaMemberNotReady({ replicaId, memberId });
    } catch (err: any) {
        console.error("Server Action Error (markMemberNotReadyAction):", err);
        throw new Error(err.message || "Failed to mark member not ready");
    }
}

export async function startCommissionAction(id: string) {
    try {
        return await sdk.StartCommissionReplica({ id });
    } catch (err: any) {
        console.error("Server Action Error (startCommissionAction):", err);
        throw new Error(err.message || "Failed to start commission replica");
    }
}

export async function completeCommissionAction(id: string) {
    try {
        return await sdk.CompleteCommissionReplica({ id });
    } catch (err: any) {
        console.error("Server Action Error (completeCommissionAction):", err);
        throw new Error(err.message || "Failed to complete commission replica");
    }
}

async function bootstrapTemplateEditionForCommission(commissionId: string) {
    console.log(`🚀 Bootstrapping real template edition for commission ${commissionId}...`);
    // 1. Create a new evaluation template
    const templateName = `Wine Evaluation Template ${Date.now()}`;
    const templateRes = await sdk.CreateEvaluationTemplate({
        input: {
            name: templateName,
            beverageType: "WINE",
            owners: [[1]] // likespro with AUID [1]
        }
    });
    const templateId = templateRes.createEvaluationTemplate.id;
    console.log(`  Created template: ${templateId}`);

    // 2. Create the template edition
    const categoriesInput = [
        {
            name: "Visual Assessment",
            properties: [
                {
                    type: "Boolean",
                    code: "clarity",
                    name: "Clarity",
                    description: "Color and clarity characteristics of the wine",
                    isRequired: true,
                    defaultValue: "true"
                },
                {
                    type: "Int",
                    code: "color_intensity",
                    name: "Color Intensity",
                    description: "Depth of color from 1 to 10",
                    isRequired: true,
                    defaultValue: "5",
                    minLimit: 1,
                    maxLimit: 10
                }
            ]
        },
        {
            name: "Sensory & Overall Evaluation",
            properties: [
                {
                    type: "Double",
                    code: "aroma_score",
                    name: "Aroma Score",
                    description: "Fragrance quality and balance (1.0 to 20.0)",
                    isRequired: true,
                    defaultValue: "10.0",
                    minLimit: 1.0,
                    maxLimit: 20.0
                },
                {
                    type: "Discrete",
                    code: "off_odors",
                    name: "Off-odors count",
                    description: "Count of perceived defects",
                    isRequired: true,
                    defaultValue: "0",
                    allowedValues: ["0", "1", "2", "3", "5"]
                },
                {
                    type: "Enum",
                    code: "sweetness",
                    name: "Sweetness Level",
                    description: "Residual sugar perception",
                    isRequired: true,
                    defaultValue: "DRY",
                    allowedValues: ["DRY", "MEDIUM_DRY", "SWEET"]
                },
                {
                    type: "Double",
                    code: "taste_score",
                    name: "Taste Score",
                    description: "Overall palate balance (1.0 to 50.0)",
                    isRequired: true,
                    defaultValue: "25.0",
                    minLimit: 1.0,
                    maxLimit: 50.0
                },
                {
                    type: "Smart",
                    code: "total_score",
                    name: "Total Score",
                    description: "Automatically calculated weighted score",
                    isRequired: true,
                    expression: {
                        type: "ADD",
                        left: {
                            type: "MULTIPLY",
                            left: {
                                type: "VARIABLE",
                                variableCode: "aroma_score"
                            },
                            right: {
                                type: "CONSTANT",
                                constantValue: "0.4"
                            }
                        },
                        right: {
                            type: "MULTIPLY",
                            left: {
                                type: "VARIABLE",
                                variableCode: "taste_score"
                            },
                            right: {
                                type: "CONSTANT",
                                constantValue: "0.6"
                            }
                        }
                    }
                }
            ]
        }
    ];

    const editionRes = await sdk.CreateEvaluationTemplateEdition({
        input: {
            templateId,
            version: 1,
            categories: categoriesInput
        }
    });
    const editionId = editionRes.createEvaluationTemplateEdition.id;
    console.log(`  Created template edition: ${editionId}`);

    // 3. Activate the edition
    await sdk.ActivateEvaluationTemplateEdition({ id: editionId });
    console.log(`  Activated template edition: ${editionId}`);

    // 4. Link it to the commission
    await sdk.SetCommissionTemplateEdition({
        id: commissionId,
        beverageType: "WINE",
        templateEditionId: editionId
    });
    console.log(`  Linked template edition ${editionId} to commission ${commissionId}`);

    // 5. Fetch the template edition using GetCommissionTemplates
    const result = await sdk.GetCommissionTemplates({ id: commissionId });
    const commissionWithTemplates = result.commission;
    const link = commissionWithTemplates?.templateEditions?.find(l => l.beverageType === "WINE") || commissionWithTemplates?.templateEditions?.[0];
    return link?.templateEdition || null;
}

export async function submitEvaluationAction(candidateId: string, scores: { code: string, value: string }[]) {
    try {
        console.log(`📤 Submitting evaluation for candidate ${candidateId}...`, scores);
        const submitResponse = await sdk.SubmitEvaluation({
            input: {
                candidateId,
                scores
            }
        });
        
        try {
            console.log(`Updating candidate ${candidateId} status to EVALUATED...`);
            await sdk.MarkCommissionReplicaCandidateAsEvaluated({ id: candidateId });
        } catch (statusErr: any) {
            console.warn(`⚠️ Failed to update candidate status to EVALUATED:`, statusErr.message);
        }

        return submitResponse.submitEvaluation;
    } catch (err: any) {
        console.error("Server Action Error (submitEvaluationAction):", err);
        throw new Error(err.message || "Failed to submit evaluation");
    }
}

export async function getCommissionDataAction(commissionId: string) {
    try {
        const [commissionData, countData] = await Promise.all([
            sdk.GetCommission({ id: commissionId }),
            sdk.GetCommissionCandidateCount({ commissionId })
        ]);
        const commission = commissionData.commission;
        if (!commission) return null;

        // Fetch template editions dynamically with bootstrapping fallback
        let templateEdition: any = null;
        try {
            console.log(`🔍 Fetching templates for commission ${commissionId}...`);
            const templateResult = await sdk.GetCommissionTemplates({ id: commissionId });
            const commissionWithTemplates = templateResult.commission;
            
            if (commissionWithTemplates && commissionWithTemplates.templateEditions && commissionWithTemplates.templateEditions.length > 0) {
                // Find WINE template or default to the first template link
                const link = commissionWithTemplates.templateEditions.find(l => l.beverageType === "WINE") || commissionWithTemplates.templateEditions[0];
                templateEdition = link?.templateEdition || null;
                console.log(`✅ Found template edition: ${templateEdition?.id}`);
            }
        } catch (err: any) {
            console.warn("❌ Failed to fetch template editions from backend, will try to bootstrap:", err.message);
        }

        // Check if template edition is valid (categories exist, properties are non-null and not empty)
        const isValidTemplate = templateEdition && templateEdition.categories && templateEdition.categories.length > 0 && 
            templateEdition.categories.every((c: any) => c.properties && c.properties.length > 0 && c.properties.every((p: any) => p.id && p.code && p.name));

        if (!isValidTemplate) {
            if (commission.status === "DRAFT" || commission.status === "PLANNED") {
                try {
                    templateEdition = await bootstrapTemplateEditionForCommission(commissionId);
                } catch (bootstrapErr: any) {
                    console.error("❌ Failed to bootstrap template edition:", bootstrapErr.message);
                    templateEdition = null;
                }
            } else {
                console.warn(`⚠️ Skipping template bootstrap: commission is in ${commission.status} status and cannot accept new templates.`);
                templateEdition = null;
            }
        }

        const replicas = (commission.replicas || []).map((r: any) => ({
            id: r.id,
            name: r.name || `${r.type} Replica`,
            type: r.type,
            status: r.status,
            currentCandidateId: r.currentCandidateId || null,
            members: (r.members || []).map((m: any) => ({
                id: m.id,
                auid: m.auid ? m.auid.flat() : [],
                role: m.role,
                isReady: m.isReady,
            })),
            candidateCount: r.replicaCandidates ? r.replicaCandidates.length : 0,
            replicaCandidates: (r.replicaCandidates || []).map((rc: any) => ({
                id: rc.id,
                status: rc.status,
                candidate: rc.candidate ? {
                    id: rc.candidate.id,
                    anonymizedCode: rc.candidate.anonymizedCode || null
                } : null
            }))
        }));

        // Backwards compatible members representation (from first standard replica or first replica)
        const defaultReplica = replicas.find((r: any) => r.type === "STANDARD") || replicas[0] || null;
        const defaultMembers = defaultReplica ? defaultReplica.members : [];

        return {
            id: commission.id,
            name: commission.name,
            status: commission.status,
            plannedStartAt: commission.plannedDates?.start || null,
            plannedEndAt: commission.plannedDates?.end || null,
            startedAt: commission.startedAt || null,
            endedAt: commission.endedAt || null,
            competition: {
                id: commission.competition.id,
                name: commission.competition.name,
                holders: commission.competition.holders.flat(),
                evaluationTemplateEdition: templateEdition
            },
            candidateCount: countData.commissionCandidateCount ?? 0,
            replicas,
            members: defaultMembers
        };
    } catch (err: any) {
        console.error("Server Action Error (getCommissionDataAction):", err);
        throw new Error(err.message || "Failed to fetch commission data");
    }
}

export async function getReplicaCandidatesAction(replicaId: string) {
    try {
        const response = await sdk.GetReplicaCandidates({ replicaId });
        return response.commissionReplica?.replicaCandidates || [];
    } catch (err: any) {
        console.error("Server Action Error (getReplicaCandidatesAction):", err);
        throw new Error(err.message || "Failed to fetch replica candidates");
    }
}

export async function getReplicaCandidateAction(id: string) {
    try {
        const response = await sdk.GetReplicaCandidate({ id });
        return response.commissionReplicaCandidate;
    } catch (err: any) {
        console.error("Server Action Error (getReplicaCandidateAction):", err);
        throw new Error(err.message || "Failed to fetch replica candidate");
    }
}
