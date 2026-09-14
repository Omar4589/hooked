// Yarn Over typography — single source of truth for font families.
//
// One rounded font (DESIGN.md §16, "One rounded font."): Fredoka, in four
// weights, loaded at runtime in App.jsx from `@expo-google-fonts/fredoka`.
//
// Every Text style names a FAMILY here, never a `fontWeight`. React Native has
// no synthetic bolding for a custom family: on Android a `fontWeight` that no
// loaded face matches does not embolden Fredoka, it silently drops back to the
// system font (Roboto), so a "bold" label renders in the wrong typeface
// entirely — and it renders correctly on iOS, which is how the bug ships. The
// weight is baked into the family name instead, and the four names below are
// the ones the package actually exports (node_modules/@expo-google-fonts/
// fredoka/index.js); they double as the keys App.jsx hands to useFonts, which
// is what makes `fontFamily: FONT.bold` resolve at all.
export const FONT = Object.freeze({
  regular: 'Fredoka_400Regular',
  medium: 'Fredoka_500Medium',
  semibold: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
});
