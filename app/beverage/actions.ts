"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { sdk } from "@/lib/apiClient"
import {
    SUBMIT_BEVERAGE_FOR_REVIEW,
    CHANGE_BEVERAGE_NAME,
    CHANGE_BEVERAGE_ORIGIN,
    UPDATE_BEVERAGE_ATTRIBUTES,
    REGISTER_BEVERAGE_PRODUCER,
    UNREGISTER_BEVERAGE_PRODUCER,
} from "./queries"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isValidUuid(id: string | null | undefined): boolean {
    return !!id && UUID_REGEX.test(id)
}

async function getActorHeaders(): Promise<Record<string, string>> {
    const cookieStore = await cookies()
    const auid = cookieStore.get("auid")?.value
    if (!auid) {
        throw new Error("Unauthorized: Please sign in")
    }
    return { actor: auid, "x-actor": auid }
}

export async function submitBeverageForReviewAction(id: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter")
    const headers = await getActorHeaders()
    try {
        const data = await sdk.SubmitBeverageForReview({ id }, { headers })
        revalidatePath(`/beverage/${id}`)
        return data.submitBeverageForReview
    } catch (err: any) {
        console.error("Server Action Error (submitBeverageForReviewAction):", err)
        throw new Error(err.message || "Failed to submit beverage for review")
    }
}

export async function changeBeverageNameAction(id: string, newName: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter")
    const trimmed = newName.trim()
    if (!trimmed) throw new Error("Name cannot be empty")
    const headers = await getActorHeaders()
    try {
        const data = await sdk.ChangeBeverageName({ id, newName: trimmed }, { headers })
        revalidatePath(`/beverage/${id}`)
        return data.changeBeverageName
    } catch (err: any) {
        console.error("Server Action Error (changeBeverageNameAction):", err)
        throw new Error(err.message || "Failed to rename beverage")
    }
}

export async function changeBeverageOriginAction(
    id: string,
    origin: { latitude: number; longitude: number } | null
) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter")
    const headers = await getActorHeaders()
    try {
        const data = await sdk.ChangeBeverageOrigin({ id, origin }, { headers })
        revalidatePath(`/beverage/${id}`)
        return data.changeBeverageOrigin
    } catch (err: any) {
        console.error("Server Action Error (changeBeverageOriginAction):", err)
        throw new Error(err.message || "Failed to update origin")
    }
}

export async function updateBeverageAttributesAction(id: string, attributes: Record<string, unknown>) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter")
    const headers = await getActorHeaders()
    try {
        const data = await sdk.UpdateBeverageAttributes({ id, attributes }, { headers })
        revalidatePath(`/beverage/${id}`)
        return data.updateBeverageAttributes
    } catch (err: any) {
        console.error("Server Action Error (updateBeverageAttributesAction):", err)
        throw new Error(err.message || "Failed to update attributes")
    }
}

export async function registerBeverageProducerAction(id: string, auid: number, role: "MAKER" | "BOTTLER") {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter")
    const headers = await getActorHeaders()
    try {
        const data = await sdk.RegisterBeverageProducer({ id, producer: { auid: [auid], role } as any }, { headers })
        revalidatePath(`/beverage/${id}`)
        return data.registerBeverageProducer
    } catch (err: any) {
        console.error("Server Action Error (registerBeverageProducerAction):", err)
        throw new Error(err.message || "Failed to add producer")
    }
}

export async function unregisterBeverageProducerAction(id: string, producerDetailsId: string) {
    if (!isValidUuid(id)) throw new Error("Invalid UUID parameter")
    const headers = await getActorHeaders()
    try {
        const data = await sdk.UnregisterBeverageProducer({ id, producerDetailsId }, { headers })
        revalidatePath(`/beverage/${id}`)
        return data.unregisterBeverageProducer
    } catch (err: any) {
        console.error("Server Action Error (unregisterBeverageProducerAction):", err)
        throw new Error(err.message || "Failed to remove producer")
    }
}
