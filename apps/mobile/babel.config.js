module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    // react-native-worklets/plugin MUST be listed last (Reanimated v4 split
    // its worklet compiler out into the separate react-native-worklets
    // package — this replaces the old react-native-reanimated/plugin).
    plugins: ["react-native-worklets/plugin"],
  };
};
