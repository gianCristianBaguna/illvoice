const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  blockList: [/.*\/node_modules\/.*\/node_modules\/.*\/debug/],
};

module.exports = config;
