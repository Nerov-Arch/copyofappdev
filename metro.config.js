const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configure module name mapper for web
config.resolver.resolverMainFields = ['react.web', 'browser', 'main'];

module.exports = config;