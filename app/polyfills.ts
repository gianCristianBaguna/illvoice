import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  const g = globalThis as any;

  if (typeof g.fetch !== 'function') {
    try {
      const fetchModule = require('react-native/Libraries/Network/fetch');
      g.fetch = fetchModule.default || fetchModule;
    } catch (e) {
      console.warn('[Polyfills] fetch not available from internal path:', e);
    }
  }

  if (typeof g.Headers !== 'function') {
    try {
      const HeadersModule = require('react-native/Libraries/Network/Headers');
      g.Headers = HeadersModule.default || HeadersModule;
    } catch (e) {
      console.warn('[Polyfills] Headers not available:', e);
    }
  }

  if (typeof g.Request !== 'function') {
    try {
      const RequestModule = require('react-native/Libraries/Network/Request');
      g.Request = RequestModule.default || RequestModule;
    } catch (e) {
      console.warn('[Polyfills] Request not available:', e);
    }
  }

  if (typeof g.Response !== 'function') {
    try {
      const ResponseModule = require('react-native/Libraries/Network/Response');
      g.Response = ResponseModule.default || ResponseModule;
    } catch (e) {
      console.warn('[Polyfills] Response not available:', e);
    }
  }

  if (typeof g.atob !== 'function') {
    try {
      const atobModule = require('react-native/Libraries/Utilities/atob');
      g.atob = atobModule.default || atobModule;
    } catch (e) {
      console.warn('[Polyfills] atob not available:', e);
    }
  }

  if (typeof g.btoa !== 'function') {
    try {
      const btoaModule = require('react-native/Libraries/Utilities/btoa');
      g.btoa = btoaModule.default || btoaModule;
    } catch (e) {
      console.warn('[Polyfills] btoa not available:', e);
    }
  }
}
