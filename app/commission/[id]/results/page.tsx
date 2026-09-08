export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { fetchGraphQLRaw } from "@/lib/apiClient"

const GET_COMMISSION_COMPETITION = `
  query GetCommissionCompetition($id: ID!) {
    commission(id: $id) {
      id
      competition {
        id
      }
    }
  }
`

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function CommissionResultsRedirect({ params }: PageProps) {
    const { id: commissionId } = await params
    let competitionId: string | null = null

    try {
        const response = await fetchGraphQLRaw<any, { id: string }>(GET_COMMISSION_COMPETITION, {
            id: commissionId,
        })
        competitionId = response?.commission?.competition?.id ?? null
    } catch (error) {
        console.error("[results] Failed to resolve competition for commission:", error)
    }

    if (!competitionId) {
        redirect(`/commission/${commissionId}`)
    }

    redirect(`/competition/${competitionId}/results?commission=${encodeURIComponent(commissionId)}`)
}
