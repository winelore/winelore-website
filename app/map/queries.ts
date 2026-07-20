import { gql } from "@/src/gql"

// Запит для швидкого пошуку маркерів у радіусі екрану карти
export const SEARCH_MAP_BEVERAGES = gql(`
  query SearchMapBeverages($lat: Float, $lng: Float, $radiusKm: Float, $limit: Int) {
    search(
      latitude: $lat
      longitude: $lng
      maxDistanceKm: $radiusKm
      types: [BEVERAGE]
      limit: $limit
    ) {
      items {
        id
        name
        latitude
        longitude
      }
    }
  }
`)

// Запит для отримання повної інформації про вино після кліку
export const GET_BEVERAGE_DETAILS_MAP = gql(`
  query GetBeverageDetailsMap($id: ID!) {
    beverage(id: $id) {
      id
      name
      status
      typeId
      attributes
      createdAt
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
`)