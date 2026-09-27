import { print } from "graphql"
import {
    CHANGE_COMPETITION_NAME,
    CREATE_COMMISSION,
    UPDATE_COMPETITION_DATES,
    createCommissionInput,
    plannedDatesInput,
    quickCommission,
    type CompetitionPageData,
} from "@winelore/core/competition"
import { DevSubmitCompetitionForReviewDocument, StartCompetitionDocument } from "@winelore/core/gql/sdk"
import { mutateGraphQLRaw } from "../api/client"

/**
 * What a holder can do from the competition page — the web's server actions,
 * sent from the phone with the user's own token. Inputs are built by the same
 * core functions the web's actions call.
 */

export async function renameCompetition(id: string, name: string): Promise<void> {
    await mutateGraphQLRaw(CHANGE_COMPETITION_NAME, { id, newName: name })
}

export async function updateCompetitionDates(id: string, start: string | null, end: string | null): Promise<void> {
    await mutateGraphQLRaw(UPDATE_COMPETITION_DATES, { id, input: plannedDatesInput(start, end) })
}

export async function startCompetition(id: string): Promise<void> {
    await mutateGraphQLRaw(print(StartCompetitionDocument), { id })
}

/**
 * The backend reads the submitter from an actor header here, as the web's
 * action sends it, rather than from the token.
 */
export async function submitCompetitionForReview(id: string, auid: string): Promise<void> {
    await mutateGraphQLRaw(print(DevSubmitCompetitionForReviewDocument), { id }, { actor: auid, "x-actor": auid })
}

/** Add a commission the way the web's "Add commission" does. */
export async function addCommission(competition: CompetitionPageData, name: string): Promise<void> {
    await mutateGraphQLRaw(CREATE_COMMISSION, { input: createCommissionInput(quickCommission(competition, name)) })
}
