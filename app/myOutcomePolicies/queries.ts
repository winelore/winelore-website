import { gql } from "@/src/gql";

export const GET_OUTCOME_POLICIES = gql(`
    query GetOutcomePolicies($limit: Int, $cursor: ID, $offset: Int, $filter: OutcomePolicyFilterInput) {
        outcomePolicies(limit: $limit, cursor: $cursor, offset: $offset, filter: $filter) {
            items {
                id
                name
                owners
                createdAt
            }
        }
    }
`)

export const GET_OUTCOME_POLICY_COUNT = gql(`
    query GetOutcomePolicyCount($owner: [Int!]) {
        outcomePolicyCount(owner: $owner)
    }
`)