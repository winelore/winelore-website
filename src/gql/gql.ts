/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query GetCommission($id: ID!) {\n    commission(id: $id) {\n      id\n      name\n      status\n      plannedStartAt\n      startedAt\n      endedAt\n      createdAt\n      competition {\n        id\n        name\n        holders\n      }\n      members {\n        id\n        auid\n        role\n        isReady\n      }\n    }\n  }\n": typeof types.GetCommissionDocument,
    "\n  query GetCommissionCandidateCount($commissionId: ID!) {\n    commissionCandidateCount(commissionId: $commissionId)\n  }\n": typeof types.GetCommissionCandidateCountDocument,
    "\n  mutation MarkMemberReady($commissionId: ID!, $memberId: ID!) {\n    markCommissionMemberReady(id: $commissionId, memberId: $memberId) {\n      id\n      members {\n        id\n        isReady\n      }\n    }\n  }\n": typeof types.MarkMemberReadyDocument,
    "\n  mutation MarkMemberNotReady($commissionId: ID!, $memberId: ID!) {\n    markCommissionMemberNotReady(id: $commissionId, memberId: $memberId) {\n      id\n      members {\n        id\n        isReady\n      }\n    }\n  }\n": typeof types.MarkMemberNotReadyDocument,
    "\n  mutation StartCommission($id: ID!) {\n    startCommission(id: $id) {\n      id\n      status\n      startedAt\n    }\n  }\n": typeof types.StartCommissionDocument,
    "\n  mutation CompleteCommission($id: ID!) {\n    completeCommission(id: $id) {\n      id\n      status\n      endedAt\n    }\n  }\n": typeof types.CompleteCommissionDocument,
    "\n  query GetCompetitionPage($id: ID!) {\n      competition(id: $id) {\n          id\n          name\n          status\n          startedAt\n          plannedStartAt\n          plannedEndAt\n          endedAt\n          holders\n          series {\n              id\n              name\n              status\n          }\n      }\n      commissionsByCompetition(competitionId: $id, limit: 50) {\n          items {\n              id\n              name\n              status\n              startedAt\n              endedAt\n          }\n      }\n  }\n": typeof types.GetCompetitionPageDocument,
};
const documents: Documents = {
    "\n  query GetCommission($id: ID!) {\n    commission(id: $id) {\n      id\n      name\n      status\n      plannedStartAt\n      startedAt\n      endedAt\n      createdAt\n      competition {\n        id\n        name\n        holders\n      }\n      members {\n        id\n        auid\n        role\n        isReady\n      }\n    }\n  }\n": types.GetCommissionDocument,
    "\n  query GetCommissionCandidateCount($commissionId: ID!) {\n    commissionCandidateCount(commissionId: $commissionId)\n  }\n": types.GetCommissionCandidateCountDocument,
    "\n  mutation MarkMemberReady($commissionId: ID!, $memberId: ID!) {\n    markCommissionMemberReady(id: $commissionId, memberId: $memberId) {\n      id\n      members {\n        id\n        isReady\n      }\n    }\n  }\n": types.MarkMemberReadyDocument,
    "\n  mutation MarkMemberNotReady($commissionId: ID!, $memberId: ID!) {\n    markCommissionMemberNotReady(id: $commissionId, memberId: $memberId) {\n      id\n      members {\n        id\n        isReady\n      }\n    }\n  }\n": types.MarkMemberNotReadyDocument,
    "\n  mutation StartCommission($id: ID!) {\n    startCommission(id: $id) {\n      id\n      status\n      startedAt\n    }\n  }\n": types.StartCommissionDocument,
    "\n  mutation CompleteCommission($id: ID!) {\n    completeCommission(id: $id) {\n      id\n      status\n      endedAt\n    }\n  }\n": types.CompleteCommissionDocument,
    "\n  query GetCompetitionPage($id: ID!) {\n      competition(id: $id) {\n          id\n          name\n          status\n          startedAt\n          plannedStartAt\n          plannedEndAt\n          endedAt\n          holders\n          series {\n              id\n              name\n              status\n          }\n      }\n      commissionsByCompetition(competitionId: $id, limit: 50) {\n          items {\n              id\n              name\n              status\n              startedAt\n              endedAt\n          }\n      }\n  }\n": types.GetCompetitionPageDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetCommission($id: ID!) {\n    commission(id: $id) {\n      id\n      name\n      status\n      plannedStartAt\n      startedAt\n      endedAt\n      createdAt\n      competition {\n        id\n        name\n        holders\n      }\n      members {\n        id\n        auid\n        role\n        isReady\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetCommission($id: ID!) {\n    commission(id: $id) {\n      id\n      name\n      status\n      plannedStartAt\n      startedAt\n      endedAt\n      createdAt\n      competition {\n        id\n        name\n        holders\n      }\n      members {\n        id\n        auid\n        role\n        isReady\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetCommissionCandidateCount($commissionId: ID!) {\n    commissionCandidateCount(commissionId: $commissionId)\n  }\n"): (typeof documents)["\n  query GetCommissionCandidateCount($commissionId: ID!) {\n    commissionCandidateCount(commissionId: $commissionId)\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation MarkMemberReady($commissionId: ID!, $memberId: ID!) {\n    markCommissionMemberReady(id: $commissionId, memberId: $memberId) {\n      id\n      members {\n        id\n        isReady\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation MarkMemberReady($commissionId: ID!, $memberId: ID!) {\n    markCommissionMemberReady(id: $commissionId, memberId: $memberId) {\n      id\n      members {\n        id\n        isReady\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation MarkMemberNotReady($commissionId: ID!, $memberId: ID!) {\n    markCommissionMemberNotReady(id: $commissionId, memberId: $memberId) {\n      id\n      members {\n        id\n        isReady\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation MarkMemberNotReady($commissionId: ID!, $memberId: ID!) {\n    markCommissionMemberNotReady(id: $commissionId, memberId: $memberId) {\n      id\n      members {\n        id\n        isReady\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation StartCommission($id: ID!) {\n    startCommission(id: $id) {\n      id\n      status\n      startedAt\n    }\n  }\n"): (typeof documents)["\n  mutation StartCommission($id: ID!) {\n    startCommission(id: $id) {\n      id\n      status\n      startedAt\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation CompleteCommission($id: ID!) {\n    completeCommission(id: $id) {\n      id\n      status\n      endedAt\n    }\n  }\n"): (typeof documents)["\n  mutation CompleteCommission($id: ID!) {\n    completeCommission(id: $id) {\n      id\n      status\n      endedAt\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetCompetitionPage($id: ID!) {\n      competition(id: $id) {\n          id\n          name\n          status\n          startedAt\n          plannedStartAt\n          plannedEndAt\n          endedAt\n          holders\n          series {\n              id\n              name\n              status\n          }\n      }\n      commissionsByCompetition(competitionId: $id, limit: 50) {\n          items {\n              id\n              name\n              status\n              startedAt\n              endedAt\n          }\n      }\n  }\n"): (typeof documents)["\n  query GetCompetitionPage($id: ID!) {\n      competition(id: $id) {\n          id\n          name\n          status\n          startedAt\n          plannedStartAt\n          plannedEndAt\n          endedAt\n          holders\n          series {\n              id\n              name\n              status\n          }\n      }\n      commissionsByCompetition(competitionId: $id, limit: 50) {\n          items {\n              id\n              name\n              status\n              startedAt\n              endedAt\n          }\n      }\n  }\n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;