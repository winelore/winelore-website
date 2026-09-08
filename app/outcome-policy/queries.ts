import { gql } from "@/src/gql";

export const GET_OUTCOME_POLICY_DETAIL = gql(`
    query GetOutcomePolicyDetail($id: ID!) {
        outcomePolicy(id: $id) {
            id
            name
            createdAt
        }
    }
`)

export const GET_OUTCOME_POLICY_EDITIONS_BY_POLICY = gql(`
    query GetOutcomePolicyEditionsByPolicy($policyId: ID!, $limit: Int) {
        outcomePolicyEditionsByPolicyId(policyId: $policyId, limit: $limit) {
            items {
                id
                policyId
                version
                scriptCode
                status
                calculationScope
                createdAt
            }
        }
    }
`)