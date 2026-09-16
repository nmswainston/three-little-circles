export default {
  expo: {
    name: 'Three Little Circles',
    slug: 'three-little-circles',
    version: '1.0.0',
    description: 'An unofficial field guide to Hidden Mickeys and other hidden details.',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    plugins: [
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#FFF4DC',
          dark: {
            backgroundColor: '#0B1D3A',
          },
        },
      ],
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.nmswainston.threelittlecircles',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.nmswainston.threelittlecircles',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFF4DC',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
        },
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      // Populated by `eas init`; see README.
      eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
    },
  },
};
