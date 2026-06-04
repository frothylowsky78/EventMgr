// Reference snippet for android/app/build.gradle(.kts) — environment flavors + signing.
// Flavors give dev/staging/prod separate applicationIds so all three can be installed side by side
// and point at the matching CDK stack (pass API/Cognito values via --dart-define-from-file).

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
