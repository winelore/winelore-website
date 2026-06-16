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

