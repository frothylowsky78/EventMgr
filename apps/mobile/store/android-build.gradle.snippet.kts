// ============================================================================
// DO NOT APPLY — flavors contradict the prod-only constraint.
//
// This snippet was never merged into android/app/build.gradle.kts, and must not be.
// Applying it would break the working build in at least four ways:
//
//   1. productFlavors (dev/staging/prod) — v1 ships prod only. No flavors exist today,
//      and adding them changes every build/run command and the installed applicationId.
//   2. compileSdk / targetSdk = 34 — Android must target API 36 (Play requirement,
//      31 Aug 2026). The real build inherits 36 from flutter.targetSdkVersion.
//   3. namespace / applicationId "com.example.eventmgr" — the real id is
//      com.closedsystem.eventmgr_mobile. Changing it orphans installs and signing.
//   4. minSdk = 23 — the real build inherits 24 from flutter.minSdkVersion.
//
// Kept only as a reference for the release signingConfig + minify/shrink block near the
// bottom, which is the one part worth revisiting before store submission. Copy that piece
// deliberately; do not paste this file.
// ============================================================================

android {
    namespace = "com.example.eventmgr"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.eventmgr"
        minSdk = 23
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
    }

    flavorDimensions += "env"
    productFlavors {
        create("dev") {
            dimension = "env"
            applicationIdSuffix = ".dev"
            resValue("string", "app_name", "VIP Summit (Dev)")
        }
        create("staging") {
            dimension = "env"
            applicationIdSuffix = ".staging"
            resValue("string", "app_name", "VIP Summit (Staging)")
        }
        create("prod") {
            dimension = "env"
            resValue("string", "app_name", "VIP Summit")
        }
    }

    // Release signing — keystore path/credentials come from key.properties (never committed).
    signingConfigs {
        create("release") {
            // storeFile = file(keystoreProps["storeFile"])
            // storePassword = keystoreProps["storePassword"]
            // keyAlias = keystoreProps["keyAlias"]
            // keyPassword = keystoreProps["keyPassword"]
        }
    }
    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            isShrinkResources = true
        }
    }
}

// Build examples:
//   flutter build appbundle --flavor prod    --dart-define-from-file=config/prod.json
//   flutter build apk       --flavor dev      --dart-define-from-file=config/dev.json
