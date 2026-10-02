import { useCallback, useEffect, useRef, useState } from "react"
import { Alert, Platform } from "react-native"
import Constants from "expo-constants"
import * as Haptics from "expo-haptics"
import {
    buildTastingPayload,
    type EvaluationCategory,
    type EvaluationValues,
    type SmartValues,
    type TastingPayload,
} from "@winelore/core/evaluation"
import type { Locale } from "@winelore/core/i18n"
import { getValidAccessToken } from "../auth/session"
import { getWebOrigin } from "../navigation/destinations"

export interface UseAITastingSuggestionsOptions {
    categories: EvaluationCategory[]
    values: EvaluationValues
    smartValues: SmartValues
    locale: Locale
    candidateCode?: string | null
    beverageName?: string | null
    visibleAttributes?: Array<{ label: string; value: string }>
    isAllRequiredScoresFilled: boolean
    currentComment?: string
    onSelectSuggestion: (text: string) => void
    fallbackErrorMessage?: string
}

/**
 * Resolves the Next.js website origin hosting the `/api/generate-comment` route.
 */
function resolveWebOrigin(): string {
    if (process.env.EXPO_PUBLIC_WEB_ORIGIN) {
        return process.env.EXPO_PUBLIC_WEB_ORIGIN
    }

    // In local development, if EXPO_PUBLIC_WEB_ORIGIN is not explicitly configured,
    // point to the local Next.js server where your working Gemini API key is configured.
    if (__DEV__) {
        const debuggerHost = Constants.expoConfig?.hostUri
        if (debuggerHost) {
            const ip = debuggerHost.split(":")[0]
            if (ip) return `http://${ip}:3000`
        }
        return Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000"
    }

    return getWebOrigin()
}

export function useAITastingSuggestions({
                                            categories,
                                            values,
                                            smartValues,
                                            locale,
                                            candidateCode,
                                            beverageName,
                                            visibleAttributes = [],
                                            isAllRequiredScoresFilled,
                                            currentComment = "",
                                            onSelectSuggestion,
                                            fallbackErrorMessage = "Failed to generate AI summary",
                                        }: UseAITastingSuggestionsOptions) {
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null)
    const [isGeneratingAI, setIsGeneratingAI] = useState(false)
    const [aiError, setAiError] = useState<string | null>(null)

    const isGeneratingAiRef = useRef<boolean>(false)
    const lastTriggerHashRef = useRef<string | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)

    const latestValuesRef = useRef(values)
    latestValuesRef.current = values
    const latestSmartValuesRef = useRef(smartValues)
    latestSmartValuesRef.current = smartValues
    const latestCategoriesRef = useRef(categories)
    latestCategoriesRef.current = categories
    const latestLocaleRef = useRef(locale)
    latestLocaleRef.current = locale
    const latestCandidateCodeRef = useRef(candidateCode)
    latestCandidateCodeRef.current = candidateCode
    const latestBeverageNameRef = useRef(beverageName)
    latestBeverageNameRef.current = beverageName
    const latestVisibleAttributesRef = useRef(visibleAttributes)
    latestVisibleAttributesRef.current = visibleAttributes

    useEffect(() => {
        if (!currentComment) {
            setSelectedSuggestionIndex(null)
            return
        }
        const matchingIndex = aiSuggestions.findIndex((opt) => opt.trim() === currentComment.trim())
        setSelectedSuggestionIndex(matchingIndex >= 0 ? matchingIndex : null)
    }, [currentComment, aiSuggestions])

    const generateAiSuggestions = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        const abortController = new AbortController()
        abortControllerRef.current = abortController

        isGeneratingAiRef.current = true
        setIsGeneratingAI(true)
        setAiError(null)

        try {
            const accessToken = await getValidAccessToken()

            const payload: TastingPayload = buildTastingPayload({
                categories: latestCategoriesRef.current,
                values: latestValuesRef.current,
                smartValues: latestSmartValuesRef.current,
                locale: latestLocaleRef.current,
                beverageType: latestBeverageNameRef.current || "Wine",
                candidateCode: latestCandidateCodeRef.current || undefined,
                visibleAttributes: latestVisibleAttributesRef.current,
            })

            const baseUrl = resolveWebOrigin()
            const endpoint = `${baseUrl}/api/generate-comment`

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify(payload),
                signal: abortController.signal,
            })

            if (response.status === 404) {
                throw new Error(
                    `API route not found at ${baseUrl}/api/generate-comment. Check EXPO_PUBLIC_WEB_ORIGIN.`,
                )
            }

            if (response.status === 429) {
                const errJson = await response.json().catch(() => ({}))
                const rateLimitMsg =
                    errJson.error || "AI rate limit reached. Please wait a moment before trying again."
                setAiError(rateLimitMsg)
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
                Alert.alert("Rate Limit", rateLimitMsg)
                return
            }

            if (response.status === 503) {
                const serviceUnavailableMsg =
                    "The AI tasting service is temporarily unavailable. Please try again shortly."
                setAiError(serviceUnavailableMsg)
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
                Alert.alert("Service Unavailable", serviceUnavailableMsg)
                return
            }

            if (!response.ok) {
                const errJson = await response.json().catch(() => ({}))
                throw new Error(errJson.error || fallbackErrorMessage)
            }

            const data = await response.json()
            if (Array.isArray(data.options) && data.options.length > 0) {
                setAiSuggestions(data.options)
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            }
        } catch (err: any) {
            if (err?.name === "AbortError") return
            const errorMsg = err?.message || fallbackErrorMessage
            setAiError(errorMsg)
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            Alert.alert("AI Suggestion Error", errorMsg)
        } finally {
            isGeneratingAiRef.current = false
            setIsGeneratingAI(false)
        }
    }, [fallbackErrorMessage])

    const triggerHash = `${JSON.stringify(values)}_${locale}`

    useEffect(() => {
        if (lastTriggerHashRef.current === triggerHash) return
        if (!isAllRequiredScoresFilled) return
        if (isGeneratingAiRef.current) return

        lastTriggerHashRef.current = triggerHash

        const timer = setTimeout(() => {
            generateAiSuggestions()
        }, 300)

        return () => {
            clearTimeout(timer)
        }
    }, [triggerHash, isAllRequiredScoresFilled, generateAiSuggestions])

    const handleSelectSuggestion = useCallback(
        async (index: number) => {
            const suggestion = aiSuggestions[index]
            if (!suggestion) return
            await Haptics.selectionAsync()
            setSelectedSuggestionIndex(index)
            onSelectSuggestion(suggestion)
        },
        [aiSuggestions, onSelectSuggestion],
    )

    return {
        aiSuggestions,
        selectedSuggestionIndex,
        isGeneratingAI,
        aiError,
        handleSelectSuggestion,
    }
}