import { gql } from "@/src/gql"

// Same shape as myBeverages/queries.ts's GET_MY_BEVERAGES, but named for what
// this page actually does: list every beverage, unfiltered by producer.
export const GET_BEVERAGES = gql(`
  query GetBeverages($limit: Int, $cursor: ID, $offset: Int, $filter: BeverageFilterInput) {
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
    beverageCount
  }
`)
