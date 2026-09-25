import { generateObject } from "ai"
import { getTastingModel } from "@/lib/ai/provider"
import {
    buildTastingPrompt,
    buildTastingSystemPrompt,
    tastingOptionsSchema,
    type TastingPayload,
} from "@/lib/ai/tastingPrompt"
import { getFewShotExamples } from "@/lib/ai/commentKnowledgeBase"

export const dynamic = "force-dynamic"
export async function POST(req: Request) {
    try {
        const payload: TastingPayload = await req.json()
        if (!payload.categories || !Array.isArray(payload.categories)) {
            return Response.json({ error: "Invalid payload: categories array is required" }, { status: 400 })
        }
        const model = getTastingModel()
        const prompt = buildTastingPrompt(payload)
        const fewShotExamples = getFewShotExamples(3)
        const system = buildTastingSystemPrompt(fewShotExamples)
        const { object } = await generateObject({
            model,
            schema: tastingOptionsSchema,
            system,
            prompt,
        })
        return Response.json({ options: object.options })
    } catch (error: any) {
        console.error("[AI Generate Comment Error]:", error)
        const isRateLimit =
            error?.status === 429 ||
            error?.statusCode === 429 ||
            error?.message?.includes("429") ||
            error?.message?.includes("Quota exceeded") ||
            error?.message?.includes("RESOURCE_EXHAUSTED")
        const status = isRateLimit ? 429 : 500
        return Response.json(
            {
                error: isRateLimit
                    ? "AI rate limit reached. Please wait a moment before trying again."
                    : error.message || "Failed to generate tasting comment options",
            },
            { status }
        )
    }
}