import { print } from "graphql"
import type { AddableProducerRole, BeverageOrigin, BeverageProducer } from "@winelore/core/beverage"
import {
    ChangeBatchLotNumberDocument,
    ChangeBatchVolumeDocument,
    ChangeBeverageNameDocument,
    ChangeBeverageOriginDocument,
    RegisterBeverageProducerDocument,
    SubmitBeverageForReviewDocument,
    UnregisterBeverageProducerDocument,
    UpdateBatchAttributesDocument,
} from "@winelore/core/gql/sdk"
import { mutateGraphQLRaw } from "../api/client"

/**
 * What a producer can do from the beverage page — the web's server actions,
 * sent from the phone with the user's own token and, as the web sends it,
 * the user as the actor.
 *
 * Each mutation answers with the beverage as it now is; the fields the page
 * shows are returned so the caller can patch what is on screen.
 */

interface UpdatedBeverage {
    name: string
    status: string
    producers: BeverageProducer[]
    origin: BeverageOrigin | null
}

const actor = (auid: string) => ({ actor: auid, "x-actor": auid })

async function mutate<K extends string>(
    document: Parameters<typeof print>[0],
    field: K,
    variables: Record<string, unknown>,
    auid: string,
): Promise<UpdatedBeverage> {
    const data = await mutateGraphQLRaw<Record<K, UpdatedBeverage>>(print(document), variables, actor(auid))
    return data[field]
}

export const submitBeverageForReview = (id: string, auid: string) =>
    mutate(SubmitBeverageForReviewDocument, "submitBeverageForReview", { id }, auid)

export const renameBeverage = (id: string, name: string, auid: string) =>
    mutate(ChangeBeverageNameDocument, "changeBeverageName", { id, newName: name.trim() }, auid)

export const changeBeverageOrigin = (id: string, origin: { latitude: number; longitude: number } | null, auid: string) =>
    mutate(ChangeBeverageOriginDocument, "changeBeverageOrigin", { id, origin }, auid)

export const registerBeverageProducer = (id: string, producerAuid: number, role: AddableProducerRole, auid: string) =>
    mutate(RegisterBeverageProducerDocument, "registerBeverageProducer", { id, producer: { auid: [producerAuid], role } }, auid)

export const unregisterBeverageProducer = (id: string, producerDetailsId: string, auid: string) =>
    mutate(UnregisterBeverageProducerDocument, "unregisterBeverageProducer", { id, producerDetailsId }, auid)

interface UpdatedBatch {
    id: string
    volumeMl: number | null
    lotNumber: string | null
    attributes: unknown
}

async function mutateBatch<K extends string>(
    document: Parameters<typeof print>[0],
    field: K,
    variables: Record<string, unknown>,
    auid: string,
): Promise<UpdatedBatch> {
    const data = await mutateGraphQLRaw<Record<K, UpdatedBatch>>(print(document), variables, actor(auid))
    return data[field]
}

/** What a producer can change on a batch from its card — the web's batch actions. */
export const changeBatchVolume = (id: string, volumeMl: number | null, auid: string) =>
    mutateBatch(ChangeBatchVolumeDocument, "changeBatchVolume", { id, volumeMl }, auid)

export const changeBatchLotNumber = (id: string, lotNumber: string | null, auid: string) =>
    mutateBatch(ChangeBatchLotNumberDocument, "changeBatchLotNumber", { id, lotNumber }, auid)

export const updateBatchAttributes = (id: string, attributes: Record<string, unknown>, auid: string) =>
    mutateBatch(UpdateBatchAttributesDocument, "updateBatchAttributes", { id, attributes }, auid)
