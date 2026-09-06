import { gql } from "@/src/gql"

export const GET_MY_BEVERAGES = gql(`
  query GetMyBeverages($limit: Int, $cursor: ID, $offset: Int, $filter: BeverageFilterInput, $producer: ID) {
    beverages(limit: $limit, cursor: $cursor, offset: $offset, filter: $filter) {
      items {
        id
        name
        status
        typeId
        attributes
        producers {
          id
          producerId
          role
        }
        origin {
          latitude
          longitude
        }
      }
    }
    beverageCount(producerId: $producer)
  }
`)