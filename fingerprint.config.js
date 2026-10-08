const { SourceSkips } = require('@expo/fingerprint');

// The runtime version comes from a fingerprint of everything native. The app
// config's `extra` section holds values the JavaScript reads, including the
// git commit shown on the Profile screen, so it must not count: otherwise
// every commit would get its own runtime version and over-the-air updates
// would reach no one.
module.exports = {
  sourceSkips: SourceSkips.ExpoConfigExtraSection,
};
