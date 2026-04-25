/* global: apiPath, appPathPrefix */
(function () {
  'use strict';

  function appPathPrefix() {
    const p = location.pathname;
    if (p.endsWith('/')) return p;
    if (p.lastIndexOf('.') > p.lastIndexOf('/')) {
      return p.replace(/\/[^/]+\.[^/]+$/, '/');
    }
    return p + '/';
  }

  function apiPath(sub) {
    const pre = appPathPrefix();
    return pre + 'api/' + sub.replace(/^\//, '');
  }

  window.appPathPrefix = appPathPrefix;
  window.apiPath = apiPath;
})();
