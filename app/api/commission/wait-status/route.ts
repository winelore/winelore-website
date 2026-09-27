import { NextResponse } from "next/server";
import { getWaitDataAction } from "@/app/commission/actions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const commissionId = searchParams.get("commissionId");
    const replicaId = searchParams.get("replicaId");

    if (!commissionId || !replicaId) {
        return NextResponse.json({ error: "Missing commissionId or replicaId" }, { status: 400 });
    }

    try {
        const data = await getWaitDataAction(commissionId, replicaId);
        return NextResponse.json({
            replicaStatus: data.replicaStatus,
            isPanelFinished: data.isPanelFinished,
            currentCandidateId: data.currentCandidateId,
            hasCompletedCurrentCandidate: data.hasCompletedCurrentCandidate,
        });
    } catch (e: any) {
        console.error("Error in /api/commission/wait-status:", e);
        return NextResponse.json({ error: e.message || "Failed to fetch wait status" }, { status: 500 });
    }
}
