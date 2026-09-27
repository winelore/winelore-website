/**
 * Dashboard queries, sent as raw strings by both apps.
 *
 * The commission query carries replica id and status as well as members, so a
 * client can route a judge straight into their own replica rather than fetching
 * the commission again to find it.
 */

export const GET_DASHBOARD_COMMISSIONS = `
  query GetDashboardCommissions($limit: Int, $offset: Int) {
      commissions(limit: $limit, offset: $offset) {
          items {
              id
              name
              status
              startedAt
              endedAt
              competition { id name }
              replicas {
                  id
                  status
                  members { auid role }
              }
          }
      }
  }
`

/**
 * Template editions for the "My Templates" panel: only what the card shows.
 *
 * The web's template screens fetch every property of every edition; the
 * dashboard needs a name, a beverage type and a version, so it asks for those.
 * Editions rather than templates because that is what the backend lists — see
 * `selectLatestTemplateEditions`.
 */
export const GET_DASHBOARD_TEMPLATE_EDITIONS = `
  query GetDashboardTemplateEditions($limit: Int) {
      evaluationTemplateEditions(limit: $limit) {
          items {
              id
              version
              status
              template {
                  id
                  name
                  owners
                  beverageType { id code name }
              }
          }
      }
  }
`

/** Beverage types, to turn a beverage's `typeId` into a translatable code. */
export const GET_BEVERAGE_TYPES = `
  query GetBeverageTypes {
      beverageTypes {
          items { id code name status }
      }
  }
`
