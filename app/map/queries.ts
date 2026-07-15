// app/map/queries.ts
import { gql } from "@/src/gql"

export const GET_BEVERAGES_SPATIAL = gql(`
  query GetBeveragesSpatial($filter: BeverageFilterInput, $limit: Int) {
    beverages(filter: $filter, limit: $limit) {
      items {
        id
        name
        status
        typeId
        attributes
        origin {
          latitude
          longitude
        }
      }
    }
  }
`)