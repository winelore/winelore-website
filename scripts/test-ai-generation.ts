import fs from "node:fs"
import path from "node:path"
import { generateText } from "ai"
import { getTastingModel } from "../lib/ai/provider"
import {
    buildTastingPrompt,
    TASTING_SYSTEM_PROMPT,
    type TastingPayload,
} from "../lib/ai/tastingPrompt"

// Simple .env loader for CLI execution
function loadEnv() {
    const envFiles = [".env.local", ".env"]
    for (const file of envFiles) {
        const fullPath = path.resolve(process.cwd(), file)
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, "utf-8")
            for (const line of content.split("\n")) {
                const trimmed = line.trim()
                if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
                    const idx = trimmed.indexOf("=")
                    const key = trimmed.slice(0, idx).trim()
                    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "")
                    if (!process.env[key]) {
                        process.env[key] = val
                    }
                }
            }
        }
    }
}

loadEnv()

// Scenario 1: Perfect Score Scenario (96 / 100)
// Expected: High praise for exceptional aromatic purity, brilliant clarity, impeccable harmony, and typicity.
const perfectScoreScenario: TastingPayload = {
    locale: "uk",
    beverageType: "Сухе біле вино (Шардоне)",
    candidateCode: "#1",
    templateName: "Міжнародна 100-бальна шкала OIV",
    totalScore: 96,
    maxTotalScore: 100,
    attributes: {
        color: "WHITE",
        sweetness: "DRY",
        vintage: "2023",
    },
    categories: [
        {
            name: "Вигляд (Appearance)",
            score: 10,
            maxScore: 10,
            properties: [
                { name: "Прозорість (Clarity)", score: 5, maxScore: 5 },
                { name: "Колір (Color)", score: 5, maxScore: 5 },
            ],
        },
        {
            name: "Аромат (Nose)",
            score: 29,
            maxScore: 30,
            properties: [
                { name: "Чистота (Frankness)", score: 6, maxScore: 6 },
                { name: "Інтенсивність (Positive Intensity)", score: 8, maxScore: 8 },
                { name: "Якість (Quality)", score: 15, maxScore: 16 },
            ],
        },
        {
            name: "Смак (Taste)",
            score: 42,
            maxScore: 44,
            properties: [
                { name: "Чистота (Frankness)", score: 6, maxScore: 6 },
                { name: "Інтенсивність (Positive Intensity)", score: 8, maxScore: 8 },
                { name: "Гармонія / Баланс (Harmony)", score: 21, maxScore: 22 },
                { name: "Тривалість (Persistence)", score: 8, maxScore: 8 },
            ],
        },
        {
            name: "Загальне враження (Overall Harmony)",
            score: 15,
            maxScore: 16,
            properties: [
                { name: "Типовість (Typicity)", score: 15, maxScore: 16 },
            ],
        },
    ],
}

// Scenario 2: Mediocre Score Scenario (76 / 100)
// Expected: Neutral comment highlighting commercial soundness, but modest intensity, slight imbalance, and short persistence.
const mediocreScoreScenario: TastingPayload = {
    locale: "en",
    beverageType: "Dry Red Wine (Cabernet Sauvignon)",
    candidateCode: "#5",
    templateName: "OIV 100-Point Sensory Evaluation",
    totalScore: 76,
    maxTotalScore: 100,
    attributes: {
        color: "RED",
        sweetness: "DRY",
    },
    categories: [
        {
            name: "Appearance",
            score: 9,
            maxScore: 10,
            properties: [
                { name: "Clarity", score: 5, maxScore: 5 },
                { name: "Color", score: 4, maxScore: 5 },
            ],
        },
        {
            name: "Nose",
            score: 22,
            maxScore: 30,
            properties: [
                { name: "Frankness", score: 5, maxScore: 6 },
                { name: "Positive Intensity", score: 5, maxScore: 8 }, // Low intensity (62%)
                { name: "Quality", score: 12, maxScore: 16 },
            ],
        },
        {
            name: "Taste",
            score: 33,
            maxScore: 44,
            properties: [
                { name: "Frankness", score: 5, maxScore: 6 },
                { name: "Positive Intensity", score: 6, maxScore: 8 },
                { name: "Harmony", score: 16, maxScore: 22 }, // Modest harmony (72%)
                { name: "Persistence", score: 6, maxScore: 8 },
            ],
        },
        {
            name: "Overall Impression",
            score: 12,
            maxScore: 16,
            properties: [
                { name: "Typicity", score: 12, maxScore: 16 },
            ],
        },
    ],
}

// Scenario 3: Low Score / Fault Scenario (61 / 100)
// Expected: Immediate diagnosis of the defective category (Nose Frankness dropped to 2/6, indicating oxidation or taint), palate uncleanliness, and sharp imbalance.
const lowScoreFaultScenario: TastingPayload = {
    locale: "hu",
    beverageType: "Fehérbor (Sauvignon Blanc)",
    candidateCode: "#9",
    templateName: "OIV 100 pontos bírálati lap",
    totalScore: 61,
    maxTotalScore: 100,
    attributes: {
        color: "WHITE",
        sweetness: "DRY",
    },
    categories: [
        {
            name: "Megjelenés (Appearance)",
            score: 8,
            maxScore: 10,
            properties: [
                { name: "Tisztaság (Clarity)", score: 4, maxScore: 5 },
                { name: "Szín (Color)", score: 4, maxScore: 5 },
            ],
        },
        {
            name: "Illat (Nose)",
            score: 15,
            maxScore: 30, // 50%
            properties: [
                { name: "Tisztaság (Frankness)", score: 2, maxScore: 6 }, // 33% Severe Defect
                { name: "Intenzitás (Positive Intensity)", score: 5, maxScore: 8 },
                { name: "Minőség (Quality)", score: 8, maxScore: 16 }, // 50%
            ],
        },
        {
            name: "Íz (Taste)",
            score: 27,
            maxScore: 44, // 61%
            properties: [
                { name: "Tisztaság (Frankness)", score: 3, maxScore: 6 }, // 50%
                { name: "Intenzitás (Positive Intensity)", score: 6, maxScore: 8 },
                { name: "Harmónia (Harmony)", score: 14, maxScore: 22 }, // 63%
                { name: "Hosszúság (Persistence)", score: 4, maxScore: 8 }, // 50%
            ],
        },
        {
            name: "Összbenyomás (Overall Impression)",
            score: 11,
            maxScore: 16,
            properties: [
                { name: "Fajtajelleg (Typicity)", score: 11, maxScore: 16 },
            ],
        },
    ],
}

async function runScenario(scenarioName: string, payload: TastingPayload) {
    console.log(`\n============================================================`)
    console.log(`🧪 RUNNING: ${scenarioName}`)
    console.log(`   Locale: ${payload.locale.toUpperCase()} | Beverage: ${payload.beverageType} | Score: ${payload.totalScore}/${payload.maxTotalScore}`)
    console.log(`------------------------------------------------------------`)

    const prompt = buildTastingPrompt(payload)
    console.log(`[PROMPT SENT TO LLM]:\n${prompt}\n`)

    const hasKey =
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.OPENAI_API_KEY

    if (!hasKey) {
        console.log(`⚠️ No API key detected (GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY).`)
        console.log(`   To execute live LLM calls, please add your key to .env or .env.local:`)
        console.log(`   GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key`)
        console.log(`\n[PREDICTED / DESIGNED OUTPUT ACCORDING TO PROMPT CONSTRAINTS]:`)
        if (payload.locale === "uk") {
            console.log(`   "Зразок демонструє бездоганну чистоту та блиск, а також виразний, гармонійний ароматичний профіль високої якості. Смак вирізняється чудовим балансом кислотності та структури з тривалим і витонченим післясмаком, що підтверджує високу сортову типовість."`)
        } else if (payload.locale === "en") {
            console.log(`   "The wine presents a sound appearance and clean base profile, though the aromatic intensity remains modest and simple. On the palate, the structure shows acceptable commercial balance but lacks mid-palate depth and persistence, resulting in a relatively short finish."`)
        } else {
            console.log(`   "A tétel megjelenése megfelelő, azonban az illatban komoly tisztasági hiba és tompaság mutatkozik, ami strukturális hibára utal. Ízben a harmónia megbomlik, a tétel diszharmonikus, a lecsengés pedig rövid és kesernyés maradványérzettel zárul."`)
        }
        return
    }

    try {
        const startTime = Date.now()
        const model = getTastingModel()
        const result = await generateText({
            model,
            system: TASTING_SYSTEM_PROMPT,
            prompt,
        })
        const durationMs = Date.now() - startTime
        console.log(`✅ [GENERATED TASTING SUMMARY (${durationMs}ms)]:\n${result.text.trim()}`)
    } catch (err: any) {
        console.error(`❌ [GENERATION ERROR]:`, err.message || err)
    }
}

async function main() {
    const rawModelName = process.env.AI_MODEL_NAME || "gemini-3.6-flash"
    console.log(`=== WINE LORE AI TASTING SUMMARY POC TEST RUNNER ===`)
    console.log(`AI_PROVIDER: ${process.env.AI_PROVIDER || "google (default)"}`)
    console.log(`AI_MODEL_NAME: ${rawModelName}`)

    await runScenario("Scenario 1: Perfect Score (96/100)", perfectScoreScenario)
    await runScenario("Scenario 2: Mediocre Score (76/100)", mediocreScoreScenario)
    await runScenario("Scenario 3: Low Score / Fault (61/100)", lowScoreFaultScenario)

    console.log(`\n============================================================`)
    console.log(`All scenarios completed.`)
}

main().catch(console.error)
