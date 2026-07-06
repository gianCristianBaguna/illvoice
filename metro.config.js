const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  blockList: [/.*\/node_modules\/.*\/node_modules\/.*\/debug/],
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    '@': __dirname,
  },
};

module.exports = config;
