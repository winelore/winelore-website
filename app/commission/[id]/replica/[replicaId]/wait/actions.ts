"use server"
import { fetchGraphQLRaw } from "@/lib/apiClient";
import { getCommissionTemplatesWithResultMarkers, getEvaluationsForCandidateAction } from "../../../../actions";
import { buildPropertyMapFromCommissionTemplates } from "../../../../propertyMap";
import { buildTemplateEditionById } from "@/lib/templateEditionMap";
const GET_COMMISSION_RESULTS_WITH_PANEL = `
  query GetCommissionResults($id: ID!) {
    commission(id: $id) {
      id
      name
      status
      voiceCommentsEnabled
      propertyCommentsEnabled
      competition {
        holders
      }
      outcomePolicyEdition {
        id
        scriptCode
        calculationScope
        outputProperties {
          code
          name
          isResult
        }
      }
      candidates {
        id
        anonymizedCode
        panelId
        beverageType {
          id
          code
          name
        }
        sample {
          id
          volumeMl
          batch {
            id
            attributes
            beverage {
              id
              name
              attributes
              producers {
                id
                auid
                role
              }
              origin {
                latitude
                longitude
              }
            }
          }
        }
      }
      replicas {
        id
        name
        type
        status
        members {
          id
          auid
          role
        }
        outcomes {
          beverageId
          scores
        }
        replicaCandidates {
          id
          status
          candidate {
            id
          }
        }
      }
    }
  }
`;
const GET_BEVERAGE_AWARDS = `
  query GetBeverageAwards($beverageId: ID!) {
    beverageAwards(beverageId: $beverageId) {
      id
      commissionId
      award {
        id
        name
        code
        badgeUrl
      }
    }
  }
`;
export async function getPanelResultsAction(commissionId: string, replicaId: string, panelId: string) {
    let commission = null;
    const awardsMap: Record<string, any[]> = {};
    let propertyMap = {};
    let templateEditionById = {};

    try {
        const response = await fetchGraphQLRaw<any, { id: string }>(GET_COMMISSION_RESULTS_WITH_PANEL, {
            id: commissionId,
        });
        commission = response?.commission;

        if (!commission) return null;
        try {
            const templateResult = await getCommissionTemplatesWithResultMarkers(commissionId);
            propertyMap = buildPropertyMapFromCommissionTemplates(templateResult);
            templateEditionById = buildTemplateEditionById(templateResult);
        } catch (err) {
            console.error("[wait] Failed to fetch template metadata:", err);
        }
        // Only fetch evaluations for replica candidates that belong to this panel
        const panelCandidateIds = commission.candidates
            .filter((c: any) => c.panelId === panelId)
            .map((c: any) => c.id);
        if (commission.replicas) {
            await Promise.all(
                commission.replicas.map(async (replica: any) => {
                    if (replica.replicaCandidates) {
                        await Promise.all(
                            replica.replicaCandidates.map(async (rc: any) => {
                                // Only fetch if it's in the panel
                                if (panelCandidateIds.includes(rc.candidate?.id)) {
                                    try {
                                        const evs = await getEvaluationsForCandidateAction(rc.id);
                                        rc.evaluations = evs;
                                    } catch (err) {
                                        console.error(`[wait] Failed to fetch evaluations for replica candidate ${rc.id}:`, err);
                                        rc.evaluations = [];
                                    }
                                } else {
                                    rc.evaluations = [];
                                }
                            })
                        );
                    }
                })
            );
        }
        // Fetch awards
        const beverageIds = Array.from(
            new Set(
                commission.candidates
                    .filter((c: any) => c.panelId === panelId)
                    .map((c: any) => c.sample?.batch?.beverage?.id)
                    .filter(Boolean),
            )
        ) as string[];
        const awardsResponses = await Promise.all(
            beverageIds.map(async (beverageId) => {
                try {
                    const res = await fetchGraphQLRaw<any, { beverageId: string }>(
                        GET_BEVERAGE_AWARDS,
                        { beverageId },
                    );
                    return { beverageId, awards: res?.beverageAwards || [] };
                } catch (err) {
                    console.error(`[wait] Failed to fetch awards for ${beverageId}:`, err);
                    return { beverageId, awards: [] };
                }
            })
        );
        awardsResponses.forEach((item) => {
            awardsMap[item.beverageId] = item.awards;
        });
        return {
            commission,
            awardsMap,
            propertyMap,
            templateEditionById
        };
    } catch (error) {
        console.error("[wait] Failed to load panel results:", error);
        return null;
    }
}