const fs = require("node:fs")
const path = require("node:path")
const { IOSConfig, withAppDelegate, withDangerousMod, withInfoPlist, withXcodeProject } = require("expo/config-plugins")

/**
 * Adopts the UIScene life cycle on iOS.
 *
 * iOS 27 stops an app at launch that has not adopted scenes — a SIGTRAP in
 * `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`, before a
 * single line of JavaScript runs — whichever SDK it was built with. Expo SDK
 * 58 adopts scenes in its template (`ExpoAppSceneDelegate`); SDK 57, which
 * this app is on, does not, so this plugin backports the same arrangement:
 *
 * - Info.plist declares one window scene, delegated to `SceneDelegate`.
 * - `AppDelegate` still creates the React Native factory, but no longer makes
 *   a window: under scenes there is no window until a scene connects.
 * - `SceneDelegate` makes the window from its scene, starts React Native in
 *   it, and hands the scene's events — URLs, user activities, foreground and
 *   background — to `AppDelegate`, which UIKit no longer calls for them, so
 *   deep links and Expo's app-delegate subscribers keep working.
 *
 * Remove it when the app moves to SDK 58.
 */
const SCENE_DELEGATE = "SceneDelegate.swift"

const SCENE_DELEGATE_SOURCE = `internal import Expo
import React

/**
 * The app's one window scene. Written by plugins/withSceneLifecycle.js — see
 * there for why; edit that, not this, as prebuild regenerates it.
 */
@objc(SceneDelegate)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  private var appDelegate: AppDelegate? { UIApplication.shared.delegate as? AppDelegate }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    guard let appDelegate, let factory = appDelegate.reactNativeFactory else {
      fatalError("SceneDelegate: AppDelegate did not create the React Native factory at launch.")
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    // Code that reads the app delegate's window (expo-system-ui, for one) still finds it.
    appDelegate.window = window

    // A link that cold-starts the app arrives in the connection options, not the
    // launch options that Linking.getInitialURL() reads, so rebuild those.
    let browsingWeb = connectionOptions.userActivities.first {
      $0.activityType == NSUserActivityTypeBrowsingWeb
    }
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: Self.launchOptions(url: connectionOptions.urlContexts.first?.url, userActivity: browsingWeb)
    )

    connectionOptions.urlContexts.forEach { open($0) }
    connectionOptions.userActivities.forEach { continueActivity($0) }
  }

  func sceneDidDisconnect(_ scene: UIScene) {
    window = nil
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    appDelegate?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    appDelegate?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    appDelegate?.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    appDelegate?.applicationDidEnterBackground(UIApplication.shared)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    URLContexts.forEach { open($0) }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    continueActivity(userActivity)
  }

  // AppDelegate's own handlers pass links on to React Native's Linking.
  private func open(_ context: UIOpenURLContext) {
    var options: [UIApplication.OpenURLOptionsKey: Any] = [.openInPlace: context.options.openInPlace]
    if let source = context.options.sourceApplication { options[.sourceApplication] = source }
    if let annotation = context.options.annotation { options[.annotation] = annotation }
    _ = appDelegate?.application(UIApplication.shared, open: context.url, options: options)
  }

  private func continueActivity(_ userActivity: NSUserActivity) {
    _ = appDelegate?.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }

  /// Launch options as React Native reads them, by their raw keys: the typed
  /// accessors are deprecated in favour of the scene APIs this replaces.
  private static func launchOptions(url: URL?, userActivity: NSUserActivity?) -> [UIApplication.LaunchOptionsKey: Any]? {
    var options: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url {
      options[UIApplication.LaunchOptionsKey(rawValue: "UIApplicationLaunchOptionsURLKey")] = url
    }
    if let userActivity {
      options[UIApplication.LaunchOptionsKey(rawValue: "UIApplicationLaunchOptionsUserActivityDictionaryKey")] = [
        "UIApplicationLaunchOptionsUserActivityTypeKey": userActivity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": userActivity,
      ]
    }
    return options.isEmpty ? nil : options
  }
}
`

// The template's window creation in didFinishLaunching, which moves to SceneDelegate.
const WINDOW_START = /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n\s*withModuleName: "main",\n\s*in: window,\n\s*launchOptions: launchOptions\)\n#endif\n/
const WINDOW_MOVED = "\n    // The window is made, and React Native started in it, by SceneDelegate.\n"

function withSceneManifest(config) {
    return withInfoPlist(config, (config) => {
        config.modResults.UIApplicationSceneManifest = {
            UIApplicationSupportsMultipleScenes: false,
            UISceneConfigurations: {
                UIWindowSceneSessionRoleApplication: [
                    {
                        UISceneConfigurationName: "Default Configuration",
                        UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
                    },
                ],
            },
        }
        return config
    })
}

function withAppDelegateWithoutWindow(config) {
    return withAppDelegate(config, (config) => {
        const { modResults } = config
        if (modResults.language !== "swift") {
            throw new Error("withSceneLifecycle expects a Swift AppDelegate.")
        }
        if (modResults.contents.includes(WINDOW_MOVED.trim())) return config
        if (!WINDOW_START.test(modResults.contents)) {
            // Better a failed prebuild than an app that dies at launch on iOS 27.
            throw new Error(
                "withSceneLifecycle could not find the template's window setup in AppDelegate.swift. " +
                    "The Expo template has changed; update plugins/withSceneLifecycle.js.",
            )
        }
        modResults.contents = modResults.contents.replace(WINDOW_START, WINDOW_MOVED)
        return config
    })
}

function withSceneDelegateFile(config) {
    config = withDangerousMod(config, [
        "ios",
        (config) => {
            const projectName = IOSConfig.XcodeUtils.getProjectName(config.modRequest.projectRoot)
            const target = path.join(config.modRequest.platformProjectRoot, projectName, SCENE_DELEGATE)
            fs.writeFileSync(target, SCENE_DELEGATE_SOURCE)
            return config
        },
    ])
    return withXcodeProject(config, (config) => {
        const projectName = IOSConfig.XcodeUtils.getProjectName(config.modRequest.projectRoot)
        const filepath = `${projectName}/${SCENE_DELEGATE}`
        if (!config.modResults.hasFile(filepath)) {
            IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
                filepath,
                groupName: projectName,
                project: config.modResults,
            })
        }
        return config
    })
}

module.exports = function withSceneLifecycle(config) {
    return withSceneDelegateFile(withAppDelegateWithoutWindow(withSceneManifest(config)))
}
