import 'package:flutter/material.dart';

/// Premium "coming soon" state so the app looks polished even where a module
/// isn't built yet (spec §4.2: app should look polished if modules are unused).
class PlaceholderScreen extends StatelessWidget {
  const PlaceholderScreen({super.key, required this.title, required this.icon});
  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: theme.colorScheme.secondary),
            const SizedBox(height: 12),
            Text('$title coming soon',
                style: theme.textTheme.titleMedium),
            const SizedBox(height: 4),
            const Text('Check back closer to the event.',
                style: TextStyle(color: Colors.black54)),
          ],
        ),
      ),
    );
  }
}
