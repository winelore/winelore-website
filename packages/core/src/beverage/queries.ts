/**
 * The beverage page's queries, as raw strings both apps send. They are the
 * web page's own: the beverage, its awards (each with the commission and
 * competition that gave it), its batches (each with its samples) and the
 * name of its type.
 */

export const GET_BEVERAGE_PAGE = `
  query GetBeveragePage($id: ID!) {
    beverage(id: $id) {
      id
      name
      status
      typeId
      schemaEditionIds
      attributes
      createdBy
      producers {
        id
        auid
        producerId
        role
      }
      origin {
        latitude
        longitude
      }
      createdAt
    }
  }
`

export const GET_BEVERAGE_PAGE_AWARDS = `
  query GetBeveragePageAwards($id: ID!) {
    beverageAwards(beverageId: $id) {
      id
      commissionId
      candidateId
      assignedAt
      award {
        id
        code
        name
        description
        badgeUrl
      }
    }
  }
`

export const GET_AWARD_COMMISSION = `
  query GetAwardCommission($id: ID!) {
    commission(id: $id) {
      id
      name
      competition {
        id
        name
        status
        plannedDates {
          start
          end
        }
        startedAt
        endedAt
        series {
          id
          name
        }
      }
    }
  }
`

export const GET_BEVERAGE_BATCHES = `
  query GetBeverageBatches($beverageId: ID!) {
    batches(beverageId: $beverageId) {
      items {
        id
        volumeMl
        lotNumber
        attributes
        createdAt
      }
    }
  }
`

export const GET_BATCH_SAMPLES = `
  query GetBatchSamples($batchId: ID!) {
    samples(batchId: $batchId) {
      items {
        id
        volumeMl
        attributes
        createdAt
      }
    }
  }
`

export const GET_BEVERAGE_TYPE_NAME = `
  query GetBeverageTypeName($id: ID!) {
    beverageType(id: $id) {
      name
    }
  }
`
