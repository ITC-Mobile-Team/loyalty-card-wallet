const googleMapsAndroidApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();

function withAndroidMapsConfig(androidConfig) {
  if (!googleMapsAndroidApiKey) {
    return androidConfig;
  }

  return {
    ...androidConfig,
    config: {
      ...androidConfig.config,
      googleMaps: {
        ...androidConfig.config?.googleMaps,
        apiKey: googleMapsAndroidApiKey
      }
    }
  };
}

module.exports = ({ config }) => {
  return {
    ...config,
    android: withAndroidMapsConfig(config.android),
    extra: {
      ...config.extra,
      androidMapsConfigured: Boolean(googleMapsAndroidApiKey)
    }
  };
};
