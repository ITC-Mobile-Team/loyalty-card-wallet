/* global __dirname */

const fs = require("fs");
const path = require("path");

const {
  AndroidConfig,
  IOSConfig,
  withAndroidManifest,
  withDangerousMod,
  withEntitlementsPlist,
  withPlugins,
  withXcodeProject
} = require("expo/config-plugins");

const APP_GROUP = "group.com.anonymous.loyalty-card-wallet";
const IOS_TARGET = "LoyaltyCardWidget";
const IOS_BUNDLE_ID = "com.anonymous.loyalty-card-wallet.widget";
const ANDROID_PROVIDER = "com.anonymous.loyaltycardwallet.widget.LoyaltyCardWidgetProvider";

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(source, destination, { recursive: true, force: true });
}

function withExternalSurfaceFiles(config) {
  config = withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      copyDirectory(
        path.join(__dirname, "templates", "ios", IOS_TARGET),
        path.join(modConfig.modRequest.platformProjectRoot, IOS_TARGET)
      );
      return modConfig;
    }
  ]);

  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      copyDirectory(
        path.join(__dirname, "templates", "android", "main"),
        path.join(modConfig.modRequest.platformProjectRoot, "app", "src", "main")
      );
      return modConfig;
    }
  ]);
}

function withExternalSurfaceEntitlements(config) {
  return withEntitlementsPlist(config, (modConfig) => {
    const existing = modConfig.modResults["com.apple.security.application-groups"];
    const groups = Array.isArray(existing) ? existing : [];
    modConfig.modResults["com.apple.security.application-groups"] = [...new Set([...groups, APP_GROUP])];
    return modConfig;
  });
}

function withExternalWidgetTarget(config) {
  const marketingVersion = config.version ?? "1.0.0";

  return withXcodeProject(config, (modConfig) => {
    const project = modConfig.modResults;
    const existingTarget = project.pbxTargetByName(IOS_TARGET);
    let target = existingTarget;

    if (existingTarget) {
      const references = project.pbxFileReferenceSection();
      for (const [key, value] of Object.entries(references)) {
        if (
          !key.endsWith("_comment") &&
          value &&
          String(value.name).replaceAll("\"", "") === "LoyaltyCardWidget.swift"
        ) {
          value.path = "\"LoyaltyCardWidget/LoyaltyCardWidget.swift\"";
        }
      }
    } else {
      target = project.addTarget(IOS_TARGET, "app_extension", IOS_TARGET, IOS_BUNDLE_ID);
      project.addBuildPhase([], "PBXSourcesBuildPhase", "Sources", target.uuid);
      project.addBuildPhase([], "PBXFrameworksBuildPhase", "Frameworks", target.uuid);
      project.addBuildPhase([], "PBXResourcesBuildPhase", "Resources", target.uuid);
      IOSConfig.XcodeUtils.ensureGroupRecursively(project, IOS_TARGET);
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: "LoyaltyCardWidget/LoyaltyCardWidget.swift",
        groupName: IOS_TARGET,
        project,
        targetUuid: target.uuid
      });
    }

    const configurations = IOSConfig.XcodeUtils.getBuildConfigurationsForListId(
      project,
      target.pbxNativeTarget?.buildConfigurationList ?? target.buildConfigurationList
    );
    for (const [, configuration] of configurations) {
      Object.assign(configuration.buildSettings, {
        APPLICATION_EXTENSION_API_ONLY: "YES",
        CODE_SIGN_ENTITLEMENTS: `${IOS_TARGET}/${IOS_TARGET}.entitlements`,
        CURRENT_PROJECT_VERSION: 1,
        DEVELOPMENT_TEAM: "\"\"",
        GENERATE_INFOPLIST_FILE: "NO",
        INFOPLIST_FILE: `${IOS_TARGET}/${IOS_TARGET}-Info.plist`,
        IPHONEOS_DEPLOYMENT_TARGET: "18.0",
        MARKETING_VERSION: marketingVersion,
        PRODUCT_BUNDLE_IDENTIFIER: `"${IOS_BUNDLE_ID}"`,
        PRODUCT_NAME: `"${IOS_TARGET}"`,
        SKIP_INSTALL: "YES",
        SWIFT_EMIT_LOC_STRINGS: "YES",
        SWIFT_VERSION: "5.0",
        TARGETED_DEVICE_FAMILY: "\"1,2\""
      });
    }

    return modConfig;
  });
}

function withExternalAndroidWidget(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);
    const receivers = application.receiver ?? [];
    application.receiver = receivers.filter(
      (receiver) => receiver.$?.["android:name"] !== ANDROID_PROVIDER
    );
    application.receiver.push({
      $: {
        "android:name": ANDROID_PROVIDER,
        "android:exported": "false",
        "android:label": "@string/loyalty_card_widget_name"
      },
      "intent-filter": [
        {
          action: [
            {
              $: {
                "android:name": "android.appwidget.action.APPWIDGET_UPDATE"
              }
            }
          ]
        }
      ],
      "meta-data": [
        {
          $: {
            "android:name": "android.appwidget.provider",
            "android:resource": "@xml/loyalty_card_widget_info"
          }
        }
      ]
    });
    return modConfig;
  });
}

module.exports = function withExternalSurfaces(config) {
  return withPlugins(config, [
    withExternalSurfaceFiles,
    withExternalSurfaceEntitlements,
    withExternalWidgetTarget,
    withExternalAndroidWidget
  ]);
};
