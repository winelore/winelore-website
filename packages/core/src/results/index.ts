/**
 * Competition results: the queries, the access rules, and the row builder that
 * turns fetched data into what a table, an export or a phone list renders.
 *
 * The heavy computation — running outcome-policy scripts and averaging across
 * replicas — lives in ../outcomePolicy and is called from here.
 */
export * from "./types"
export * from "./queries"
export * from "./access"
export * from "./buildRows"
