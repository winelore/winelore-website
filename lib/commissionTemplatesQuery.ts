import type { GetCommissionTemplatesQuery } from "../src/gql/graphql";

/**
 * SmartProperty expressions are recursive binary trees. GraphQL cannot express recursion,
 * so we unroll a left-leaning spine (real weighted sums accumulate on `left`) with a
 * shallow symmetric branch on each `right`. Must stay compact: print() on a parsed
 * DocumentNode re-indents nested selections and can exceed server parser limits.
 *
 * D=20 / branch=4 covers all known production formulas (max depth 11) with no truncation.
 */
const SPINE_DEPTH = 20;
const BRANCH_DEPTH = 4;

function symmetricBranch(depth: number): string {
  if (depth <= 0) return "...ExprFields";
  return `...ExprFields ... on BinaryExpression { left { ${symmetricBranch(depth - 1)} } right { ${symmetricBranch(depth - 1)} } }`;
}

function leftSpine(depth: number): string {
  if (depth <= 0) return symmetricBranch(BRANCH_DEPTH);
  return `...ExprFields ... on BinaryExpression { left { ${leftSpine(depth - 1)} } right { ${symmetricBranch(BRANCH_DEPTH)} } }`;
}

const EXPRESSION_SELECTION = leftSpine(SPINE_DEPTH);

const FRAGMENT = "fragment ExprFields on EvaluationExpression { __typename type ... on ConstantExpression { value } ... on VariableExpression { code } }";

/** Compact query string — sent as-is, never passed through graphql.print(). */
export const GET_COMMISSION_TEMPLATES_DEEP_QUERY = [
  "query GetCommissionTemplatesDeep($id: ID!) {",
  "commission(id: $id) {",
  "id templateEditions {",
  "id beverageType",
  "templateEdition {",
  "id version status",
  "categories {",
  "id name",
  "properties {",
  "__typename id code name description isRequired isResult",
  "... on BooleanProperty { boolDefaultValue: defaultValue }",
  "... on IntProperty { intMinLimit: minLimit intMaxLimit: maxLimit intDefaultValue: defaultValue }",
  "... on DoubleProperty { doubleMinLimit: minLimit doubleMaxLimit: maxLimit doubleDefaultValue: defaultValue }",
  "... on EnumProperty { enumAllowedValues: allowedValues enumDefaultValue: defaultValue }",
  "... on DiscreteNumbersProperty { discreteAllowedValues: allowedValues discreteDefaultValue: defaultValue }",
  `... on SmartProperty { expression { ${EXPRESSION_SELECTION} } }`,
  "}",
  "}",
  "}",
  "}",
  "}",
  "}",
  FRAGMENT,
].join(" ");

export type GetCommissionTemplatesDeepResult = GetCommissionTemplatesQuery;
export type GetCommissionTemplatesDeepVariables = { id: string };
