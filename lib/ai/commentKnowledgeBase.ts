import fs from "node:fs"
import path from "node:path"

/**
 * Format A: Competition Table Structure
 * Code | Producer | Beverage | Vintage | Origin | Expert | Comment
 */
export interface FormatAComment {
    code?: string
    producer?: string
    beverage?: string
    vintage?: number | string | null
    origin?: string
    expert?: string
    comment: string
    [key: string]: any
}

/**
 * Format B: Producer Table Structure
 * Wine Producer Name | Wine Name | Comment
 */
export interface FormatBComment {
    wineProducerName?: string
    wineName?: string
    comment: string
    [key: string]: any
}

export type RawHistoricalComment =
    | FormatAComment
    | FormatBComment
    | { comment: string }
    | { Comment: string }
    | Record<string, any>

/**
 * Curated high-quality fallbacks used if files are missing or empty during initialization.
 */
const DEFAULT_FALLBACK_COMMENTS: string[] = [
    "Виразна сортова типовість та глибина. Дрібнозернисті, шляхетні таніни з живою кислотністю, тривалий сухий графітовий посмак.",
    "Чудова збалансованість алкоголю й свіжості. Щільне тіло без надмірної важкості, чиста фруктова структура та шовковистий фініш.",
    "Тонка мінеральна напруга, блискуча кислотність і бездоганна чистота аромату. Лінійний розвиток смаку з виразним солонуватим посмаком.",
    "Кришталева прозорість і стрижнева кислотність. Ароматична чистота на найвищому рівні, сухий строгий посмак.",
    "Fine-grained, polished tannins with lively acidity framing a taut palate. Linear progression towards a dry, graphite-tinged finish.",
    "Well-knit and harmonious proportion. Alcohol and fruit weight integrate cleanly, showing solid varietal typicity and persistent drive.",
    "Brilliant aromatic cleanliness and tension. Brisk citrus backbone with chalky texture and a focused, savory finish.",
]

interface KnowledgeBaseCache {
    isLoaded: boolean
    comments: string[]
}

// Global declaration to maintain singleton across Next.js HMR reloads in development
declare global {
    // eslint-disable-next-line no-var
    var __wineLoreCommentKnowledgeBase: KnowledgeBaseCache | undefined
}

/**
 * CommentKnowledgeBase Singleton Manager
 */
class CommentKnowledgeBase {
    private static instance: CommentKnowledgeBase
    private cache: KnowledgeBaseCache

    private constructor() {
        if (!globalThis.__wineLoreCommentKnowledgeBase) {
            globalThis.__wineLoreCommentKnowledgeBase = {
                isLoaded: false,
                comments: [],
            }
        }
        this.cache = globalThis.__wineLoreCommentKnowledgeBase
    }

    public static getInstance(): CommentKnowledgeBase {
        if (!CommentKnowledgeBase.instance) {
            CommentKnowledgeBase.instance = new CommentKnowledgeBase()
        }
        return CommentKnowledgeBase.instance
    }

    /**
     * Extracts text from comment fields across Format A, Format B, or standard variants.
     */
    private extractCommentText(item: RawHistoricalComment): string | null {
        if (!item || typeof item !== "object") return null

        // Check common property keys for comment text
        const text =
            item.comment ||
            item.Comment ||
            item["Коментар"] ||
            item["коментар"] ||
            item["Tasting Note"] ||
            item["tastingNote"] ||
            item["tasting_note"]

        if (typeof text === "string" && text.trim().length > 10) {
            return text.trim()
        }
        return null
    }

    /**
     * Loads historical comments from data/historical-comments directory once into memory.
     */
    public initialize(): void {
        if (this.cache.isLoaded) {
            return
        }

        const loadedComments: string[] = []
        const baseDir = path.resolve(process.cwd(), "data", "historical-comments")

        try {
            if (fs.existsSync(baseDir)) {
                const files = fs.readdirSync(baseDir)
                for (const file of files) {
                    if (file.endsWith(".json")) {
                        const filePath = path.join(baseDir, file)
                        try {
                            const rawData = fs.readFileSync(filePath, "utf-8")
                            const parsed = JSON.parse(rawData)
                            const list = Array.isArray(parsed)
                                ? parsed
                                : Array.isArray(parsed?.comments)
                                    ? parsed.comments
                                    : []

                            for (const item of list) {
                                const text = this.extractCommentText(item)
                                if (text) {
                                    loadedComments.push(text)
                                }
                            }
                        } catch (fileErr) {
                            console.warn(`[CommentKnowledgeBase] Failed to parse file: ${file}`, fileErr)
                        }
                    }
                }
            }
        } catch (dirErr) {
            console.warn(`[CommentKnowledgeBase] Failed to read directory ${baseDir}:`, dirErr)
        }

        // Deduplicate comments
        const uniqueComments = Array.from(new Set(loadedComments))

        if (uniqueComments.length > 0) {
            this.cache.comments = uniqueComments
        } else {
            // Fallback to built-in curated expert comments if no files or entries found
            this.cache.comments = [...DEFAULT_FALLBACK_COMMENTS]
        }

        this.cache.isLoaded = true
    }

    /**
     * Retrieves all comments in memory.
     */
    public getAllComments(): string[] {
        if (!this.cache.isLoaded) {
            this.initialize()
        }
        return this.cache.comments
    }

    /**
     * Pulls N random comments from the in-memory cache for few-shot prompting.
     */
    public getFewShotExamples(count: number = 3): string[] {
        const pool = this.getAllComments()
        if (pool.length === 0) {
            return DEFAULT_FALLBACK_COMMENTS.slice(0, count)
        }

        if (pool.length <= count) {
            return [...pool]
        }

        // Fisher-Yates partial shuffle to pick 'count' unique random items efficiently
        const poolCopy = [...pool]
        const selected: string[] = []
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * poolCopy.length)
            selected.push(poolCopy[randomIndex])
            poolCopy.splice(randomIndex, 1)
        }
        return selected
    }
}

/**
 * Public accessor function to retrieve few-shot examples from the in-memory singleton.
 * Loads the dataset once per server lifecycle and caches in memory.
 *
 * @param count Number of examples to extract (default: 3)
 * @returns Array of real expert tasting comments
 */
export function getFewShotExamples(count: number = 3): string[] {
    return CommentKnowledgeBase.getInstance().getFewShotExamples(count)
}

export { CommentKnowledgeBase }
