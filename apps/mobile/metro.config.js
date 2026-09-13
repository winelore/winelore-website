// Metro must be told about the monorepo: @winelore/core is consumed as
// TypeScript source from outside this app's directory, and dependencies are
// hoisted to the workspace root.
const { getDefaultConfig } = require("expo/metro-config")
const path = require("path")

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, "../..")

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
]
// Prefer the workspace copy of a hoisted package over a nested duplicate, so
// React and React Native are never loaded twice.
config.resolver.disableHierarchicalLookup = true

/**
 * Packages that must resolve to one known location regardless of where npm
 * decided to put them.
 *
 * npm's hoisting differs between versions: a package can land in
 * apps/mobile/node_modules on one machine and the workspace root on another,
 * and a dependency imported from the *root* tree (react-native pulls in
 * react-devtools-core, which imports @babel/runtime/regenerator) then resolves
 * on one and not the other. Pinning by absolute path removes the guesswork.
 */
function pinPackage(name) {
  try {
    return {
      [name]: path.dirname(
        require.resolve(`${name}/package.json`, { paths: [projectRoot, workspaceRoot] }),
      ),
    }
  } catch {
    // Not installed yet (a first install, say) — let normal resolution report it.
    return {}
  }
}

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  ...pinPackage("@babel/runtime"),
}

module.exports = config
