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
        // Google Maps on Android needs a key in built apps (not in Expo Go).
        // iOS uses Apple Maps and needs nothing.
        'react-native-maps',
        {
          androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Three Little Circles uses your location to show where you are on the park map.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Three Little Circles uses your photos so you can attach one to a suggested find.',
          cameraPermission: 'Three Little Circles uses the camera so you can photograph a suggested find.',
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#FFF4DC',
          dark: {
            image: './assets/splash-icon-dark.png',
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
        monochromeImage: './assets/adaptive-icon-monochrome.png',
        backgroundColor: '#E63946',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    owner: 'nmswainston',
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      eas: {
        projectId: '114958f9-aa23-493a-ac7e-72772c555b21',
      },
    },
  },
};
