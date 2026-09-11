module.exports = (api) => {
  api.cache(true);
  return {
    // SDK 57: babel-preset-expo configures the Reanimated/worklets plugin itself when
    // react-native-worklets is installed, so nothing is listed here by hand.
    presets: ['babel-preset-expo'],
  };
};
