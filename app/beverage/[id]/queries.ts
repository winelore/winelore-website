import { gql } from '@/src/gql';

export const GET_BEVERAGE = gql(`
  query GetBeverage($id: ID!) {
    beverage(id: $id) {
      id
      name
      status
      typeId
      schemaEditionIds
      attributes
      producers {
        id
        auid
        role
      }
      origin {
        latitude
        longitude
      }
      createdAt
    }
  }
`);

export const GET_BEVERAGE_AWARDS = gql(`
  query GetBeverageAwards($id: ID!) {
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
`);

export const GET_COMMISSION_FOR_AWARD = gql(`
  query GetCommissionForAward($id: ID!) {
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
`);