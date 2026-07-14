import { gql } from '@/gql';

export const DevApproveCompetitionMutation = gql(`
  mutation DevApproveCompetition($id: ID!) {
    approveCompetition(id: $id) {
      id
    }
  }
`);

export const DevCreateCompetitionSeriesMutation = gql(`
  mutation DevCreateCompetitionSeries($input: CreateCompetitionSeriesInput!) {
    createCompetitionSeries(input: $input) {
      id
      name
    }
  }
`);

export const DevGetBeverageTypesQuery = gql(`
  query DevGetBeverageTypes {
    beverageTypes {
      items {
        id
        code
      }
    }
  }
`);

export const DevCreateBeverageMutation = gql(`
  mutation DevCreateBeverage($input: CreateBeverageInput!) {
    createBeverage(input: $input) {
      id
    }
  }
`);

export const DevCreateBatchMutation = gql(`
  mutation DevCreateBatch($input: CreateBatchInput!) {
    createBatch(input: $input) {
      id
    }
  }
`);

export const DevCreateSampleMutation = gql(`
  mutation DevCreateSample($input: CreateSampleInput!) {
    createSample(input: $input) {
      id
    }
  }
`);

export const DevSubmitCompetitionSeriesForReviewMutation = gql(`
  mutation DevSubmitCompetitionSeriesForReview($id: ID!) {
    submitCompetitionSeriesForReview(id: $id) {
      id
    }
  }
`);

export const DevApproveCompetitionSeriesMutation = gql(`
  mutation DevApproveCompetitionSeries($id: ID!) {
    approveCompetitionSeries(id: $id) {
      id
    }
  }
`);

export const DevCreateCompetitionMutation = gql(`
  mutation DevCreateCompetition($input: CreateCompetitionInput!) {
    createCompetition(input: $input) {
      id
      name
    }
  }
`);

export const DevSubmitCompetitionForReviewMutation = gql(`
  mutation DevSubmitCompetitionForReview($id: ID!) {
    submitCompetitionForReview(id: $id) {
      id
    }
  }
`);

export const DevPlanCompetitionMutation = gql(`
  mutation DevPlanCompetition($id: ID!) {
    planCompetition(id: $id) {
      id
    }
  }
`);

export const DevStartCompetitionMutation = gql(`
  mutation DevStartCompetition($id: ID!) {
    startCompetition(id: $id) {
      id
    }
  }
`);

export const DevCreateCommissionMutation = gql(`
  mutation DevCreateCommission($input: CreateCommissionInput!) {
    createCommission(input: $input) {
      id
      name
    }
  }
`);

export const DevAddCommissionPanelMutation = gql(`
  mutation DevAddCommissionPanel($commissionId: ID!, $name: String!) {
    addCommissionPanel(commissionId: $commissionId, name: $name) {
      id
      name
    }
  }
`);

export const DevAddCommissionCandidatesMutation = gql(`
  mutation DevAddCommissionCandidates($commissionId: ID!, $panelId: ID!, $candidates: [AddCommissionCandidateItemInput!]!) {
    addCommissionCandidates(commissionId: $commissionId, panelId: $panelId, candidates: $candidates) {
      id
    }
  }
`);

export const DevCreateCommissionReplicaMutation = gql(`
  mutation DevCreateCommissionReplica($input: CreateCommissionReplicaInput!) {
    createCommissionReplica(input: $input) {
      id
    }
  }
`);

export const DevSubmitCommissionForReviewMutation = gql(`
  mutation DevSubmitCommissionForReview($id: ID!) {
    submitCommissionForReview(id: $id) {
      id
    }
  }
`);

export const DevApproveCommissionMutation = gql(`
  mutation DevApproveCommission($id: ID!) {
    approveCommission(id: $id) {
      id
    }
  }
`);

export const DevPlanCommissionMutation = gql(`
  mutation DevPlanCommission($id: ID!) {
    planCommission(id: $id) {
      id
    }
  }
`);

export const DevStartCommissionMutation = gql(`
  mutation DevStartCommission($id: ID!) {
    startCommission(id: $id) {
      id
    }
  }
`);

export const DevAddCommissionReplicaMemberMutation = gql(`
  mutation DevAddCommissionReplicaMember($id: ID!, $input: CommissionReplicaMemberInput!) {
    addCommissionReplicaMember(id: $id, input: $input) {
      id
      members {
        id
        auid
      }
    }
  }
`);

export const DevSubmitEvaluationMutation = gql(`
  mutation DevSubmitEvaluation($input: SubmitEvaluationInput!) {
    submitEvaluation(input: $input) {
      id
    }
  }
`);

export const DevCreateBeverageTypeMutation = gql(`
  mutation DevCreateBeverageType($input: CreateBeverageTypeInput!) {
    createBeverageType(input: $input) {
      id
    }
  }
`);

export const DevPublishBeverageTypeMutation = gql(`
  mutation DevPublishBeverageType($id: ID!) {
    publishBeverageType(id: $id) {
      id
    }
  }
`);

export const DevSetCommissionTemplateEditionMutation = gql(`
  mutation DevSetCommissionTemplateEdition($id: ID!, $beverageTypeId: ID!, $templateEditionId: ID!) {
    setCommissionTemplateEdition(id: $id, beverageTypeId: $beverageTypeId, templateEditionId: $templateEditionId) {
      id
    }
  }
`);

export const DevGetEvaluationTemplateEditionsQuery = gql(`
  query DevGetEvaluationTemplateEditions {
    evaluationTemplateEditions {
      items {
        id
        status
        template {
          name
          beverageType {
            id
          }
        }
        categories {
          id
        }
      }
    }
  }
`);

export const DevPlanCommissionReplicaMutation = gql(`
  mutation DevPlanCommissionReplica($id: ID!) {
    planCommissionReplica(id: $id) {
      id
    }
  }
`);

export const DevStartCommissionReplicaMutation = gql(`
  mutation DevStartCommissionReplica($id: ID!) {
    startCommissionReplica(id: $id) {
      id
    }
  }
`);

export const DevMarkCommissionReplicaMemberReadyMutation = gql(`
  mutation DevMarkCommissionReplicaMemberReady($id: ID!, $memberId: ID!) {
    markCommissionReplicaMemberReady(id: $id, memberId: $memberId) {
      id
    }
  }
`);

export const DevSetCommissionReplicaCurrentCandidateMutation = gql(`
  mutation DevSetCommissionReplicaCurrentCandidate($id: ID!, $currentCandidateId: ID!) {
    setCommissionReplicaCurrentCandidate(id: $id, currentCandidateId: $currentCandidateId) {
      id
    }
  }
`);

export const DevGetCompetitionsListQuery = gql(`
  query DevGetCompetitionsList {
    competitions {
      items {
        id
        name
      }
    }
  }
`);

export const DevGetCommissionsByCompetitionQuery = gql(`
  query DevGetCommissionsByCompetition($competitionId: ID!, $limit: Int) {
    commissionsByCompetition(competitionId: $competitionId, limit: $limit) {
      items {
        id
        name
      }
    }
  }
`);

export const DevGetCommissionReplicasByCommissionQuery = gql(`
  query DevGetCommissionReplicasByCommission($commissionId: ID!) {
    commissionReplicasByCommission(commissionId: $commissionId) {
      id
      name
      type
      members {
        id
        auid
        role
      }
    }
  }
`);
