export interface TastingPropertyScore {
    name: string
    score: number
    maxScore: number
}

export interface TastingCategoryScore {
    name: string
    score: number
    maxScore: number
    properties?: TastingPropertyScore[]
}

export interface TastingPayload {
    locale: "en" | "uk" | "hu"
    beverageType?: string | null
    candidateCode?: string | null
    templateName?: string | null
    totalScore?: number | null
    maxTotalScore?: number | null
    categories: TastingCategoryScore[]
    attributes?: Record<string, string | number | boolean | null> | null
}

export const TASTING_SYSTEM_PROMPT = `You are an expert AI Master Sommelier and Juror Assistant for international professional beverage competitions.
Your role is to generate a concise, objective, 2-to-3 sentence tasting evaluation summary ("draft tasting comment") based strictly on the structured scores and sensory evaluation parameters provided.
CRITICAL CONSTRAINTS:
1. STRICT TRUTHFULNESS & NO HALLUCINATIONS:
   - Do NOT invent or hallucinate specific unstated flavor or aroma descriptors (e.g., do NOT fabricate "notes of strawberry", "hints of vanilla", or "crisp green apple" unless specifically provided in the attributes).
   - Base your commentary STRICTLY on structural elements: clarity, aromatic purity/cleanliness, aromatic intensity, balance (acidity, alcohol, tannin, body), persistence/length, and overall harmony.
2. SCORE-DRIVEN DIAGNOSIS:
   - High scores (>88% of max): Acknowledge excellent purity, balance, aromatic definition, and typicity.
   - Mediocre scores (70-85% of max): Note acceptable commercial quality, but highlight modest aromatic intensity, slight structural imbalance, or short finish.
   - Low scores (<70% of max): Specifically identify the category or property that failed and describe the technical or sensory flaw (e.g., lack of purity suggesting reduction/oxidation, coarse green tannins, flabby acidity, sharp alcoholic heat, or cloudy appearance).
3. TONE & LENGTH:
   - Professional, concise, analytical, impartial.
   - Maximum 2 to 3 sentences (35 to 60 words).
   - Output must serve as a professional draft intended for the evaluator to review, modify, or approve.
4. LANGUAGE:
   - You MUST generate the response in the specified locale:
     * "en": English
     * "uk": Ukrainian (Українська)
     * "hu": Hungarian (Magyar)`

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
    text += `Please write the draft tasting summary now (2-3 sentences):`
    return text
}