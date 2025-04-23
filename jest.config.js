module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(js|ts|tsx)$': 'babel-jest',
  },
  setupFiles: ['<rootDir>/.jest/setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
};
