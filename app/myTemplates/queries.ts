import { gql } from "@/src/gql"

export const CHANGE_EVALUATION_TEMPLATE_NAME = gql(`
  mutation ChangeEvaluationTemplateName($id: ID!, $newName: String!) {
    changeEvaluationTemplateName(id: $id, newName: $newName) {
      id
      name
    }
  }
`)
