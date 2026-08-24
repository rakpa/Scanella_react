// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web backend is wa-sqlite, which imports a .wasm binary.
// Metro treats unknown extensions as source and fails to resolve it, so the
// web bundle cannot be built without registering wasm as an asset.
config.resolver.assetExts.push('wasm');

module.exports = config;
