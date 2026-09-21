import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"
export type AIProviderName = "google" | "openai"
/**
 * Returns a configured LanguageModel instance based on environment variables.
 * Switching between Google Gemini and OpenAI requires only changing AI_PROVIDER (and optionally AI_MODEL_NAME).
 */
export function getTastingModel(): LanguageModel {
    const provider = (process.env.AI_PROVIDER || "google").toLowerCase() as AIProviderName
    if (provider === "openai") {
        const apiKey = process.env.OPENAI_API_KEY || ""
        const openai = createOpenAI({
            apiKey,
        })
        const modelName = process.env.AI_MODEL_NAME || "gpt-4o-mini"
        return openai(modelName)
    }
    // Default: Google Gemini
    const apiKey =
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        ""
    const google = createGoogleGenerativeAI({
        apiKey,
    })
    let modelName = process.env.AI_MODEL_NAME || "gemini-3.6-flash"

    return google(modelName)
}