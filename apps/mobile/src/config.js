import Constants from 'expo-constants';

// EAS Build bakes EXPO_PUBLIC_* env vars into the bundle, so each build profile in eas.json
// points at its own API without touching app.json. Local `expo start` falls back to
// app.json's `extra` block.
const extra = Constants.expoConfig?.extra || {};

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || extra.apiBaseUrl || 'http://localhost:4000';
