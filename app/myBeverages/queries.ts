import { gql } from "@/src/gql"

export const GET_MY_BEVERAGES = gql(`
  query GetMyBeverages($limit: Int, $cursor: ID, $offset: Int, $filter: BeverageFilterInput, $producer: [Int!]) {
    beverages(limit: $limit, cursor: $cursor, offset: $offset, filter: $filter) {
      items {
        id
        name
        status
        typeId
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
      }
    }
    beverageCount(producer: $producer)
  }
`)