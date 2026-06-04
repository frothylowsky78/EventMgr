# Mobile build config (per environment)

Copy `*.example.json` to `dev.json` / `staging.json` / `prod.json` and fill from the matching
CDK stack outputs. These are passed to Flutter at build time and read by `lib/core/config.dart`:

```bash
flutter run                 --dart-define-from-file=config/dev.json
flutter build appbundle --flavor prod --dart-define-from-file=config/prod.json
flutter build ipa       --flavor prod --dart-define-from-file=config/prod.json
```

`*.json` (the real, filled files) are git-ignored — only the `.example.json` templates are committed.
