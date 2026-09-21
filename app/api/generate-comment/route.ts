import { streamText } from "ai"
import { getTastingModel } from "@/lib/ai/provider"
import { buildTastingPrompt, TASTING_SYSTEM_PROMPT, type TastingPayload } from "@/lib/ai/tastingPrompt"
export const dynamic = "force-dynamic"
export async function POST(req: Request) {
    try {
        const payload: TastingPayload = await req.json()
        if (!payload.categories || !Array.isArray(payload.categories)) {
            return new Response(JSON.stringify({ error: "Invalid payload: categories array is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            })
        }
        const model = getTastingModel()
        const prompt = buildTastingPrompt(payload)
        const result = streamText({
            model,
            system: TASTING_SYSTEM_PROMPT,
            prompt,
        })
        return result.toTextStreamResponse()
    } catch (error: any) {
        console.error("[AI Generate Comment Error]:", error)
        return new Response(JSON.stringify({ error: error.message || "Failed to generate tasting comment" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        })
    }
}