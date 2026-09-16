module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // zustand's ESM middleware build uses `import.meta.env`, which
          // Metro cannot run as-is on web or Hermes. This polyfills it.
          unstable_transformImportMeta: true,
        },
      ],
    ],
  };
};
