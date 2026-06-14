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
