/**
 * @winelore/core — domain logic shared by the Next.js web app and the Expo app.
 *
 * Everything exported here must run unchanged on both platforms, so nothing in
 * this package may import the DOM, `node:*`, or Next.js. Platform concerns
 * (networking, storage, crypto, filesystem) stay in the consuming app and are
 * passed in as arguments.
 *
 * Subpath entries: `@winelore/core/gql`, `@winelore/core/i18n`.
 */

// Evaluation scoring
export * from "./evaluationScores"
export * from "./evaluationExpression"
export * from "./evaluationTotals"
export * from "./evaluationNumericInput"
export * from "./formatPropertyScore"
export * from "./deltaOutliers"
export * from "./evaluationDisplay"

// Commission / template shape
export * from "./auidUtils"
export * from "./propertyMap"
export * from "./commissionTemplatesQuery"
export * from "./templateEditionMap"

// Outcome policies (user-authored scripts, mirrored from the GraalVM backend)
export * from "./outcomePolicy/scriptAdapters"
export * from "./outcomePolicy/outcomePropertyMap"
export * from "./outcomePolicy/buildScriptContext"
export * from "./outcomePolicy/evaluateOutcomePolicy"
export * from "./outcomePolicy/resolveBeverageOutcomes"
export * from "./outcomePolicy/policies"

// Reference data & timing
export * from "./wineRegionTypes"
export * from "./competitionTiming"
export * from "./dateFormat"
export * from "./geocoding"
export * from "./wineRegions"
