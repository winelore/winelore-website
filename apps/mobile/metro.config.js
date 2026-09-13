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

module.exports = config
