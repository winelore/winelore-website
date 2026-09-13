/**
 * The evaluation scorecard's logic, shared by the web app and the Expo app.
 *
 * This is the product's highest-stakes code: it decides what a judge may
 * submit and what value each score carries. It is kept free of any UI so both
 * platforms compute identically — a score that differs between a judge's phone
 * and the web results page is a credibility incident, not a bug report.
 */
export * from "./types"
export * from "./properties"
export * from "./smartValues"
export * from "./validation"
export * from "./submission"
export * from "./attributes"
export * from "./templateSelection"
export * from "./routing"
