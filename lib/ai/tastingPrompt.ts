import { z } from "zod"

export interface TastingPropertyScore {
    name: string
    score: number
    maxScore: number
}
import type {
    TastingCategoryScore,
    TastingPayload,
    TastingPropertyScore,
} from "@winelore/core/evaluation"

export type { TastingCategoryScore, TastingPayload, TastingPropertyScore }

export const tastingOptionsSchema = z.object({
    options: z.array(z.string()).length(3).describe(
        "Exactly 3 distinct, concise tasting note options written in rapid sommelier shorthand. Option 1 focuses on structure and texture; Option 2 focuses on harmony, balance, and typicity; Option 3 focuses on flaws, highlights, or overall impression."
    ),
})
export type TastingOptionsResult = z.infer<typeof tastingOptionsSchema>
export const TASTING_SYSTEM_PROMPT = `You are a world-class Master Sommelier and seasoned Juror at international blind wine competitions (OIV, Decanter, Concours Mondial).
Your task is to produce exactly 3 distinct, authentic, rapid shorthand tasting notes ("evaluation comments") based on the sensory scores and parameters provided.
PERSONA & STYLE (CRITICAL):
- Write like a real human wine judge making rapid, sharp shorthand notes on a tasting sheet.
- Concise, confident, professional, and technical.
- Absolutely NO ROBOTIC SUMMARIES:
  * NEVER mention points, numbers, percentages, or scorecard categories (e.g. NEVER write "Scored 85/100", "In the nose category", "Based on the scores", "The evaluation indicates").
  * Do NOT use robotic filler phrases ("This wine is...", "It can be noted that...", "Overall, the results show...").
- Use authentic sommelier and judge vocabulary:
  * "shows good typicity", "lacks mid-palate intensity", "hollow mid-palate", "noticeable oxidation", "slight reduction", "crisp tension", "brisk acidity", "chalky tannins", "fine-grained tannins", "green tannins", "well-knit", "tightly wound", "linear finish", "flabby", "hot finish".
- STRICT TRUTHFULNESS:
  * Base diagnosis strictly on the provided structural scores (clarity, aromatic cleanliness/intensity, balance of acid/alcohol/tannin/body, persistence, typicity).
  * Do NOT invent arbitrary grape varieties or fruit descriptors unless specified in the attributes.
  * If a parameter is low (<70%), identify the defect directly (e.g. lack of aromatic frankness = oxidation or sulfur fault; low taste harmony = coarse tannins or unbalanced alcohol/acid).
THE 3 DISTINCT OPTIONS REQUIRED:
1. OPTION 1 (Structure & Texture Focus):
   - Emphasizes structural tension, acidity drive, tannin quality, texture, and linear progression to the finish.
2. OPTION 2 (Balance & Typicity Focus):
   - Emphasizes component integration, fruit-to-acid proportion, varietal/regional typicity, and overall elegance.
3. OPTION 3 (Highlights, Flaws & Verdict Focus):
   - A candid juror verdict calling out key highlights or specific deficits (e.g. muted nose, mid-palate drop-off, commercial drinkability, or technical flaw).
FORMAT & LENGTH:
- Each option MUST be 1 to 2 crisp sentences (approximately 20 to 35 words).
- Provide native, natural sommelier phrasing for the requested language:
  * "en": English sommelier shorthand.
  * "uk": Ukrainian sommelier shorthand (e.g. "виразна сортова типовість", "жива кислотність", "бракує щільності в середині смаку", "дрібнозернистий танін", "чистий лінійний посмак").
  * "hu": Hungarian sommelier shorthand (e.g. "szép fajtajelleg", "feszes savgerinc", "finom cseranyag", "hiányos középpalátán", "tiszta, egyenes lecsengés").`

export function buildTastingSystemPrompt(fewShotExamples: string[] = []): string {
    let prompt = TASTING_SYSTEM_PROMPT
    if (fewShotExamples.length > 0) {
        const formatted = fewShotExamples.map((ex, i) => `${i + 1}. "${ex}"`).join("\n")
        prompt += `\n\nREAL EXPERT COMPETITION EXAMPLES (FEW-SHOT REFERENCE):
Adopt the exact tone, brevity, and professional vocabulary of the following real expert comments. Do not copy them directly, but match their style:
${formatted}`
    }
    return prompt
}

export function buildTastingPrompt(payload: TastingPayload): string {
    const {
        beverageType,
        candidateCode,
        templateName,
        totalScore,
        maxTotalScore,
        categories,
        locale,
        attributes,
    } = payload
    let text = `Beverage: ${beverageType || "Wine"} (Sample Code: ${candidateCode || "N/A"})\n`
    if (templateName) {
        text += `Evaluation Template: ${templateName}\n`
    }
    if (totalScore != null && maxTotalScore != null && maxTotalScore > 0) {
        const totalRatio = Math.round((totalScore / maxTotalScore) * 100)
        text += `Overall Score: ${totalScore} / ${maxTotalScore} (${totalRatio}%)\n`
    }
    if (attributes && Object.keys(attributes).length > 0) {
        text += `Known Attributes: ${JSON.stringify(attributes)}\n`
    }
    text += `\nEvaluated Scores by Category:\n`
    for (const cat of categories) {
        const catRatio = cat.maxScore > 0 ? Math.round((cat.score / cat.maxScore) * 100) : 0
        text += `- [Category] ${cat.name}: ${cat.score}/${cat.maxScore} (${catRatio}%)\n`
        if (cat.properties && cat.properties.length > 0) {
            for (const prop of cat.properties) {
                const propRatio = prop.maxScore > 0 ? Math.round((prop.score / prop.maxScore) * 100) : 0
                text += `    * ${prop.name}: ${prop.score}/${prop.maxScore} (${propRatio}%)\n`
            }
        }
    }
    const localeNames: Record<string, string> = {
        en: "English",
        uk: "Ukrainian (Українська)",
        hu: "Hungarian (Magyar)",
    }
    const targetLanguage = localeNames[locale] || "English"
    text += `\nRequired Output Language: ${targetLanguage}\n`
    text += `Generate exactly 3 distinct, short tasting note options now following the 3 focus angles (Option 1: Structure & Texture, Option 2: Balance & Typicity, Option 3: Highlights/Flaws/Verdict). Do not mention any scores or points.`
    return text
}