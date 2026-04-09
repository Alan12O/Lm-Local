module.exports = {
  project: {
    ios: {},
    android: {},
  },
  /**
   * Enable Interop Layer for React Native 0.83+ New Architecture.
   * This allows legacy Bridge-based components like react-native-math-view
   * to work in Fabric/Bridgeless mode.
   */
  unstable_interopComponents: [
    'RNMathView',
  ],
};
