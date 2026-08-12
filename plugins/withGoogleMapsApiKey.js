const { withAndroidManifest } = require('@expo/config-plugins');

const GOOGLE_MAPS_API_KEY = 'AIzaSyASTc0FN3JBdR8cmUb51CbuwQlNgl1Y5m0';

module.exports = function withGoogleMapsApiKey(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application;

    if (application) {
      application[0]['meta-data'] = application[0]['meta-data']?.filter(
        (item) => item.$?.['android:name'] !== 'com.google.android.geo.API_KEY'
      ) || [];

      application[0]['meta-data'] = [
        ...(application[0]['meta-data'] || []),
        {
          $: {
            'android:name': 'com.google.android.geo.API_KEY',
            'android:value': GOOGLE_MAPS_API_KEY,
          },
        },
      ];
    }

    return config;
  });
};
