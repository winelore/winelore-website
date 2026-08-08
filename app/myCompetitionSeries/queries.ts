import { gql } from "@/src/gql"

export const GET_MY_COMPETITIONS_SERIES = gql(`
    query GetMyCompetitionSeries($limit: Int, $offset: Int, $cursor: ID) {
        competitionSeriesList(limit: $limit, offset: $offset, cursor: $cursor) {
            items {
                id
                name
                status
                countriesType
                countriesCodes
                owners
                createdAt
            }
        }
    }
`);