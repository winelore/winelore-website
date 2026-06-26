import { gql } from "@/src/gql"

export const GET_MY_BEVERAGES = gql(`
  query GetMyBeverages($limit: Int, $filter: WineFilterInput) {
    wines(limit: $limit, filter: $filter) {
      items {
        id
        name
        status
        type
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