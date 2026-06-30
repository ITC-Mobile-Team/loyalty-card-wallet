/* global __dirname */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const required = [
  "ios/LoyaltyCardWidget/LoyaltyCardWidget.swift",
  "ios/LoyaltyCardWidget/LoyaltyCardWidget.entitlements",
  "android/app/src/main/java/com/anonymous/loyaltycardwallet/widget/LoyaltyCardWidgetProvider.kt",
  "android/app/src/main/res/xml/loyalty_card_widget_info.xml"
];

const missing = required.filter((relativePath) => !fs.existsSync(path.join(root, relativePath)));
if (missing.length > 0) {
  console.error(`Missing generated external-surface files:\n${missing.join("\n")}`);
  process.exit(1);
}

const entitlements = fs.readFileSync(
  path.join(root, "ios/LoyaltyCardWallet/LoyaltyCardWallet.entitlements"),
  "utf8"
);
const project = fs.readFileSync(
  path.join(root, "ios/LoyaltyCardWallet.xcodeproj/project.pbxproj"),
  "utf8"
);
const manifest = fs.readFileSync(
  path.join(root, "android/app/src/main/AndroidManifest.xml"),
  "utf8"
);

const checks = [
  [entitlements.includes("group.com.anonymous.loyalty-card-wallet"), "iOS App Group entitlement"],
  [project.includes("LoyaltyCardWidget"), "iOS WidgetKit target"],
  [project.includes("com.anonymous.loyalty-card-wallet.widget"), "iOS widget bundle identifier"],
  [project.includes("MARKETING_VERSION = 1.0.0;"), "iOS widget marketing version"],
  [manifest.includes("LoyaltyCardWidgetProvider"), "Android widget receiver"]
];

const failed = checks.filter(([passed]) => !passed).map(([, label]) => label);
if (failed.length > 0) {
  console.error(`External-surface generation checks failed:\n${failed.join("\n")}`);
  process.exit(1);
}

console.log("External-surface generated native checks passed.");
