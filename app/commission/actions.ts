"use server"

import { sdk } from '../../lib/apiClient';

export async function markMemberReadyAction(commissionId: string, memberId: string) {
    try {
        return await sdk.MarkMemberReady({ commissionId, memberId });
    } catch (err: any) {
        console.error("Server Action Error (markMemberReadyAction):", err);
        throw new Error(err.message || "Failed to mark member ready");
    }
}

export async function markMemberNotReadyAction(commissionId: string, memberId: string) {
    try {
        return await sdk.MarkMemberNotReady({ commissionId, memberId });
    } catch (err: any) {
        console.error("Server Action Error (markMemberNotReadyAction):", err);
        throw new Error(err.message || "Failed to mark member not ready");
    }
}

export async function startCommissionAction(id: string) {
    try {
        return await sdk.StartCommission({ id });
    } catch (err: any) {
        console.error("Server Action Error (startCommissionAction):", err);
        throw new Error(err.message || "Failed to start commission");
    }
}

export async function completeCommissionAction(id: string) {
    try {
        return await sdk.CompleteCommission({ id });
    } catch (err: any) {
        console.error("Server Action Error (completeCommissionAction):", err);
        throw new Error(err.message || "Failed to complete commission");
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

        // Fetch template editions dynamically with fallback
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
            } else {
                console.log(`⚠️ No template editions found for commission ${commissionId}`);
            }
        } catch (err: any) {
            console.warn("❌ Failed to fetch template editions from backend, using mock fallback:", err);
            // Log full error details if available
            if (err.response?.errors) {
                console.warn("GraphQL Errors:", JSON.stringify(err.response.errors, null, 2));
            }
        }

        // Apply a full mock template if backend response has missing property fields or empty categories
        if (!templateEdition || !templateEdition.categories || templateEdition.categories.length === 0 || 
            templateEdition.categories.some((c: any) => !c.properties || c.properties.some((p: any) => !p.id || !p.code || !p.name))) {
            console.log("👉 Using fallback evaluation template edition");
            templateEdition = {
                id: "fallback-mock-template-id",
                version: 1,
                status: "ACTIVE",
                categories: [
                    {
                        id: "cat-1",
                        name: "Visual Assessment",
                        properties: [
                            {
                                __typename: "BooleanProperty",
                                id: "prop-clarity",
                                code: "clarity",
                                name: "Clarity",
                                description: "Color and clarity characteristics of the wine",
                                isRequired: true,
                                boolDefaultValue: true
                            },
                            {
                                __typename: "IntProperty",
                                id: "prop-color-intensity",
                                code: "color_intensity",
                                name: "Color Intensity",
                                description: "Depth of color from 1 to 10",
                                isRequired: true,
                                intMinLimit: 1,
                                intMaxLimit: 10,
                                intDefaultValue: 5
                            }
                        ]
                    },
                    {
                        id: "cat-2",
                        name: "Olfactory Assessment",
                        properties: [
                            {
                                __typename: "DoubleProperty",
                                id: "prop-aroma-score",
                                code: "aroma_score",
                                name: "Aroma Score",
                                description: "Fragrance quality and balance (1.0 to 20.0)",
                                isRequired: true,
                                doubleMinLimit: 1.0,
                                doubleMaxLimit: 20.0,
                                doubleDefaultValue: 10.0
                            },
                            {
                                __typename: "DiscreteNumbersProperty",
                                id: "prop-off-odors",
                                code: "off_odors",
                                name: "Off-odors count",
                                description: "Count of perceived defects",
                                isRequired: true,
                                discreteAllowedValues: [0, 1, 2, 3, 5],
                                discreteDefaultValue: 0
                            }
                        ]
                    },
                    {
                        id: "cat-3",
                        name: "Taste Assessment",
                        properties: [
                            {
                                __typename: "EnumProperty",
                                id: "prop-sweetness",
                                code: "sweetness",
                                name: "Sweetness Level",
                                description: "Residual sugar perception",
                                isRequired: true,
                                enumAllowedValues: ["DRY", "MEDIUM_DRY", "SWEET"],
                                enumDefaultValue: "DRY"
                            },
                            {
                                __typename: "DoubleProperty",
                                id: "prop-taste-score",
                                code: "taste_score",
                                name: "Taste Score",
                                description: "Overall palate balance (1.0 to 50.0)",
                                isRequired: true,
                                doubleMinLimit: 1.0,
                                doubleMaxLimit: 50.0,
                                doubleDefaultValue: 25.0
                            }
                        ]
                    },
                    {
                        id: "cat-4",
                        name: "Calculated Evaluation",
                        properties: [
                            {
                                __typename: "SmartProperty",
                                id: "prop-total-score",
                                code: "total_score",
                                name: "Total Score",
                                description: "Automatically calculated weighted score",
                                isRequired: true,
                                expression: {
                                    __typename: "BinaryExpression",
                                    type: "ADD",
                                    left: {
                                        __typename: "BinaryExpression",
                                        type: "MULTIPLY",
                                        left: {
                                            __typename: "VariableExpression",
                                            type: "VARIABLE",
                                            code: "aroma_score"
                                        },
                                        right: {
                                            __typename: "ConstantExpression",
                                            type: "CONSTANT",
                                            value: "0.4"
                                        }
                                    },
                                    right: {
                                        __typename: "BinaryExpression",
                                        type: "MULTIPLY",
                                        left: {
                                            __typename: "VariableExpression",
                                            type: "VARIABLE",
                                            code: "taste_score"
                                        },
                                        right: {
                                            __typename: "ConstantExpression",
                                            type: "CONSTANT",
                                            value: "0.6"
                                        }
                                    }
                                }
                            }
                        ]
                    }
                ]
            };
        }

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
            members: commission.members.map((m) => ({
                id: m.id,
                auid: m.auid.flat(),
                role: m.role,
                isReady: m.isReady,
            }))
        };
    } catch (err: any) {
        console.error("Server Action Error (getCommissionDataAction):", err);
        throw new Error(err.message || "Failed to fetch commission data");
    }
}

export async function getCommissionCandidatesAction(commissionId: string) {
    try {
        const response = await sdk.GetCommissionCandidates({ commissionId });
        return response.commissionCandidatesByCommission?.items || [];
    } catch (err: any) {
        console.error("Server Action Error (getCommissionCandidatesAction):", err);
        throw new Error(err.message || "Failed to fetch commission candidates");
    }
}

