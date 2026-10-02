import { gql } from "@winelore/core/gql"

export const GET_COMPETITION_SERIES = gql(`
    query GetCompetitionSeries($id: ID!) {
        competitionSeries(id: $id) {
            id
            name
            status
            countriesType
            countriesCodes
            owners
            createdAt
        }
    }
`)

export const GET_COMPETITION_SERIES_LIST = gql(`
    query GetCompetitionSeriesList($limit: Int, $offset: Int, $cursor: ID) {
        competitionSeriesList(limit: $limit, offset: $offset, cursor: $cursor) {
            items {
                id
                name
                status
                countriesType
                countriesCodes
                createdAt
            }
        }
        competitionSeriesCount
    }
`)

export const GET_COMPETITIONS_BY_SERIES = gql(`
    query GetCompetitionsBySeries($seriesId: ID!, $limit: Int, $cursor: ID) {
        competitionsBySeries(seriesId: $seriesId, limit: $limit, cursor: $cursor) {
            items {
                id
                name
                status
                startedAt
                endedAt
                holders
                plannedDates {
                    start
                    end
                }
                series {
                    id
                    name
                    status
                }
            }
        }
        competitionCount(seriesId: $seriesId)
    }
`)
