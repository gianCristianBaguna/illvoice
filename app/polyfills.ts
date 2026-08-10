import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  const g = globalThis as any;

  if (typeof g.fetch !== 'function') {
    try {
      const fetchModule = require('react-native/Libraries/Network/fetch');
      g.fetch = fetchModule.default || fetchModule;
    } catch (e) {
      console.warn('Failed to polyfill fetch:', e);
    }
  }

  if (typeof g.Headers !== 'function') {
    try {
      const HeadersModule = require('react-native/Libraries/Network/Headers');
      g.Headers = HeadersModule.default || HeadersModule;
    } catch (e) {
      console.warn('Failed to polyfill Headers:', e);
    }
  }

  if (typeof g.Request !== 'function') {
    try {
      const RequestModule = require('react-native/Libraries/Network/Request');
      g.Request = RequestModule.default || RequestModule;
    } catch (e) {
      console.warn('Failed to polyfill Request:', e);
    }
  }

  if (typeof g.Response !== 'function') {
    try {
      const ResponseModule = require('react-native/Libraries/Network/Response');
      g.Response = ResponseModule.default || ResponseModule;
    } catch (e) {
      console.warn('Failed to polyfill Response:', e);
    }
  }

  if (typeof g.atob !== 'function') {
    try {
      const atobModule = require('react-native/Libraries/Utilities/atob');
      g.atob = atobModule.default || atobModule;
    } catch (e) {
      console.warn('Failed to polyfill atob:', e);
    }
  }

  if (typeof g.btoa !== 'function') {
    try {
      const btoaModule = require('react-native/Libraries/Utilities/btoa');
      g.btoa = btoaModule.default || btoaModule;
    } catch (e) {
      console.warn('Failed to polyfill btoa:', e);
    }
  }

  if (typeof g.crypto !== 'object' || !g.crypto.getRandomValues) {
    try {
      const cryptoModule = require('expo-crypto');
      if (cryptoModule?.getRandomValues) {
        g.crypto = { ...g.crypto, getRandomValues: cryptoModule.getRandomValues };
      }
    } catch (e) {
      console.warn('Failed to polyfill crypto:', e);
    }
  }
}
