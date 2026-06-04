import 'package:flutter/material.dart';

/// Builds a premium, accessible theme. Colors come from backend branding at runtime so the
/// app re-skins per event without a release. Falls back to a refined default palette.
class AppTheme {
  static Color _parse(String hex, Color fallback) {
    var h = hex.trim().replaceAll('#', '');
    if (h.length == 6) h = 'FF$h';
    final value = int.tryParse(h, radix: 16);
    return value == null ? fallback : Color(value);
  }

  static ThemeData fromBranding({String? primary, String? secondary}) {
    const defaultPrimary = Color(0xFF1A2B4C);
    const defaultSecondary = Color(0xFFC9A227);
    final seed = _parse(primary ?? '', defaultPrimary);
    final accent = _parse(secondary ?? '', defaultSecondary);

    final scheme = ColorScheme.fromSeed(
      seedColor: seed,
      primary: seed,
      secondary: accent,
      brightness: Brightness.light,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: const Color(0xFFF6F7F9),
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardTheme(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        color: Colors.white,
        margin: EdgeInsets.zero,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52), // large tap target
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}
