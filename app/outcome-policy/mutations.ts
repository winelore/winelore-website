import { gql } from "@/src/gql";

export const UPDATE_OUTCOME_POLICY_EDITION_SCRIPT = gql(`
  mutation UpdateOutcomePolicyEditionScript($id: ID!, $scriptCode: String!) {
    updateOutcomePolicyEditionScript(id: $id, scriptCode: $scriptCode) {
      id
      scriptCode
      version
    }
  }
`)