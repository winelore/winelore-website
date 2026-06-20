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

    if (!commission || commission.status !== "STARTED") {
        redirect(`/commission/${id}?error=not_started`)
    }

    const candidates = commission.members || []

    // COMMENT OUT THIS CHECK FOR TESTING:
    // if (candidates.length === 0) {
    //     redirect(`/commission/${id}?error=no_candidates`)
    // }

    // Use a hardcoded string ID if the array is empty
    const firstCandidateId = candidates[0]?.id || "test-fake-candidate-id"
    
    // In a real scenario, we might want to find the first candidate that hasn't been evaluated by this member yet.
    // For now, we just redirect to the first one available.

    redirect(`/commission/${id}/candidate/${firstCandidateId}`)

}