import { gql } from "@/src/gql";

export const CREATE_OUTCOME_POLICY = gql(`
  mutation CreateOutcomePolicy($input: CreateOutcomePolicyInput!) {
    createOutcomePolicy(input: $input) {
      id
      name
    }
  }
`)

export const CREATE_OUTCOME_POLICY_EDITION = gql(`
  mutation CreateOutcomePolicyEdition($input: CreateOutcomePolicyEditionInput!) {
    createOutcomePolicyEdition(input: $input) {
      id
      policyId
      version
    }
  }
`)