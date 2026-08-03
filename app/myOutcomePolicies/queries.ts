import { gql } from "@/src/gql";

export const GET_OUTCOME_POLICIES = gql(`
  query GetOutcomePolicies($limit: Int, $cursor: ID, $offset: Int) {
    outcomePolicies(limit: $limit, cursor: $cursor, offset: $offset) {
      items {
        id
        name
        createdAt
      }
    }
  }
`)

