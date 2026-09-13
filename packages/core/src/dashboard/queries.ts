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
