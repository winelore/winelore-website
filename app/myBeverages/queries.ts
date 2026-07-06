import { gql } from "@/src/gql"

export const GET_MY_BEVERAGES = gql(`
  query GetMyBeverages($limit: Int, $filter: BeverageFilterInput) {
    beverages(limit: $limit, filter: $filter) {
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
  }
`)