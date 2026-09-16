module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo 57 polyfills `import.meta` by default (transformImportMeta),
    // which zustand's ESM middleware build needs on web and Hermes.
    presets: ['babel-preset-expo'],
  };
};
