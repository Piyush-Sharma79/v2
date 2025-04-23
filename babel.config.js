module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@screens': './src/screens',
            '@navigation': './src/navigation',
            '@types': './src/types',
          },
        },
      ],
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          envName: 'APP_ENV',
          allowlist: ['SUPA_PROJECT_URL', 'SUPA_ANON_KEY', 'GOOGLE_API_KEY', 'USDA_API_KEY'],
          safe: false,
          allowUndefined: true,
        },
      ],
      ['@babel/plugin-transform-flow-strip-types', { loose: true }],
      ['@babel/plugin-transform-class-properties', { loose: true }],
      ['@babel/plugin-transform-private-methods', { loose: true }],
      ['@babel/plugin-transform-private-property-in-object', { loose: true }],
      ['@babel/plugin-transform-nullish-coalescing-operator', { loose: true }],
      ['@babel/plugin-transform-optional-chaining', { loose: true }],
    ],
  };
};
