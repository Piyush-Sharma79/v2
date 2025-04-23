# calAiclone

This is an Expo React Native application for nutritional analysis using camera and image picker.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file with your API keys (see `.env.example`).
3. Start the development server:
   ```bash
   npm start
   ```

## Linting & Formatting

- Run ESLint:
  ```bash
  npx eslint .
  ```
- Run Prettier:
  ```bash
  npx prettier --write .
  ```

## Building APK

- Run:
  ```bash
  npm run build:android
  ```

## Notes
- API keys are loaded from `.env` via `react-native-dotenv`.
- Tested with Expo SDK 52.x.
