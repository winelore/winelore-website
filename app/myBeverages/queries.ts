import { gql } from '@/src/gql';

export const GET_WINES = gql(`
  query GetWines($limit: Int) {
    wines(limit: $limit) {
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
      }
    }
  }
`);