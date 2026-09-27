import fs from "node:fs"
import path from "node:path"
import { generateObject } from "ai"
import { getTastingModel } from "../lib/ai/provider"
import {
    buildTastingPrompt,
    buildTastingSystemPrompt,
    TASTING_SYSTEM_PROMPT,
    tastingOptionsSchema,
    type TastingPayload,
} from "../lib/ai/tastingPrompt"
import { getFewShotExamples } from "../lib/ai/commentKnowledgeBase"

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
        console.log(`\n[PREDICTED / DESIGNED 3-OPTION SHORTHAND OUTPUT]:`)
        if (payload.locale === "uk") {
            console.log(`   [Option 1 - Structure]: "Бездоганна чистота й блиск з виразною, живою кислотністю. Тонка мінеральна напруга та витончений лінійний посмак."`)
            console.log(`   [Option 2 - Balance]:   "Зразкова гармонія компонентів. Текстура шовковиста, чудова сортова типовість з тривалим чистим фінішем."`)
            console.log(`   [Option 3 - Verdict]:   "Породисте вино високого класу. Свіже, зібране, демонструє відмінний баланс та благородну витримку."`)
        } else if (payload.locale === "en") {
            console.log(`   [Option 1 - Structure]: "Firm, fine-grained tannins with vibrant acidity framing a taut palate. Finishes dry and linear with focused grip."`)
            console.log(`   [Option 2 - Balance]:   "Well-knit and harmonious proportion. Alcohol and fruit weight integrate cleanly; shows solid varietal typicity."`)
            console.log(`   [Option 3 - Verdict]:   "Modest mid-palate density and slightly muted nose, but commercially sound, clean, and accessible."`)
        } else {
            console.log(`   [Option 1 - Structure]: "Laza szerkezet, tompa savak és lapos középpalátás. A lecsengés rövid és kissé kesernyés."`)
            console.log(`   [Option 2 - Balance]:   "Hiányzik az egyensúly, a tétel megbomlott harmóniát és tompa aromatikát mutat."`)
            console.log(`   [Option 3 - Verdict]:   "Tisztasági hiba az illatban, oxidáció nyomai és fáradt szerkezet jellemzi."`)
        }
        return
    }

    try {
        const startTime = Date.now()
        const model = getTastingModel()
        const fewShotExamples = getFewShotExamples(3)
        console.log(`[FEW-SHOT EXAMPLES SAMPLED]:`)
        fewShotExamples.forEach((ex, idx) => console.log(`   ${idx + 1}. "${ex}"`))
        const system = buildTastingSystemPrompt(fewShotExamples)
        const { object } = await generateObject({
            model,
            schema: tastingOptionsSchema,
            system,
            prompt,
        })
        const durationMs = Date.now() - startTime
        console.log(`✅ [GENERATED 3 TASTING OPTIONS (${durationMs}ms)]:`)
        object.options.forEach((opt, idx) => {
            const label = idx === 0 ? "Structure" : idx === 1 ? "Balance" : "Verdict"
            console.log(`   [Option ${idx + 1} - ${label}]: ${opt}`)
        })
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
