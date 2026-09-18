export { TabStack as default } from "../../../src/navigation/TabStack"

/**
 * The commission page, the session screens and results live in this stack,
 * because they hand off to one another with `router.replace` and a replace
 * cannot cross navigators without rebuilding the tab bar. A deep link into
 * any of them still gets Home beneath it to go back to.
 */
export const unstable_settings = { anchor: "index" }
