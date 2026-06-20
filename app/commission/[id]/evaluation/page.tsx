import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getCommissionDataAction } from "../../actions"

interface Props {
    params: Promise<{ id: string }>
}

export default async function EvaluationProxyPage({ params }: Props) {
    const { id } = await params
    const cookieStore = await cookies()
    const auidStr = cookieStore.get("auid")?.value
    const currentAuid = auidStr ? parseInt(auidStr, 10) : null

    const commission = await getCommissionDataAction(id)
    if (!commission) {
        redirect(`/`)
    }

    // Find user's active replica
    const replicas = commission.replicas || []
    const activeReplica = replicas.find((r: any) => 
        r.members.some((m: any) => m.auid.includes(currentAuid))
    ) || replicas.find((r: any) => r.type === "STANDARD") || replicas[0] || null

    if (!activeReplica || activeReplica.status !== "STARTED") {
        redirect(`/commission/${id}?error=not_started`)
    }

    const replicaCandidates = activeReplica.replicaCandidates || []
    if (replicaCandidates.length === 0) {
        redirect(`/commission/${id}?error=no_candidates`)
    }

    // Redirect to the first candidate of this replica
    const firstCandidate = replicaCandidates[0]
    redirect(`/commission/${id}/candidate/${firstCandidate.id}`)
}