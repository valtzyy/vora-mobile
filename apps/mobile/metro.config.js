const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Allow Metro to bundle .html files and plain .js assets from assets/three/
// so they can be require()'d as strings in buildPointCloudHtml.ts
config.resolver.assetExts = [
  ...config.resolver.assetExts.filter(ext => ext !== 'js'),
  'html',
];

// three.min.js lives in assets/three/ — treat it as a source module (not an asset)
// so require('../../assets/three/three.min.js') returns the file's string content.
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'js',   // already included but ensure ordering
];

module.exports = withNativeWind(config, { input: "./global.css" });

