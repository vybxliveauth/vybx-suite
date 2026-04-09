const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
// Root of the pnpm monorepo
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Let Metro resolve packages from the workspace root as well
config.watchFolders = Array.from(new Set([...(config.watchFolders || []), workspaceRoot]));

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Required so Metro can resolve TypeScript source exports from workspace packages
// (e.g. @vybx/types exports "./src/index.ts" directly)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
