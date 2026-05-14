# Three Little Circles

A mobile app built with Expo and React Native.

## Overview

Three Little Circles is a cross-platform mobile application built with the Expo framework, targeting both iOS and Android from a single TypeScript codebase.

## Tech Stack

- TypeScript
- Expo / React Native
- Metro bundler

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your device (for development), or iOS/Android simulators

### Installation

```bash
npm install
```

### Development

```bash
npx expo start
```

Then scan the QR code with Expo Go, or press `i` for iOS simulator / `a` for Android emulator.

### Build

```bash
# iOS
npx expo build:ios

# Android
npx expo build:android
```

## Project Structure

```
src/         # Application source code and screens
assets/      # Images, fonts, and other static assets
App.tsx      # App entry point
```

---

*Built by [nmswainston](https://github.com/nmswainston)*
