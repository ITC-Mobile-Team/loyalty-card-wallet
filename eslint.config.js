const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: [
      ".expo/",
      "node_modules/",
      "coverage/",
      ".test-build/",
      "dist/",
      "build/",
      "web-build/",
      "ios/",
      "android/"
    ]
  }
];
