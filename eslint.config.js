// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    // These rules target the React Compiler, which this app doesn't use; they flag patterns that are fine without it
    // (resetting state when a prop changes, memoized random particles). Kept visible as warnings, not errors.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  {
    ignores: ['.claude/*', 'dist/*', 'shots/*', 'smoke-shots/*', 'ios/*', 'android/*', '.expo/*'],
  },
]);
